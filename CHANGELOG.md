# Changelog

## [0.2.0](https://github.com/absmartly/dom-tracker/compare/dom-tracker-v0.1.0...dom-tracker-v0.2.0) (2026-04-14)


### Features

* add core type definitions ([05edaeb](https://github.com/absmartly/dom-tracker/commit/05edaebb04ddbac67f6fae8e800d64dab2217a4e))
* add debug, cookie, and dom utilities ([04dcc6a](https://github.com/absmartly/dom-tracker/commit/04dcc6acb6bc54bcb2062912d8b5fdd7cf9c5440))
* add DOMTracker core with lifecycle, event dispatch, and tracker management ([7c10194](https://github.com/absmartly/dom-tracker/commit/7c1019487a25fb22d6595073e0a28735fa8d4591))
* add ElementScanner with delegated click tracking ([fef3e75](https://github.com/absmartly/dom-tracker/commit/fef3e757706b757feab94041066771c6b2640fb1))
* add form tracker with start, submit, and abandonment detection ([c5b8381](https://github.com/absmartly/dom-tracker/commit/c5b8381562bd2de62a0a916ac9e8cf99c81b8770))
* add page views tracker ([dd97988](https://github.com/absmartly/dom-tracker/commit/dd97988391f5b9d287c9ef21f616638adf2b0f5b))
* add preset system with HubSpot forms preset ([e783551](https://github.com/absmartly/dom-tracker/commit/e78355186b822bdc37d366bd750b558653628ecd))
* add public exports and wire default trackers ([21b26c7](https://github.com/absmartly/dom-tracker/commit/21b26c7605976f2cfc69fe0adb95fa485c4312ed))
* add RuleEngine for selector-based tracking rules ([850d218](https://github.com/absmartly/dom-tracker/commit/850d218c8b5817e721c35e0694d17f7dadeef122))
* add scroll depth tracker with configurable thresholds ([d3e4cb0](https://github.com/absmartly/dom-tracker/commit/d3e4cb0d867398c7316183d419d97082e671208d))
* add session tracker with cookies, UTM extraction, and visitor detection ([299cdf1](https://github.com/absmartly/dom-tracker/commit/299cdf15cce10aec38df036a3f2a8c2defb53ded))
* add SPAObserver with MutationObserver and history patching ([f6ba155](https://github.com/absmartly/dom-tracker/commit/f6ba1553ea8ce72307bda91c5208d1f287dc5f81))
* add time on page tracker with visibility pause ([878146b](https://github.com/absmartly/dom-tracker/commit/878146b731c08433408b3a6d19b7727475018636))
* add webpack build configuration ([6f6dee3](https://github.com/absmartly/dom-tracker/commit/6f6dee3de2ee4c6d4781396dadb1faaac95c6e68))
* emit all matching rules instead of only the first ([a96686d](https://github.com/absmartly/dom-tracker/commit/a96686dce970cb0bf7c8fe55058d16b8735d53a6))


### Bug Fixes

* add release-please config files ([42816cf](https://github.com/absmartly/dom-tracker/commit/42816cfe9e29a7076ae2e6548915c4ec12ca250e))
* auto-bump version from conventional commits before publishing ([a494ea6](https://github.com/absmartly/dom-tracker/commit/a494ea62d2fe8798d99563632abe0a30d3cd33e2))
* listen on pointerdown+click with per-element dedupe for React SPAs ([c2c9400](https://github.com/absmartly/dom-tracker/commit/c2c9400e64ed6f71200643695b4709aea08b5e8b))
* use event delegation in RuleEngine for SPA compatibility ([18e8e4f](https://github.com/absmartly/dom-tracker/commit/18e8e4fd72046c33f35603221d2445e7b0c1cd54))
* use release-please for versioning and npm trusted publishing ([fb98a9c](https://github.com/absmartly/dom-tracker/commit/fb98a9c4ec795a22be63db01a4908bfe316bd697))
* use window-level capture listeners for React SPA compatibility ([48dc4e0](https://github.com/absmartly/dom-tracker/commit/48dc4e05418d6349e7b615f283f441dba487a077))
