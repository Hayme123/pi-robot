# SQL schema

_Last inspected: 2026-07-28_

## Connection

The PostgreSQL 17.6 database is configured through `DATABASE_URL` in the local `.env`. The connection uses Supabase's transaction pooler with TLS. Credentials are intentionally omitted from this document.

## Application schema (`public`)

The `public` schema is currently empty:

- No tables or views
- No functions
- No custom enum or domain types
- No relationships or row-level security policies

There is therefore no application ER diagram yet.

## Supabase-managed schemas

These schemas belong to Supabase services and should normally be changed only through Supabase APIs or migrations supplied by Supabase.

### `auth`

Authentication and authorization data:

- `audit_log_entries`
- `custom_oauth_providers`
- `flow_state`
- `identities`
- `instances`
- `mfa_amr_claims`
- `mfa_challenges`
- `mfa_factors`
- `oauth_authorizations`
- `oauth_client_states`
- `oauth_clients`
- `oauth_consents`
- `one_time_tokens`
- `refresh_tokens`
- `saml_providers`
- `saml_relay_states`
- `schema_migrations`
- `sessions`
- `sso_domains`
- `sso_providers`
- `users`
- `webauthn_challenges`
- `webauthn_credentials`

### `storage`

Supabase Storage metadata:

- `buckets`
- `buckets_analytics`
- `buckets_vectors`
- `migrations`
- `objects`
- `s3_multipart_uploads`
- `s3_multipart_uploads_parts`
- `vector_indexes`

### `realtime`

Supabase Realtime infrastructure:

- `messages` (partitioned table)
- `schema_migrations`
- `subscription`

### `vault`

Encrypted secret storage:

- `secrets`
- `decrypted_secrets` (view)

### Other managed schemas

- `extensions` — extension objects and PostgreSQL statistics views
- `graphql` — GraphQL engine internals
- `graphql_public` — public GraphQL API functions

## Installed extensions

| Extension | Version | Schema |
| --- | --- | --- |
| `pg_stat_statements` | 1.11 | `extensions` |
| `pgcrypto` | 1.3 | `extensions` |
| `plpgsql` | 1.0 | `pg_catalog` |
| `supabase_vault` | 0.3.1 | `vault` |
| `uuid-ossp` | 1.1 | `extensions` |

## Maintenance

Update this document whenever an application migration changes the `public` schema. Do not commit the `.env` file or embed the database password in schema documentation.
