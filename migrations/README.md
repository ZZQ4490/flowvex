# Database Migrations

This directory contains SQL migration files for the AI Workflow Platform database.

## Setup

1. Install PostgreSQL (version 14 or higher recommended)
2. Create a database:
   ```bash
   createdb ai_workflow_platform
   ```

3. Set the DATABASE_URL environment variable:
   ```bash
   export DATABASE_URL="postgresql://username:password@localhost/ai_workflow_platform"
   ```

## Running Migrations

Using sqlx-cli:

```bash
# Install sqlx-cli
cargo install sqlx-cli --no-default-features --features postgres

# Run migrations
sqlx migrate run
```

Or manually:

```bash
psql -d ai_workflow_platform -f migrations/001_initial_schema.sql
```

## Migration Files

- `001_initial_schema.sql` - Initial database schema including:
  - Users and authentication
  - Workflows and executions
  - API providers and keys
  - API request logs
  - Integrations
  - Templates
  - Audit logs
  - Roles and permissions

## Schema Overview

### Core Tables

- **users**: User accounts and authentication
- **workflows**: Workflow definitions
- **workflow_executions**: Execution history and state
- **api_providers**: External API provider configurations
- **api_keys**: API keys with rate limiting and load balancing
- **api_request_logs**: Comprehensive API request/response logging
- **integrations**: Third-party service integrations
- **templates**: Workflow templates
- **audit_logs**: Append-only audit trail
- **roles**: Role definitions with permissions
- **user_roles**: User-role mappings

### Key Features

- UUID primary keys for all tables
- Automatic timestamp management with triggers
- Comprehensive indexing for performance
- JSONB columns for flexible configuration storage
- Foreign key constraints for data integrity
- Default roles (admin, developer, viewer, user)
