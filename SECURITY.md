# Security Policy

SecureTaskOps is a public product demo. Security-sensitive claims are kept intentionally modest.

## Current Security Practices

- Input validation for workflow item creation
- No secrets committed to the repository
- `.env.example` documents expected configuration
- Security-sensitive workflow items are surfaced in the risk model
- Request bodies are limited to 64 KB and malformed JSON receives a bounded validation error
- Static browser responses use a restrictive Content Security Policy
- API responses are non-cacheable and include `nosniff` and no-referrer headers
- Known limitations are documented in the README

## Not Implemented Yet

- Authentication
- Authorization and role-based access
- Persistent audit logs
- Rate limiting
- Production secrets management

## Reporting Issues

If you find an issue, please open a GitHub issue or contact Uzair Waseem through the personal website:

https://uzairwaseem.com
