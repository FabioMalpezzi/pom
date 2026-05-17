# POM Wiki - Index

> Persistent Wiki for the POM source repository.
> Primary source: current POM repository files.
> Last updated: 2026-05-17

## Summary

This index is the reading map for the POM source wiki. It groups the method's core memory, adoption, governance, and evolution pages for generated HTML browsing.

## How To Read This Wiki

This is the root Persistent Wiki for the POM source repository. The pages below are written as a compact map of the method: enough context to restart well, without replacing the source files that define the rules.

Each page documents current consolidated knowledge about POM. The source Markdown remains authoritative, and the generated HTML is only a reader view over that source.

## Overview

| Page | Summary |
|---|---|
| [[overview]] | High-level map of what POM is, what it protects, and how this wiki should be read. |
| [[operating-memory]] | Core domain model for restart-critical memory: Operating Memory, Memory Elements, Source Authority, and Divergence. |
| [[wiki-method]] | How the Persistent Wiki turns project knowledge into a maintained synthesis rather than a temporary index. |

## Method Areas

| Area | Use | Main Pages |
|---|---|---|
| Method foundation | Purpose, principles, scope, and non-goals | [[overview]], [[operating-memory]] |
| Wiki and memory | Persistent Wiki creation, query, lint, stale review, and reconciliation | [[wiki-method]] |
| Adoption | Installation posture, adoption profiles, ownership, and overlay mode | [[adoption-and-installation]] |
| Agent procedures | Skill cards, canonical prompts, and how agents find the right workflow | [[skills-and-prompts]] |
| Governance | Templates, lint, completion verification, and document discipline | [[templates-and-governance]] |
| Evolution | Experiments, extension, pruning, reader capabilities, and current specs | [[experiments-and-extension]], [[reader-capabilities]], [[current-specs]] |

## Sources And Legend

| Symbol / Source | Meaning |
|---|---|
| Primary source | Current repository files. |
| Wiki synthesis | Root Persistent Wiki page maintained as POM Operating Memory. |
| To verify | A claim that should be checked again before significant change. |

## Pages To Verify

| Page | Reason |
|---|---|
| [[adoption-and-installation]] | Installer and config behavior is broad; future changes should re-check `scripts/install-pom.ts`. |
| [[templates-and-governance]] | Lint behavior is summarized from README and config sources, not exhaustively from `scripts/lint-doc-governance.ts`. |

## Missing Concepts

| Concept | Why It Is Needed |
|---|---|
| Full lint rule map | Needed only if the reader view becomes a governance aid rather than a consultation aid. |
| Generated docs relation | Needed if reader HTML is promoted beside existing `docs/POM_GUIDE.*.html`. |
