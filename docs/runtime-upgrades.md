# Runtime upgrades (25 October 2026)

The Compose defaults now use MongoDB 9.0.4 and Redis 8.8.3 on Debian Trixie.
The application image is built from this repository with Node.js 26, Ubuntu
26.04 and TeX Live 2026. Updating these files does not upgrade running services.

## Existing MongoDB 8.0 data

MongoDB supports a direct **8.0 → 9.0** replica-set upgrade; an 8.3 intermediate
is unnecessary. First update every member to the latest 8.0 patch and verify
that the replica set is healthy and its feature compatibility version (FCV)
is `8.0`. Older deployments must follow the successive major-version path to
8.0. Review the [official 8.0 → 9.0 replica-set procedure](https://www.mongodb.com/docs/manual/release-notes/9.0-upgrade-from-8.0-replica-set/)
and [9.0 compatibility changes](https://www.mongodb.com/docs/manual/release-notes/9.0-compatibility/)
before scheduling the operation.

Perform the following manually during an approved maintenance window:

1. Record the running image, replica-set configuration and FCV. On the primary:

   ```javascript
   db.adminCommand({ getParameter: 1, featureCompatibilityVersion: 1 })
   db.adminCommand({ replSetGetStatus: 1 })
   ```

   If necessary, finish the 8.0 upgrade and set its FCV while still running 8.0:

   ```javascript
   db.adminCommand({ setFeatureCompatibilityVersion: '8.0', confirm: true })
   ```

2. Stop application writes. Back up MongoDB, application files and Redis data;
   verify that the backups restore. Make a separate copy of the cleanly stopped
   MongoDB data directory and rehearse the upgrade on that copy with isolated
   containers. Keep the original backup unchanged. Check the application's
   driver compatibility and exercise project editing, history and compilation
   against the rehearsal database.
3. Cleanly stop MongoDB and replace its image with `mongo:9.0.4`. This Compose
   configuration has one replica-set member, so allow downtime. Multi-member
   deployments must follow MongoDB's secondary-first rolling procedure.
   Start MongoDB, check its logs and replica-set state, then start the upgraded
   application and validate its startup migrations and normal operations.
4. Keep FCV at `8.0` during a burn-in period. Only after validation, with no
   initial sync running, enable 9.0 features on the primary:

   ```javascript
   db.adminCommand({ setFeatureCompatibilityVersion: '9.0', confirm: true })
   ```

Changing FCV affects downgrade options. Follow the official downgrade procedure
or restore the verified backup into an isolated 8.0 deployment; do not simply
point an older image at files modified by a newer server. Restoration is a
separate manual operation.

For Redis, stop writers and preserve a verified copy of the existing persistence
files before replacing the image. Rehearse loading those files with
`redis:8.8.3-trixie`, then validate application sessions and background queues.
No Compose deployment, database upgrade or persistent-volume mutation is part
of the dependency-update build.
