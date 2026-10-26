# Upstream sync and dependency upgrade plan

**Goal:** Sync upstream/main through origin/main into origin/staging, verify GHCR publication, then upgrade the complete dependency surface and verify the resulting application.

**Architecture:** Keep main tracking upstream. Maintain fork configuration and upgrades on staging. Build the application from the checked-out source so dependency changes reach published images.

**Scope:** All current npm workspace dependencies and overrides, Java dependencies/plugins, runtime/container dependencies, and GitHub Actions. Historical hotfix artifacts retain their release-specific meaning. Preserve untracked deno.lock and local data; no deployment or database migration on existing volumes.

- [x] Fetch upstream, fast-forward main and push; merge main into staging, resolve Compose configuration, and push.
- [x] Verify synced staging GHCR job succeeds, fixing build failures as needed.
- [x] Inventory registry latest versions, patches, runtime constraints, and source-build path.
- [x] Upgrade dependencies and adapt incompatible backend/frontend APIs; regenerate lockfile and retain necessary security patches.
- [x] Upgrade workflow actions and build the checked-out source into the published image.
- [x] Verify immutable install, service tests, production frontend/Pug builds, Java tests, and disposable image startup. Type-check/full-suite limitations are recorded in dependency-upgrade-notes.md.
- [ ] Push upgrades to staging and verify the exact commit's GHCR jobs and published image.

**Review focus:** Patched dependencies must preserve security fixes; package overrides must agree with declarations; frontend editor/PDF behavior must survive major upgrades; backend routing/session/database semantics must be covered by tests; image publication must include this checkout and retain TeX extras.
