# @prabhixtechnologies/web-kit

Shared web packages for Prabhix product apps. `Infra/design` remains the design source; this repo publishes copies that product webs can depend on.

| Package | What it is |
|---|---|
| `@prabhixtechnologies/brand` | CSS tokens (`prabhix-tokens.css`) and SVG marks |
| `@prabhixtechnologies/ui` | Shared React primitives (`Button`, `Dialog`, …) |
| `@prabhixtechnologies/oidc-client` | Browser PKCE against Prabhix Identity |

TypeScript, ESM. Each package is built with tsup and exports compiled output from `dist`, with
declarations. `@prabhixtechnologies/ui` also ships its `src` — Tailwind v4 skips `node_modules`,
so consumers point `@source` at it to find the primitives' class names.

## Consuming these packages

All three are published to GitHub Packages. Add the scope mapping to the app's `.npmrc`:

```
@prabhixtechnologies:registry=https://npm.pkg.github.com
```

and depend on a version range:

```json
{
  "dependencies": {
    "@prabhixtechnologies/brand": "^1.1.1",
    "@prabhixtechnologies/ui": "^1.0.1",
    "@prabhixtechnologies/oidc-client": "^1.0.1"
  }
}
```

Put no token in that file. Locally it comes from `~/.npmrc`; in CI `actions/setup-node` writes one
from `NODE_AUTH_TOKEN`, which is the workflow's built-in `GITHUB_TOKEN` with `packages: read`. A
committed `_authToken=${NODE_AUTH_TOKEN}` breaks every install where that variable is unset, which
is every local one.

A token is required even though all three packages are public and this repository is readable
anonymously in a browser. That is how GitHub Packages behaves for npm; it is not a permission left
unset, and no amount of package-visibility configuration removes it.

Docker builds get the token as a BuildKit secret rather than a build argument, because a build
argument is recorded in the image history. See any consumer's `web/Dockerfile`.

### This used to be a `file:` link

Every consumer depended on `file:../../web-kit/packages/…`, which meant the package had to be
materialised three ways: a sibling clone on a laptop, a git clone into the runner pinned by a
`WEBKIT_REF` SHA in four workflow files, and a vendored copy inside each image. Those pins drifted,
and the gates then passed against a newer web-kit than the one being shipped. A version range and
a lockfile replaced all of it. `Infra/docs/DEPLOY.md` has the details.

Use npm 10 or newer when regenerating a consumer lockfile. npm 8 writes registry entries with no
`resolved` URL and no `integrity` hash, leaving `npm ci` nothing to verify.

```ts
import { Button } from "@prabhixtechnologies/ui";
import { configureOidc, beginLogin } from "@prabhixtechnologies/oidc-client";
```

```css
@import "@prabhixtechnologies/brand/prabhix-tokens.css";
```

```ts
import markUrl from "@prabhixtechnologies/brand/marks/prabhix-mark.svg";
```

OIDC: call `configureOidc({ issuer, clientId, redirectUri })` (or `new OidcClient(…)` ) before `beginLogin`. Product-specific client ids stay in the app.

## Publishing

Tag-driven and deliberately manual. Push a tag starting `v` and `.github/workflows/publish.yml`
runs the gates, the tests and the builds, then publishes whichever of the three packages has a
version not already on the registry. Re-publishing an existing version is a no-op, matched on
npm's `E409`/`EPUBLISHCONFLICT` rather than assumed, so a genuine failure still fails the job.

Bump the version in the package's own `package.json` first. A published version cannot be taken
back: npm allows unpublish only within 72 hours, and a consumer that has already resolved it keeps
the bad copy in its lockfile regardless.

The scope must be `@prabhixtechnologies`, not the shorter `@prabhix`. GitHub Packages resolves an
npm scope to a GitHub owner of the same name, and under `@prabhix` every publish returned
`403 Permission not_found: owner not found`. No registry setting changes that.

Do not try to serve `src` to consumers through `publishConfig`. npm's `publishConfig` overrides npm
*config* values — registry, tag, access, provenance — and overriding `package.json` fields such as
`exports` is a Yarn and pnpm feature that npm ignores silently. All three packages shipped at 1.x
pointing at raw TypeScript that way, and nothing warned. `exports` names `dist`, and a `prepare`
script keeps `dist` present after every install and before every pack.
