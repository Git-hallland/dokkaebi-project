-- Historical Azure PostgreSQL setup SQL preserved from VS Code Untitled-5.
-- Do not execute without reviewing the current database state.

ALTER DEFAULT PRIVILEGES
FOR ROLE dokkaebi_migrator
IN SCHEMA public
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES
TO dokkaebi_app;

ALTER DEFAULT PRIVILEGES
FOR ROLE dokkaebi_migrator
IN SCHEMA public
GRANT USAGE, SELECT ON SEQUENCES
TO dokkaebi_app;
