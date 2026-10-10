/**
 * The authorization code flow with PKCE, against Prabhix Identity.
 *
 * <p>This replaces posting a password to an API. The difference is not cosmetic: with a hosted login
 * page, this app never sees a credential, so a cross-site scripting hole here cannot steal one — and
 * the session cookie set by the identity origin is what lets the second product sign somebody in
 * without asking again. That is single sign-on; two apps each with their own login form is two logins.
 *
 * <p>PKCE rather than a client secret because a browser app cannot keep a secret: anything shipped to
 * the browser is readable by whoever receives it. The verifier is generated per attempt, never leaves
 * this origin, and is what proves the app redeeming the code is the one that requested it.
 *
 * Configure once per product (`configureOidc` or `new OidcClient`) before calling `beginLogin`.
 */

export interface OidcStorageKeys {
  verifier: string;
  state: string;
  returnTo: string;
  idToken: string;
}

export interface OidcConfig {
  issuer: string;
  clientId: string;
  /** Defaults to `{origin}/auth/callback`. */
  redirectUri?: string | (() => string);
  /** Defaults to `{origin}/`. */
  postLogoutRedirectUri?: string | (() => string);
  storageKeys?: Partial<OidcStorageKeys>;
  /**
   * Paths remembered across the Identity redirect must stay inside this app.
   * sessionStorage is same-origin, but a crafted value still must not become
   * `//evil.example` or `https://…` when we `navigate(returnTo)`.
   */
  safeReturnTo?: (path: string | null | undefined, fallback?: string) => string;
  /** Return a message, or `undefined` to use the package default for that code. */
  describeOauthError?: (code: string) => string | undefined;
}

export interface OidcTokens {
  accessToken: string;
  expiresIn: number;
  idToken?: string;
}

const DEFAULT_KEYS: OidcStorageKeys = {
  // sessionStorage, not localStorage. The verifier is single-use and worthless after the exchange, and a
  // per-tab scope means two sign-in attempts in two tabs cannot overwrite each other's — which
  // localStorage would do, breaking whichever tab finished second.
  verifier: "pbx_pkce_verifier",
  state: "pbx_oauth_state",
  returnTo: "pbx_oauth_return_to",
  // Kept because sign-out needs it: /connect/logout identifies the session to end from the id token,
  // and without one the provider has nothing to act on. It survives a reload, which matters — a person
  // who refreshes the page and then signs out is the ordinary case, not an edge one.
  idToken: "pbx_id_token",
};

/**
 * Paths remembered across the Identity redirect must stay inside this app.
 */
/** Propagates security-cutover vs expiry into product login routes. */
export type OidcSignInReason = "session" | "expired" | "security";

export function mapApiSignInReason(code: string | null | undefined): OidcSignInReason | undefined {
  switch ((code ?? "").toUpperCase()) {
    case "SESSION_REPLACED":
    case "TOKEN_REVOKED":
      return "security";
    case "TOKEN_EXPIRED":
    case "UNAUTHENTICATED":
      return "expired";
    default:
      return undefined;
  }
}

/** Hosted Identity logout when no id token is available (GET confirmation page). */
export function identityHostedLogoutUrl(issuer: string): string {
  return `${(issuer ?? "").replace(/\/+$/, "")}/logout`;
}

export function loginPathWithReason(path: string, reason?: OidcSignInReason, fallback = "/login"): string {
  const base = safeAppPath(path, fallback);
  if (!reason) {
    return base;
  }
  const join = base.includes("?") ? "&" : "?";
  return `${base}${join}reason=${encodeURIComponent(reason)}`;
}

export function safeAppPath(path: string | null | undefined, fallback = "/"): string {
  if (!path) {
    return fallback;
  }
  const trimmed = path.trim();
  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.includes("://") ||
    trimmed.includes("\\") ||
    trimmed.includes("\0")
  ) {
    return fallback;
  }
  if (
    trimmed.startsWith("/login") ||
    trimmed.startsWith("/sign-in") ||
    trimmed.startsWith("/auth/callback") ||
    trimmed.startsWith("/signup")
  ) {
    return fallback;
  }
  return trimmed;
}

function resolveUrl(value: string | (() => string) | undefined, fallback: () => string): string {
  if (typeof value === "function") return value();
  if (value) return value;
  return fallback();
}

function defaultDescribeOauthError(code: string): string {
  switch (code) {
    case "access_denied":
      return "Sign-in was cancelled.";
    case "invalid_request":
    case "invalid_client":
      // Almost always a misconfigured redirect URI, which is a deploy problem rather than the
      // visitor's. Saying "try again" would send them round a loop that cannot succeed.
      return "This application is not configured correctly for sign-in. Contact support.";
    default:
      return "Sign-in did not complete. Start again from the sign-in page.";
  }
}

export class OidcClient {
  private readonly issuer: string;
  private readonly clientId: string;
  private readonly keys: OidcStorageKeys;
  private readonly redirectUriOption: OidcConfig["redirectUri"];
  private readonly postLogoutRedirectUriOption: OidcConfig["postLogoutRedirectUri"];
  private readonly safeReturnTo: (path: string | null | undefined, fallback?: string) => string;
  private readonly describeError: (code: string) => string;

  constructor(config: OidcConfig) {
    this.issuer = (config.issuer ?? "").replace(/\/+$/, "");
    this.clientId = config.clientId;
    this.keys = { ...DEFAULT_KEYS, ...config.storageKeys };
    this.redirectUriOption = config.redirectUri;
    this.postLogoutRedirectUriOption = config.postLogoutRedirectUri;
    this.safeReturnTo = config.safeReturnTo ?? safeAppPath;
    this.describeError = (code) => config.describeOauthError?.(code) ?? defaultDescribeOauthError(code);
  }

  identityIssuer(): string {
    return this.issuer;
  }

  isOidcEnabled(): boolean {
    return this.issuer.length > 0 && this.clientId.length > 0;
  }

  redirectUri(): string {
    return resolveUrl(this.redirectUriOption, () => `${window.location.origin}/auth/callback`);
  }

  /** The id token remembered from the last completed sign-in, if this tab still has it. */
  idToken(): string | null {
    return sessionStorage.getItem(this.keys.idToken);
  }

  /**
   * Sends the browser to the hosted login page.
   *
   * @param returnTo where to land afterwards, remembered locally rather than round-tripped through the
   *     provider. Putting it in the `state` parameter would make it attacker-controlled, and a
   *     post-login redirect an attacker chooses is an open redirect wearing a different hat.
   */
  beginLogin(returnTo?: string): Promise<void> {
    return this.authorize(returnTo);
  }

  /** Forces Identity to show credentials again so an invite can be accepted with another account. */
  beginAccountSwitch(returnTo?: string): Promise<void> {
    return this.authorize(returnTo, "login");
  }

  /**
   * Same as {@link beginLogin}, but asks the provider not to show a page.
   *
   * <p>The Identity session cookie is SameSite=Lax on the issuer origin, so an XHR from this
   * product cannot see it. A top-level redirect to {@code /authorize?prompt=none} can. If the
   * person is already signed in, a code comes back immediately. If they are not, the provider
   * returns {@code login_required} to the callback instead of the hosted login page — which is
   * how a product welcome screen stays reserved for people who actually need to sign in.
   */
  beginSilentLogin(returnTo?: string): Promise<void> {
    return this.authorize(returnTo, "none");
  }

  /** Drops PKCE keys from a silent attempt that came back as {@code login_required}. */
  abandonAuthorize(): void {
    this.clearAuthorize();
  }

  /**
   * Sends the browser to the hosted signup page, the long way round.
   *
   * <p>Through `/authorize` with `prompt=create` rather than straight to the signup URL, because the
   * redirect is what makes the provider save this authorization request. With one saved, a person who
   * signs up from the admin console is returned to the admin console; without one, the provider has
   * only a configured default to fall back on and everybody lands in the same product.
   *
   * <p>`prompt=create` is OpenID Connect's registration extension. A provider that does not implement
   * it ignores the parameter and shows the login page, which has a link to signup on it — degraded, not
   * broken.
   */
  beginSignup(returnTo?: string): Promise<void> {
    return this.authorize(returnTo, "create");
  }

  /**
   * Asks Identity for a fresh proof. Staff step-up and a changed network land here: {@code prompt=login}
   * shows the hosted page again, and {@code max_age=0} tells the provider the existing session is not
   * fresh enough.
   */
  beginStepUp(returnTo?: string): Promise<void> {
    // This page is already the redirect from authorize. Starting another one reloads it for as long
    // as the cookie exchange keeps asking for a step-up.
    if (typeof window !== "undefined" && window.location.pathname.startsWith("/auth/callback")) {
      return Promise.resolve();
    }
    return this.authorize(returnTo, "login", { max_age: "0" });
  }

  /**
   * Redeems the code the provider sent back.
   *
   * @throws if `state` does not match what this tab stored, which means the response belongs to a flow
   *     this tab did not start — a forged callback, or a stale one from another tab.
   */
  completeLogin(search: URLSearchParams): Promise<{ tokens: OidcTokens; returnTo: string }> {
    return this.handleCallback(search);
  }

  /** Alias of {@link completeLogin}. */
  async handleCallback(search: URLSearchParams): Promise<{ tokens: OidcTokens; returnTo: string }> {
    const error = search.get("error");
    if (error) {
      this.clearAuthorize();
      if (isSilentLoginErrorCode(error)) {
        throw new SilentLoginError(error, search.get("error_description"));
      }
      throw new Error(search.get("error_description") ?? this.describeError(error));
    }

    const code = search.get("code");
    const state = search.get("state");
    const expectedState = sessionStorage.getItem(this.keys.state);
    const verifier = sessionStorage.getItem(this.keys.verifier);
    const returnTo = this.safeReturnTo(sessionStorage.getItem(this.keys.returnTo));

    // Cleared before the exchange, not after. The code is single-use, so a retry with the same verifier
    // would fail anyway, and leaving them behind means a later forged callback finds a usable verifier.
    sessionStorage.removeItem(this.keys.verifier);
    sessionStorage.removeItem(this.keys.state);
    sessionStorage.removeItem(this.keys.returnTo);

    if (!code || !state || !verifier) {
      throw new Error("That sign-in link is incomplete. Start again from the sign-in page.");
    }
    if (!expectedState || state !== expectedState) {
      throw new Error("That sign-in response did not match this browser. Start again.");
    }

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: this.redirectUri(),
      client_id: this.clientId,
      code_verifier: verifier,
    });

    const response = await fetch(`${this.issuer}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      // The refresh token comes back in a cookie set by the identity origin, so this request has to
      // carry and accept cookies. Keeping the refresh token out of JavaScript is the point: script on
      // this page cannot read an HttpOnly cookie, so an XSS hole cannot walk away with a 30-day token.
      credentials: "include",
      body,
    });

    if (!response.ok) {
      throw new Error("Could not complete sign-in. Start again from the sign-in page.");
    }

    const payload = (await response.json()) as {
      access_token: string;
      expires_in: number;
      id_token?: string;
    };

    return {
      tokens: {
        accessToken: payload.access_token,
        expiresIn: payload.expires_in,
        idToken: payload.id_token,
      },
      returnTo,
    };
  }

  /** Remembers the id token from a completed sign-in, so sign-out has something to present. */
  rememberIdToken(idToken?: string): void {
    if (idToken) sessionStorage.setItem(this.keys.idToken, idToken);
  }

  /**
   * Ends the session at the provider, not only here.
   *
   * <p>Clearing local state alone would leave the identity session cookie in place, so the next
   * `/authorize` returns a code immediately and the person appears to be signed straight back in —
   * which reads as a broken sign-out button rather than the security hole it is on a shared machine.
   *
   * <p>Navigates away, so it has to be the last thing a caller does.
   *
   * @param idTokenHint optional override when the caller kept the token in memory (a reload still
   *     prefers sessionStorage via {@link idToken}).
   */
  beginLogout(idTokenHint?: string): void {
    const hint = idTokenHint || sessionStorage.getItem(this.keys.idToken) || undefined;
    sessionStorage.removeItem(this.keys.idToken);

    if (hint) {
      const postLogoutRedirectUri = resolveUrl(
        this.postLogoutRedirectUriOption,
        () => `${window.location.origin}/`,
      );
      if (this.postLogoutViaForm()) {
        this.submitLogoutForm(`${this.issuer}/connect/logout`, {
          client_id: this.clientId,
          id_token_hint: hint,
          post_logout_redirect_uri: postLogoutRedirectUri,
        });
        return;
      }
      const params = new URLSearchParams({
        client_id: this.clientId,
        id_token_hint: hint,
        post_logout_redirect_uri: postLogoutRedirectUri,
      });
      window.location.assign(`${this.issuer}/connect/logout?${params.toString()}`);
      return;
    }

    // Without an id token the provider cannot perform RP-initiated logout. Open Identity's hosted
    // confirmation page instead: GET never signs the user out, and the page supplies the CSRF token
    // for its explicit POST. Posting cross-origin from this product cannot safely know that token.
    window.location.assign(identityHostedLogoutUrl(this.issuer));
  }

  /** The OIDC end-session endpoint accepts a standards-defined form POST when an id token exists. */
  protected postLogoutViaForm(): boolean {
    return typeof document !== "undefined" && typeof document.body !== "undefined";
  }

  protected submitLogoutForm(action: string, fields: Record<string, string>): void {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = action;
    form.style.display = "none";
    for (const [name, value] of Object.entries(fields)) {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      form.appendChild(input);
    }
    document.body.appendChild(form);
    form.submit();
  }

  private async authorize(
    returnTo?: string,
    prompt?: string,
    extra?: Record<string, string>,
  ): Promise<void> {
    const verifier = randomUrlSafe(64);
    const state = randomUrlSafe(32);

    sessionStorage.setItem(this.keys.verifier, verifier);
    sessionStorage.setItem(this.keys.state, state);
    sessionStorage.setItem(this.keys.returnTo, this.safeReturnTo(returnTo));

    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.clientId,
      redirect_uri: this.redirectUri(),
      scope: "openid profile email",
      state,
      code_challenge: await sha256Base64Url(verifier),
      // S256, never "plain". Plain sends the verifier itself in the redirect, so anything that can read
      // the authorization request can also redeem the code, which is the attack PKCE exists to stop.
      code_challenge_method: "S256",
    });
    if (prompt) params.set("prompt", prompt);
    if (extra) {
      for (const [name, value] of Object.entries(extra)) {
        params.set(name, value);
      }
    }

    window.location.assign(`${this.issuer}/oauth2/authorize?${params.toString()}`);
  }

  private clearAuthorize(): void {
    sessionStorage.removeItem(this.keys.verifier);
    sessionStorage.removeItem(this.keys.state);
    sessionStorage.removeItem(this.keys.returnTo);
  }
}

let defaultClient: OidcClient | null = null;

export function configureOidc(config: OidcConfig): OidcClient {
  defaultClient = new OidcClient(config);
  return defaultClient;
}

function client(): OidcClient {
  if (!defaultClient) {
    throw new Error("OIDC is not configured. Call configureOidc({ issuer, clientId }) first.");
  }
  return defaultClient;
}

export function identityIssuer(): string {
  return defaultClient?.identityIssuer() ?? "";
}

export function isOidcEnabled(): boolean {
  return defaultClient?.isOidcEnabled() ?? false;
}

export function redirectUri(): string {
  return client().redirectUri();
}

export function idToken(): string | null {
  return defaultClient?.idToken() ?? null;
}

export function beginLogin(returnTo?: string): Promise<void> {
  return client().beginLogin(returnTo);
}

export function beginAccountSwitch(returnTo?: string): Promise<void> {
  return client().beginAccountSwitch(returnTo);
}

export function beginSilentLogin(returnTo?: string): Promise<void> {
  return client().beginSilentLogin(returnTo);
}

export function abandonAuthorize(): void {
  client().abandonAuthorize();
}

export function beginSignup(returnTo?: string): Promise<void> {
  return client().beginSignup(returnTo);
}

export function beginStepUp(returnTo?: string): Promise<void> {
  return client().beginStepUp(returnTo);
}

export function completeLogin(search: URLSearchParams): Promise<{ tokens: OidcTokens; returnTo: string }> {
  return client().completeLogin(search);
}

export function handleCallback(search: URLSearchParams): Promise<{ tokens: OidcTokens; returnTo: string }> {
  return client().handleCallback(search);
}

export function rememberIdToken(value?: string): void {
  client().rememberIdToken(value);
}

export function beginLogout(idTokenHint?: string): void {
  client().beginLogout(idTokenHint);
}

/** OIDC errors that mean "nobody is signed in", not that the client is broken. */
const SILENT_LOGIN_ERROR_CODES = new Set([
  "login_required",
  "interaction_required",
  "consent_required",
  "account_selection_required",
]);

export class SilentLoginError extends Error {
  readonly code: string;

  constructor(code: string, description?: string | null) {
    super(description || "Sign-in is required.");
    this.name = "SilentLoginError";
    this.code = code;
  }
}

export function isSilentLoginError(error: unknown): error is SilentLoginError {
  return error instanceof SilentLoginError;
}

function isSilentLoginErrorCode(code: string): boolean {
  return SILENT_LOGIN_ERROR_CODES.has(code);
}

function randomUrlSafe(bytes: number): string {
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  return base64UrlEncode(buffer);
}

async function sha256Base64Url(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return base64UrlEncode(new Uint8Array(digest));
}

/** Base64url per RFC 7636: no padding, and the two substituted characters. */
function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
