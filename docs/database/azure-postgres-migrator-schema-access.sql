-- Historical Azure PostgreSQL setup SQL preserved from VS Code Untitled-3.
-- Do not execute without reviewing the current database state.
-- This content is also present as a subset of Untitled-4.

REVOKE CREATE ON SCHEMA public FROM PUBLIC;

GRANT USAGE, CREATE ON SCHEMA public
TO dokkaebi_migrator;
