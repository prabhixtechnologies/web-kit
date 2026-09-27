import assert from "node:assert/strict";
import test from "node:test";

import {
  identityHostedLogoutUrl,
  loginPathWithReason,
  mapApiSignInReason,
  safeAppPath,
} from "./index.ts";

test("safeAppPath rejects open redirects", () => {
  assert.equal(safeAppPath("//evil.example/phish"), "/");
  assert.equal(safeAppPath("https://evil.example"), "/");
  assert.equal(safeAppPath("/dashboard/reports"), "/dashboard/reports");
});

test("loginPathWithReason keeps reason inside the app", () => {
  assert.equal(loginPathWithReason("/login", "security"), "/login?reason=security");
  assert.equal(loginPathWithReason("//x", "session", "/login"), "/login?reason=session");
});

test("identityHostedLogoutUrl uses GET hosted confirmation path", () => {
  assert.equal(
    identityHostedLogoutUrl("https://api.prabhixtechnologies.com/"),
    "https://api.prabhixtechnologies.com/logout",
  );
});

test("mapApiSignInReason maps security cutover codes", () => {
  assert.equal(mapApiSignInReason("SESSION_REPLACED"), "security");
  assert.equal(mapApiSignInReason("token_revoked"), "security");
  assert.equal(mapApiSignInReason("TOKEN_EXPIRED"), "expired");
});
