#!/usr/bin/env node
/**
 * Every app that links @prabhixtechnologies/ui must declare all of its peer dependencies.
 *
 * <p>Apps depend on this package with `file:`, and npm does not install a linked package's own
 * dependencies into the consumer - it assumes the link target's tree will serve. Vite's build
 * agrees, because it resolves through the symlink to the real path on disk. Vitest does not: it
 * inlines linked sources and resolves from the link path, inside the app's own node_modules.
 *
 * <p>So a package that @prabhixtechnologies/ui needs but the app has not declared will build cleanly and
 * fail at test time, in whichever unrelated file happens to import the barrel first. That is how
 * this was found: adding an accordion primitive turned three OneOps test files red, none of them
 * about accordions, with "Failed to resolve import" pointing into node_modules.
 *
 * <p>Peers are the only declaration that reaches the apps, and a peer list is only as good as the
 * apps that honour it. OneOps had thirteen of fourteen, Mailroom two, MobiStack none - so the
 * model was already broken and nobody knew, because the missing ones happened to be unused.
 *
 * <p>Run from any repo. Prints the exact npm command to fix each app.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ownerDir } from "./siblings.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "..", "..", "..", "..");
const webKit = resolve(here, "..", "..", "..");

const read = (path) => JSON.parse(readFileSync(path, "utf8"));

/** Peers a consumer is not expected to declare: the app supplies its own or never sees them. */
const NOT_REQUIRED = new Set();

const uiManifest = join(webKit, "packages", "ui", "package.json");
if (!existsSync(uiManifest)) {
  console.error(`No @prabhixtechnologies/ui at ${uiManifest}.`);
  process.exit(1);
}
const peers = Object.entries(read(uiManifest).peerDependencies ?? {}).filter(
  ([name]) => !NOT_REQUIRED.has(name),
);

/**
 * Every package.json in a sibling checkout that depends on @prabhixtechnologies/ui.
 *
 * <p>Two levels deep is enough for the layout in use - `oneOps/web`, `Platform/marketing`,
 * `MobiStack/web` - without walking into node_modules or a Flutter tree.
 */
function consumers() {
  const found = [];
  let owners;
  try {
    owners = readdirSync(repo, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
      .map((entry) => entry.name);
  } catch {
    return found;
  }

  for (const owner of owners) {
    // Resolved case-insensitively: a runner clones GitHub's spelling, which is not this
    // workspace's for every repo. See siblings.mjs.
    const dir = join(repo, ownerDir(repo, owner));
    let children;
    try {
      children = readdirSync(dir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && entry.name !== "node_modules")
        .map((entry) => entry.name);
    } catch {
      continue;
    }
    for (const child of children) {
      const manifest = join(dir, child, "package.json");
      if (!existsSync(manifest)) continue;
      let json;
      try {
        json = read(manifest);
      } catch {
        continue;
      }
      const deps = { ...json.dependencies, ...json.devDependencies };
      if (!deps["@prabhixtechnologies/ui"]) continue;
      found.push({ name: json.name ?? `${owner}/${child}`, path: `${owner}/${child}`, deps, dir: join(dir, child) });
    }
  }
  return found;
}

const apps = consumers();
const problems = [];

for (const app of apps) {
  const missing = peers.filter(([name]) => !app.deps[name]);
  if (missing.length > 0) problems.push({ app, missing });
}

if (apps.length === 0) {
  // Not a failure. web-kit is cloned on its own in its own CI job, with no siblings to check.
  console.log("no sibling app depends on @prabhixtechnologies/ui; nothing to check");
  process.exit(0);
}

if (problems.length === 0) {
  console.log(
    `all ${peers.length} @prabhixtechnologies/ui peer(s) declared by ${apps.length} app(s): ${apps
      .map((app) => app.path)
      .join(", ")}`,
  );
  process.exit(0);
}

// The count of apps checked is printed on both paths. A gate that silently found nothing to
// check looks identical to one that passed, and this repo has already shipped one of those.
console.error(
  `${problems.length} of ${apps.length} app(s) missing @prabhixtechnologies/ui peer dependencies ` +
    `(${peers.length} peers, apps: ${apps.map((app) => app.path).join(", ")}):\n`,
);
for (const { app, missing } of problems) {
  console.error(`  ${app.path}  (${app.name})`);
  for (const [name, range] of missing) console.error(`    ${name}  ${range}`);
  const install = missing.map(([name, range]) => `${name}@${range}`).join(" ");
  console.error(`\n    cd ${app.path} && npm install --save-exact ${install}\n`);
}
console.error(
  "npm does not install a `file:` dependency's own packages into the consumer, so anything\n" +
    "@prabhixtechnologies/ui imports has to be declared by the app as well. The build resolves it through\n" +
    "the symlink and passes; Vitest resolves from the link path and fails. Declare them.",
);
process.exit(1);
