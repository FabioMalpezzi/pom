# Changelog

This changelog records public-facing POM releases. Fine-grained development history remains in Git.

## 0.1.0 - 2026-05-18

First truly public POM release. This version is ready for external evaluation and has already been exercised on internal medium-sized projects, but it should still be treated as the beginning of public validation. Reaching a definitive shape will require careful testing across many real projects, with feedback folded back into the method, templates, scripts, and adoption guidance.

### Added

- Bootstrap installer for target projects through `bootstrap-pom.mjs`.
- Adoption presets for owned, team, overlay, and minimal setups.
- POM skills, prompts, templates, and governance lint.
- Static wiki reader generation through `npm run pom:wiki:render`.
- `pom:update` for refreshing installed POM copies.
- `pom:test` for the POM source repository integration suite.

### Distribution Notes

- The current bootstrap checksum is published in `checksums/bootstrap-pom.mjs.sha256`.
- For repeatable adoption, install from a release tag or immutable commit and verify the checksum from the same ref.
- The package version is `0.1.0`; create the matching Git tag before treating this as a published release.
