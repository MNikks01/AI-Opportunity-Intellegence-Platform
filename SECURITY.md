# Security Policy

## Reporting a vulnerability

**Do not open a public issue for security vulnerabilities.** Instead, report privately via
[GitHub Security Advisories](https://github.com/MNikks01/AI-Opportunity-Intellegence-Platform/security/advisories/new).

We aim to acknowledge reports within 3 business days and provide a remediation timeline after
triage. Please include reproduction steps and impact.

## Scope & practices

This project follows the controls in [docs/07-security/](docs/07-security/) and
[TRD §7](docs/01-product/TECHNICAL_REQUIREMENTS_DOCUMENT.md): OWASP ASVS L2 baseline, RBAC on every
route, encrypted secrets, signed webhooks, audit logging, and secret scanning (gitleaks) in CI.

## Supported versions

The project is pre-`0.1.0`; only the latest `main` is supported during early development.

## Handling secrets

Never commit secrets. Use `.env` (gitignored); `.env.example` documents required keys. Report any
accidental secret exposure immediately so the credential can be rotated.
