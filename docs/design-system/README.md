# Open Design reference package

This directory preserves the Open Design export used to initialize Starward's design baseline.

## Authority

- ../../DESIGN.md is the canonical, authored visual-system source.
- ../../project_context/ owns durable product, surface, interaction, state, and verification facts.
- Files here are imported reference or generated implementation artifacts. If an export conflicts with DESIGN.md or Context, update the owning authority first and regenerate or realign the export.

## Screenshot-file mapping

| Open Design export | Starward location | Purpose |
| --- | --- | --- |
| DESIGN.md | ../../DESIGN.md | Adapted into the canonical Google design.md-compatible visual authority |
| brand.html | brand.html | Brand-system overview and navigation |
| guide.md | guide.md | Source brand/product experience narrative |
| system/variables.css | system/variables.css | Generated CSS token surface |
| system/theme.json | system/theme.json | Generated theme seed |
| system/kit.html | system/kit.html | Light component-kit preview |
| system/kit.dark.html | system/kit.dark.html | Dark component-kit preview |

The original Open Design DESIGN.md is retained at source/DESIGN.open-design.md for provenance. Fonts, imagery, brand narrative, and linked artifact pages were also imported so the HTML previews resolve their local dependencies.

## Source

Imported on 2026-07-20 from the local Open Design project:

    C:\Users\777\AppData\Roaming\Open Design\namespaces\release-stable-win\data\projects\brand-design-md-c6870f

The Git snapshot is portable; the source path above is provenance only and is not required at runtime.

## Review entry points

- Open brand.html for the overview.
- Open system/kit.html and system/kit.dark.html for component reference.
- Run the validation commands documented in project_context/areas/main/verification.md after changing the canonical design or Context.
