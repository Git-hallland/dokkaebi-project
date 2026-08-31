-- Historical Azure PostgreSQL setup SQL preserved from VS Code Untitled-4.
-- Do not execute without reviewing the current database state.

REVOKE CONNECT ON DATABASE dokkaebi_dev FROM PUBLIC;

GRANT CONNECT ON DATABASE dokkaebi_dev
TO dokkaebi_migrator, dokkaebi_app;

REVOKE CREATE ON SCHEMA public FROM PUBLIC;

GRANT USAGE, CREATE ON SCHEMA public
TO dokkaebi_migrator;

GRANT USAGE ON SCHEMA public
TO dokkaebi_app;
