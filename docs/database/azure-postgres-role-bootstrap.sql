-- Historical Azure PostgreSQL setup SQL preserved from VS Code Untitled-1.
-- Do not execute without reviewing the current database state.
-- The original editor contains real passwords; they are intentionally replaced here.

CREATE ROLE dokkaebi_migrator
WITH LOGIN
PASSWORD '<REDACTED>';

CREATE ROLE dokkaebi_app
WITH LOGIN
PASSWORD '<REDACTED>';

GRANT CONNECT ON DATABASE dokkaebi_dev TO dokkaebi_migrator;
GRANT CONNECT ON DATABASE dokkaebi_dev TO dokkaebi_app;
