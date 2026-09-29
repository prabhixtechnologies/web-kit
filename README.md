# @prabhixtechnologies/web-kit

Shared web packages for Prabhix product apps. `Infra/design` remains the design source; this repo publishes copies that product webs can depend on.

| Package | What it is |
|---|---|
| `@prabhixtechnologies/brand` | CSS tokens (`prabhix-tokens.css`) and SVG marks |
| `@prabhixtechnologies/ui` | Shared React primitives (`Button`, `Dialog`, …) |
| `@prabhixtechnologies/oidc-client` | Browser PKCE against Prabhix Identity |

TypeScript, ESM. Packages export source so Vite and Next compile them.

## Local consumption (`file:`)

From a product web (for example `oneOps/web`):

```json
{
  "dependencies": {
    "@prabhixtechnologies/brand": "file:../../web-kit/packages/brand",
    "@prabhixtechnologies/ui": "file:../../web-kit/packages/ui",
    "@prabhixtechnologies/oidc-client": "file:../../web-kit/packages/oidc-client"
  }
}
```

`Platform/marketing` is also two levels below the workspace root, so the same `../../web-kit/packages/…` path applies.

Then:

```bash
cd web-kit && npm install
cd ../oneOps/web && npm install
```

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

## GitHub Packages (later)

Not wired yet. When you publish:

1. Add a GitHub Package registry for the `@prabhixtechnologies` scope in each consumer `.npmrc`:
   ```
   @prabhixtechnologies:registry=https://npm.pkg.github.com
   //npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
   ```
2. Set each package `"publishConfig": { "registry": "https://npm.pkg.github.com" }` and a public package name that matches the GitHub repo (`@prabhixtechnologies/brand`, …).
3. Replace `file:` versions with semver (`"@prabhixtechnologies/brand": "^0.1.0"`).
4. `npm publish -w @prabhixtechnologies/brand` (and ui / oidc-client) from a CI job with `packages: write`.

Until then, `file:` is the only supported install path.
