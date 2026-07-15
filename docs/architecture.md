# Architecture Notes

SecureTaskOps is intentionally small so reviewers can inspect the complete system quickly.

## Request Flow

1. A client calls `src/server.js` locally or a handler in `api/` on Vercel.
2. The server maps the HTTP method and path to a route handler.
3. Route handlers call domain functions from `src/domain.js`.
4. Domain logic validates input, calculates risk, filters workflow items, or summarizes release readiness.
5. Responses are returned as JSON.

## Domain Boundaries

- HTTP concerns stay in `src/server.js`.
- Business rules stay in `src/domain.js`.
- Sample data stays in `src/sample-data.js`.
- Domain tests exercise the business rules directly.
- HTTP tests exercise route behavior, error envelopes, cache policy and static security headers.

## Future Database Boundary

The current in-memory array can be replaced by a repository layer such as:

```text
routes -> services/domain -> repository -> PostgreSQL
```

That would keep route handlers thin while making persistence testable.
