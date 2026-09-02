import type { LintContext } from "./lint-context.ts";
import {
  cleanRelativePath,
  configuredIndexPath,
  frontmatterList,
  frontmatterScalar,
  gitChangedFiles,
  gitLastCommitTime,
  isSamePathOrInside,
  parseFrontmatter,
  pathExists,
  readText,
  walkFiles,
} from "./lint-helpers.ts";

/**
 * Freshness of synthesis pages.
 *
 * A wiki page that summarizes other sources (the project overview above all)
 * can declare them in its frontmatter:
 *
 *   ---
 *   derivedFrom:
 *     - decisions/
 *     - PROJECT_STATE.md
 *   verified: 2026-09-02
 *   ---
 *
 * The page is considered verified at `verified` (end of that day) or, when the
 * field is missing, at its last commit. Every declared source that changed
 * after that moment, in a later commit or in the working tree, makes the page
 * a stale candidate. The finding is a warning: the lint cannot know whether
 * the prose still holds, only that nobody re-read it since the source moved.
 *
 * Pages without `derivedFrom` are not checked. This keeps the rule opt-in per
 * page, so a project adopts it where a synthesis actually exists.
 */
export function checkWikiFreshness(context: LintContext): void {
  if (!context.wikiGovernanceEnabled) return;
  const wikiRoot = context.config.wiki.root;
  if (!pathExists(context.root, wikiRoot)) return;

  const pages = walkFiles(
    context.root,
    wikiRoot,
    (path) => path.endsWith(".md") && !path.startsWith(`${wikiRoot}/_site/`),
  );

  const declared = pages
    .map((page) => ({ page, frontmatter: parseFrontmatter(readText(context.root, page)) }))
    .filter(({ frontmatter }) => frontmatterList(frontmatter, "derivedFrom").length > 0);
  if (declared.length === 0) return;

  let gitUnavailable = false;
  const dirty = [...gitChangedFiles(context.root, () => {
    gitUnavailable = true;
  })];
  if (gitUnavailable) {
    context.add("warning", "git-status", "Unable to read git status; wiki freshness checks were skipped.");
    return;
  }

  // The ADR index is written by this very lint from the ADRs themselves: a
  // change there is never new information, so it must not mark a page stale.
  const generatedIndex = configuredIndexPath(context.config.decisions.indexPath, context.config.decisions.root || "decisions");
  const now = Date.now();
  const touched = (path: string) =>
    dirty.some((changed) => changed !== generatedIndex && isSamePathOrInside(changed, path));

  for (const { page, frontmatter } of declared) {
    const verifiedRaw = frontmatterScalar(frontmatter, "verified");
    let baseline: number | undefined;
    let baselineLabel = "";

    if (verifiedRaw !== undefined) {
      const verified = parseVerifiedDate(verifiedRaw);
      if (verified === undefined) {
        context.add(
          "warning",
          "wiki-verified-format",
          `Frontmatter field 'verified' must be a YYYY-MM-DD date, found: ${verifiedRaw}`,
          page,
        );
        continue;
      }
      baseline = verified;
      baselineLabel = verifiedRaw;
    } else if (touched(page)) {
      baseline = now;
      baselineLabel = "the current working tree";
    } else {
      const committed = gitLastCommitTime(context.root, page);
      if (committed === undefined) continue;
      baseline = committed;
      baselineLabel = `its last commit on ${isoDate(committed)}`;
    }

    for (const rawSource of frontmatterList(frontmatter, "derivedFrom")) {
      const source = cleanRelativePath(rawSource);
      if (!source) continue;

      if (!pathExists(context.root, source)) {
        context.add(
          "warning",
          "wiki-derived-source-missing",
          `Frontmatter 'derivedFrom' names a path that does not exist: ${source}`,
          page,
        );
        continue;
      }

      let changedAt: number | undefined;
      let changedLabel = "";
      if (touched(source)) {
        changedAt = now;
        changedLabel = "in the working tree";
      } else {
        changedAt = gitLastCommitTime(context.root, source);
        if (changedAt !== undefined) changedLabel = `on ${isoDate(changedAt)}`;
      }
      if (changedAt === undefined || changedAt <= baseline) continue;

      context.add(
        "warning",
        "wiki-stale-synthesis",
        `Page derives from ${source}, which changed ${changedLabel}, after the page was last verified (${baselineLabel}). Re-read the source, update the page if needed, then set 'verified' to today's date.`,
        page,
      );
    }
  }
}

/** End of the given local day, so a source committed earlier on the verification day counts as covered. */
function parseVerifiedDate(value: string): number | undefined {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return undefined;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 23, 59, 59, 999);
  if (Number.isNaN(date.getTime()) || date.getMonth() !== Number(match[2]) - 1) return undefined;
  return date.getTime();
}

function isoDate(epochMs: number): string {
  const date = new Date(epochMs);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
