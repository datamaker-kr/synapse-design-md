# Changelog

All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.0] - 2026-05-20

### Added
- Deferred component contracts (atoms/molecules) with descriptive and aspirational schemas
- `verify-contract` script for validating component contracts against live pages
- `crawl-contract` script for live site crawling and evidence gathering
- `findings-to-issues` script for converting findings to actionable issues
- `token-index` script for design token indexing
- `test.mjs` test runner for contract verification
- `post-edit-verify` hook for PostToolUse verification
- Example contracts for `button-primary` (atom) and `nav-item` (molecule)
- Probe fixtures for contract verification (pass/fail cases)

## [0.4.0] - 2026-05-19

### Changed
- Auto-resolve latest tag in `install.sh` for simpler releases

## [0.3.0] - 2026-05-19

### Added
- `curl`-based install script
- Korean README

## [0.2.0] - 2026-05-19

### Added
- Initial synapse design-md toolkit
- DESIGN.md token sync from synapse-workspace tailwind theme
- Sizes tokens from eval baseline + token-backed eval coverage
- Inventory command + `synapse-pages.json` generation
- Badge, alert, dialog, table DESIGN.md components
- Redundant-arbitrary-value detection as a separate finding type
- `awesome-design-md` conventions in DESIGN.md contract
- Split sync vs hand-edit governance (Issue #3, option C)
- Authenticated Playwright crawl for rendered-evidence (M3)
- CI gate on governance + sync round-trip + design.md lint (M6)
- `display-lg` typography token for 36/700 page title pattern
- Accessibility contract: WCAG 2.2 AA, contrast matrix, motion tokens
- Color provenance verification
- README for end users; maintainer docs moved to CONTRIBUTING.md
