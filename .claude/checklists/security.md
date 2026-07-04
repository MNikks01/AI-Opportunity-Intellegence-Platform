# Checklist — Security

- [ ] Input validated (Zod); output encoded
- [ ] RBAC + tenant guard on every route; deny by default
- [ ] Secrets via manager; none in code/logs; gitleaks clean
- [ ] Webhooks verified; rate limits set; secure headers/CORS
- [ ] Audit log on mutations; threat model updated
