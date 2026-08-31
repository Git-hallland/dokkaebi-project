# Azure PostgreSQL Current State

Checked and updated on: 2026-09-01 (Asia/Seoul)

This document records the current Azure Database for PostgreSQL state after application-role password alignment and the reviewed initial Prisma migration. The migration was created with `--create-only`, reviewed for destructive and unrelated SQL, and then applied with `prisma migrate deploy`. Post-application inspection connections ran inside `BEGIN READ ONLY` transactions and ended with `ROLLBACK`.

No password, connection string, token, or other secret is included here.

## Connection

- Azure server: `dokkaebi-postgres-dev.postgres.database.azure.com`
- Existing VS Code profile: `dokkaebi-postgres-dev-admin`
- PostgreSQL extension: `ms-ossdata.vscode-pgsql` 1.28.0
- Profile database: `postgres`
- Profile user: `rlgus2538`
- SSL mode: `require`
- Profile status: present; password is not saved by the profile (`savePassword: false`)
- Inspection result: successful
- Actual `current_user`: `rlgus2538`
- Initial `current_database`: `postgres`
- Development-database verification: `current_database = dokkaebi_dev`
- PostgreSQL server version: 18.4
- Application-role credential verification: all three configured connections succeed
- Applied migration: `20260831143710_init`

The inspection used the same host, user, database, SSL setting, and user-entered administrator password as the existing VS Code profile. The query runner used the local `pg` driver because the extension profile does not expose a non-interactive query interface. The password was entered through a masked prompt and was not saved or printed.

## Preserved VS Code SQL

Five unsaved SQL editors were found and preserved as separate historical records:

| Editor | Purpose | Complete | Relationship | Write risk | Preserved file |
| --- | --- | --- | --- | --- | --- |
| `Untitled-1` | Create the migrator and app login roles and grant development DB access | Syntactically complete | Role bootstrap | High: `CREATE ROLE`, password literals, `GRANT` | `azure-postgres-role-bootstrap.sql` |
| `Untitled-2` | Assign the shadow DB owner and restrict/grant shadow access | Syntactically complete | Shadow DB setup | High: `ALTER DATABASE`, `REVOKE`, `GRANT` | `azure-postgres-shadow-database-access.sql` |
| `Untitled-3` | Restrict public schema creation and grant migrator schema access | Syntactically complete | Subset of `Untitled-4` | High: `REVOKE`, `GRANT` | `azure-postgres-migrator-schema-access.sql` |
| `Untitled-4` | Restrict public development DB/schema access and grant role-specific access | Syntactically complete | Superset of `Untitled-3` | High: `REVOKE`, `GRANT` | `azure-postgres-database-and-schema-access.sql` |
| `Untitled-5` | Grant future table and sequence privileges to the runtime role | Syntactically complete | Default privileges | High: `ALTER DEFAULT PRIVILEGES` | `azure-postgres-default-privileges.sql` |

`Untitled-1` contained real role passwords. Only those values were replaced with `<REDACTED>` in the repository copy. The original editor was left open and restored after an accidental terminal-command paste was undone. The other four editors contained no detected secret. The saved SQL files contain no actual password, URL, OAuth secret, API key, or token, and none was executed during this inspection.

The open editor inventory also contained `.env` and `prisma.config.ts`. No dirty-file backup for `.env` was present, and `.env` was neither read for values nor modified or saved by this inspection.

## Databases

| Database | Exists | Owner |
| --- | --- | --- |
| `dokkaebi_dev` | Yes | `rlgus2538` |
| `dokkaebi_shadow` | Yes | `dokkaebi_migrator` |

## Roles

| Role | Exists | LOGIN | SUPERUSER | CREATEDB | CREATEROLE | Assessment |
| --- | --- | --- | --- | --- | --- | --- |
| `dokkaebi_migrator` | Yes | Yes | No | No | No | Matches the intended least-privilege policy |
| `dokkaebi_app` | Yes | Yes | No | No | No | Matches the intended least-privilege policy |

Neither application role has a dangerous cluster-level privilege.

## Database privileges

| Role | Database | CONNECT |
| --- | --- | --- |
| `dokkaebi_migrator` | `dokkaebi_dev` | Yes |
| `dokkaebi_migrator` | `dokkaebi_shadow` | Yes |
| `dokkaebi_app` | `dokkaebi_dev` | Yes |
| `dokkaebi_app` | `dokkaebi_shadow` | No |

This matches the intended separation: the migration role can use both development and shadow databases; the runtime app role can use only the development database.

## Schema privileges

Privileges on `dokkaebi_dev.public`:

| Role | USAGE | CREATE |
| --- | --- | --- |
| `dokkaebi_migrator` | Yes | Yes |
| `dokkaebi_app` | Yes | No |

The observed values exactly match the intended schema policy.

## Default privileges

Default ACL entries owned by `dokkaebi_migrator` in schema `public` grant `dokkaebi_app`:

- Future tables (`r`): `SELECT`, `INSERT`, `UPDATE`, `DELETE`
- Future sequences (`S`): `USAGE`, `SELECT`
- Grant option: no

These entries exactly match `azure-postgres-default-privileges.sql`.

## PUBLIC default privileges

- `PUBLIC` does not have `CONNECT` on `dokkaebi_dev`.
- `PUBLIC` does not have `CONNECT` on `dokkaebi_shadow`.
- `PUBLIC` retains `TEMPORARY` on both databases.
- `PUBLIC` does not have `CREATE` on `dokkaebi_dev.public`.
- `PUBLIC` retains `USAGE` on `dokkaebi_dev.public`.

The two explicitly intended restrictions—removing database `CONNECT` and schema `CREATE`—are applied. The retained `TEMPORARY` and schema `USAGE` privileges were not targets of the historical SQL.

## Current tables

`dokkaebi_dev.public` contains the complete initial schema:

- Prisma history: `_prisma_migrations`
- Better Auth physical tables: `user`, `account`, `session`, `verification`
- Content-domain tables: `Content`, `Claim`, `Source`, `ContentSource`, `ClaimSource`, `ContentRevision`, `Report`

The Better Auth Prisma model names are `User`, `Account`, `Session`, and `Verification`; `@@map` maps them to the lower-case physical table names above.

## Prisma migration history

- `_prisma_migrations` exists: yes
- Repository migration: `prisma/migrations/20260831143710_init/migration.sql`
- Applied migration: `20260831143710_init`
- `finished_at`: recorded
- `rolled_back_at`: null
- `prisma migrate status`: database schema is up to date after the runtime-role privilege correction

## Current table privileges

`dokkaebi_app` has `SELECT`, `INSERT`, `UPDATE`, and `DELETE` on all eleven application tables. A read-only runtime smoke test against `user` succeeded after the privilege correction.

The previously inherited `SELECT`, `INSERT`, `UPDATE`, and `DELETE` privileges on `_prisma_migrations` were revoked from `dokkaebi_app`. The runtime role now has no table privilege on Prisma migration history. The migrator can still read migration history, and `prisma migrate status` reports the database schema as up to date.

There are currently no sequences, so no current sequence ACL exists to inspect. The future-sequence default privileges remain configured.

## Better Auth tables

The physical tables `user`, `account`, `session`, and `verification` exist. Each contained zero rows immediately after migration. The runtime role can select from them, and no test data was inserted.

## 28P01 resolution

The prior `28P01` failures are resolved. The two application-role passwords were aligned with the user-maintained local `.env` values without printing or storing plaintext credentials in the repository.

Verified identities:

- `DATABASE_URL`: `dokkaebi_migrator` / `dokkaebi_dev`
- `SHADOW_DATABASE_URL`: `dokkaebi_migrator` / `dokkaebi_shadow`
- `APP_DATABASE_URL`: `dokkaebi_app` / `dokkaebi_dev`

## Previous setup completion checklist

| Item | Status | Evidence |
| --- | --- | --- |
| Azure PostgreSQL server | ✅ Complete | Administrator connection succeeded |
| VS Code administrator profile | ✅ Complete | `dokkaebi-postgres-dev-admin` exists |
| Administrator connection | ✅ Complete | `rlgus2538` connected to `postgres` and `dokkaebi_dev` |
| `dokkaebi_dev` | ✅ Complete | Database exists |
| `dokkaebi_shadow` | ✅ Complete | Database exists; owner is `dokkaebi_migrator` |
| `dokkaebi_migrator` | ✅ Complete | Role exists |
| `dokkaebi_app` | ✅ Complete | Role exists |
| Role LOGIN policy | ✅ Complete | Both roles can log in |
| Dangerous role flags disabled | ✅ Complete | Neither role is superuser and neither can create DBs or roles |
| Database CONNECT policy | ✅ Complete | Migrator: dev/shadow; app: dev only |
| Schema USAGE policy | ✅ Complete | Both roles have `USAGE` |
| Schema CREATE policy | ✅ Complete | Migrator yes; app no |
| PUBLIC database CONNECT removal | ✅ Complete | No PUBLIC `CONNECT` ACL on dev or shadow |
| PUBLIC schema CREATE removal | ✅ Complete | PUBLIC has no `CREATE` on `public` |
| Default table privileges | ✅ Complete | Intended four DML privileges are present |
| Default sequence privileges | ✅ Complete | Intended `USAGE` and `SELECT` are present |
| Existing Prisma tables | ✅ Complete | All eleven application tables exist |
| `_prisma_migrations` | ✅ Complete | Initial migration is recorded and finished |
| Better Auth tables | ✅ Complete | All four tables exist and are empty |
| Runtime app table permissions | ✅ Complete | Required DML works on all eleven application tables; `_prisma_migrations` has no app-role privilege |
| Application-role password alignment | ✅ Complete | All three configured connections succeed with expected identities |

## Notes

The current `ALTER DEFAULT PRIVILEGES` policy grants `dokkaebi_app` DML privileges on every future table created by `dokkaebi_migrator` in `public`. Any future audit, admin, migration-history, or other internal-only table therefore requires a separate least-privilege review and, when appropriate, an explicit revoke.

Better Auth 1.7.2 is configured with `encryptOAuthTokens: true`. Its installed implementation encrypts `accessToken` and `refreshToken` before account persistence, but writes `idToken` without that encryption path. No custom token hook was added in Step 1.

## Next safe action

Commit the reviewed Step 1 authentication and database changes when ready. The real Better Auth base URL, secret, and OAuth credentials must still be configured outside Git before deployment. The production build succeeds with process-only build placeholders, but the local `.env` currently does not provide all six required auth variables. Never commit those values.
