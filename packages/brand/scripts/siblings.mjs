// Resolving a portfolio path against the directory that holds web-kit.
//
// The scripts here address other repositories by the name this workspace gives them -
// `MobiStack/web/src`, `Infra/deploy/app-store/www`. That name is not always the name a clone
// arrives under. A runner checks out to work/<repo>/<repo> using the name as GitHub spells it,
// and for three of the eight that spelling differs only in case: `infra`, `Mobistack` and
// `platform`. Windows and macOS hide the difference; Linux does not.
//
// The effect was a gate that passed by scanning nothing. Infra's colour check reported "no
// hard-coded colours in 24 files across 2 trees" - both of them web-kit's - and listed its own
// tree under "not checked out". It was honest about it and still green, which is the worst
// combination: the output said the words and nobody read them, because the tick was there.
//
// Matching case-insensitively is right rather than merely convenient. These names identify a
// repository, and GitHub itself treats them case-insensitively - github.com/…/Infra serves the
// same repository as /infra. Two sibling directories differing only in case would be a
// checkout nobody makes on purpose, and the first match is as good as any in that case.

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

/** Directory entries of `repo`, read once: every tree in the table shares the same parent. */
const cache = new Map();

function entries(repo) {
  if (!cache.has(repo)) {
    let names = [];
    try {
      names = readdirSync(repo, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name);
    } catch {
      // No parent directory to read - web-kit cloned on its own. Callers fall back to the
      // literal path, which will not exist, and report the tree as absent.
    }
    cache.set(repo, names);
  }
  return cache.get(repo);
}

/**
 * The real directory for a repository beside web-kit, or the name as written when there is no
 * such directory. Returning the written name rather than null keeps the caller's "skipped"
 * message reading in this workspace's vocabulary instead of the runner's.
 */
export function ownerDir(repo, owner) {
  if (existsSync(join(repo, owner))) return owner;
  return entries(repo).find((name) => name.toLowerCase() === owner.toLowerCase()) ?? owner;
}

/** The same, for a path whose first segment names the repository. */
export function sibling(repo, treePath) {
  const [owner, ...rest] = treePath.split("/");
  return join(repo, ownerDir(repo, owner), ...rest);
}
