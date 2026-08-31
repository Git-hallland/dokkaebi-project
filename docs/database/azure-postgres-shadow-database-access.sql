-- Historical Azure PostgreSQL setup SQL preserved from VS Code Untitled-2.
-- Do not execute without reviewing the current database state.

ALTER DATABASE dokkaebi_shadow
OWNER TO dokkaebi_migrator;

REVOKE CONNECT ON DATABASE dokkaebi_shadow FROM PUBLIC;

GRANT CONNECT ON DATABASE dokkaebi_shadow
TO dokkaebi_migrator;
