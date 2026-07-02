@AGENTS.md

## Claude Code

Rules load from `.cursor/rules/` (single source of truth). Run `/memory` to verify loaded files.

- Edit only `src/` (not `next/` or `astro/` unless explicitly migrating)
- Run `npm run check` and `npm run build` before finishing non-trivial changes

@.cursor/rules/ab-project.mdc
@.cursor/rules/astro-pages.mdc
@.cursor/rules/i18n-routing.mdc
@.cursor/rules/data-apis.mdc
@.cursor/rules/react-islands.mdc
@.cursor/rules/brand-styling.mdc
@.cursor/rules/tailwind.mdc
@.cursor/rules/naming-conventions.mdc
@.cursor/rules/typescript.mdc
