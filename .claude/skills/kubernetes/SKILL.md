---
name: kubernetes
description: >-
  Deep Kubernetes guidance for the AI Opportunity Intelligence Platform's AWS/EKS scale path (infra/
  kubernetes). Use when authoring Deployments/HPA/NetworkPolicies/probes/PodSecurity, wiring secrets
  and autoscaling for the api + worker services, or planning the migration from Fly.io to EKS. This is
  the documented scale target — not the MVP host — so favor correctness + safety over cleverness.
---

# Kubernetes (scale path)

The MVP runs on Vercel (web) + Fly.io (services). **Kubernetes is the documented scale target** on AWS
EKS (ADR-0001/INFRASTRUCTURE): stateless `api` + workers (`ingestion`, `scheduler`, `ai-service`,
`notification`) with managed Postgres/Redis (RDS/ElastiCache) outside the cluster. Manifests live in
`infra/kubernetes`. Prioritize resource limits, autoscaling, network isolation, and safe rollouts. See
[INFRASTRUCTURE](../../../docs/06-infra/INFRASTRUCTURE.md), `devops`, `docker`, `security`.

## When to apply

- Writing/reviewing Deployments, HPAs, NetworkPolicies, probes, or PodSecurity for a service.
- Wiring secrets/config, autoscaling, or ingress. Planning/executing the Fly→EKS migration.

## Rule categories by priority

| Priority | Category | Why |
|---|---|---|
| **CRITICAL** | Resource requests/limits | No limits = noisy-neighbor + OOM cascades. |
| **CRITICAL** | Probes | Wrong/absent probes route traffic to dead pods or kill healthy ones. |
| **CRITICAL** | Secrets & PodSecurity | Plaintext secrets / privileged pods = breach. |
| **HIGH** | NetworkPolicy (deny-default) | Flat networking lets a compromise move laterally. |
| **HIGH** | Autoscaling (HPA/KEDA) | Ingestion/scoring are spiky; scale on load/queue depth. |
| **HIGH** | Safe rollout | Rolling updates + PDB; no dropped requests. |
| **MEDIUM** | Config/secret hygiene | External secrets, not committed manifests. |
| **MEDIUM** | Observability | Metrics/logs/traces from every pod. |

## Quick reference — the rules

### 1. Requests/limits (CRITICAL)
- Set CPU/memory **requests and limits** on every container (right-sized from real usage). Prevents
  noisy neighbors and gives the scheduler what it needs.

### 2. Probes (CRITICAL)
- `readinessProbe` → `/ready` (checks deps like DB/Redis) gates traffic; `livenessProbe` → `/health`
  restarts a hung pod; `startupProbe` for slow starts. Don't point liveness at a dependency check
  (a DB blip shouldn't kill all pods).

### 3. Secrets & PodSecurity (CRITICAL)
- Secrets via External Secrets Operator / AWS Secrets Manager (or sealed-secrets) — never plaintext in
  git. `runAsNonRoot`, drop all caps, read-only root FS, `seccompProfile: RuntimeDefault`; enforce the
  `restricted` Pod Security Standard.

### 4. NetworkPolicy (HIGH)
- Default-deny ingress/egress; allow only needed flows (api ← ingress; workers → RDS/ElastiCache/LiteLLM;
  egress to model providers). Isolate namespaces.

### 5. Autoscaling (HIGH)
- HPA on CPU/memory for `api`; **KEDA** (or custom metric) on **queue depth** for workers (ingestion/
  scoring spikes). Scale workers toward zero when idle. Cluster Autoscaler/Karpenter for nodes.

### 6. Safe rollout (HIGH)
- RollingUpdate with sane surge/unavailable; `PodDisruptionBudget` to keep minimum replicas; graceful
  SIGTERM + `terminationGracePeriod` so in-flight requests/jobs drain. Roll back on failed health.

### 7. Config & observability (MEDIUM)
- ConfigMaps for non-secret config; env from secrets. OTel sidecar/agent; ship logs; expose metrics.
  Resource quotas + limit ranges per namespace.

## Patterns — good vs bad

**Deployment with probes, limits, non-root:**
```yaml
# ✅ GOOD (sketch)
spec:
  template:
    spec:
      securityContext: { runAsNonRoot: true, seccompProfile: { type: RuntimeDefault } }
      containers:
        - name: api
          image: <registry>/aioi-api@sha256:...        # pinned by digest
          resources:
            requests: { cpu: "100m", memory: "256Mi" }
            limits:   { cpu: "500m", memory: "512Mi" }
          readinessProbe: { httpGet: { path: /ready,  port: 3001 }, periodSeconds: 10 }
          livenessProbe:  { httpGet: { path: /health, port: 3001 }, periodSeconds: 15 }
          securityContext: { allowPrivilegeEscalation: false, readOnlyRootFilesystem: true, capabilities: { drop: ["ALL"] } }
```

**Scale workers on queue depth (KEDA):**
```yaml
# ✅ GOOD — ingestion/scoring scale with backlog, to zero when idle
kind: ScaledObject
spec:
  scaleTargetRef: { name: ingestion-worker }
  minReplicaCount: 0
  maxReplicaCount: 20
  triggers:
    - type: redis
      metadata: { listName: "bull:ingest:wait", listLength: "50" }
```

```yaml
# ❌ BAD — no limits, no probes, root, static replicas, liveness on the DB
containers: [{ name: api, image: aioi-api:latest }]   # OOM, no autoscale, DB blip kills pods
```

## Step-by-step: add a service to the cluster

1. Containerize per the `docker` skill (non-root, digest-pinned).
2. Deployment with requests/limits, readiness `/ready` + liveness `/health` + startup probe, non-root
   securityContext, RollingUpdate + PDB.
3. Secrets via External Secrets; ConfigMap for config.
4. HPA (api) / KEDA on queue depth (workers); node autoscaling.
5. Default-deny NetworkPolicy + only-needed flows.
6. Verify: rollout drains gracefully, scales on load, isolated networking, metrics/logs flowing.

## Decision guide

| Need | Do | Don't |
|---|---|---|
| Scale api | HPA on CPU/mem | fixed replicas |
| Scale workers | KEDA on queue depth (min 0) | scale on CPU only |
| Stateful data | managed RDS/ElastiCache | run Postgres/Redis in-cluster |
| Secrets | External Secrets / Secrets Manager | plaintext in manifests |
| Liveness check | `/health` (self only) | `/ready` (deps) → cascade restarts |

## Failure modes → fixes

| Symptom | Cause | Fix |
|---|---|---|
| OOMKills / noisy neighbor | no limits | set right-sized requests/limits |
| Mass restarts on DB blip | liveness checks a dependency | liveness = self `/health`; deps in readiness |
| Traffic to dead pods | no/mis-set readiness | readiness `/ready` gates traffic |
| Lateral movement risk | flat networking | default-deny NetworkPolicy |
| Backlog never clears | no worker autoscale | KEDA on queue depth |
| Dropped requests on deploy | no graceful drain/PDB | SIGTERM + grace + PDB + RollingUpdate |

## Pre-delivery checklist

- [ ] Requests + limits on every container (right-sized)
- [ ] readiness `/ready` (deps) + liveness `/health` (self) + startup probe
- [ ] Non-root, drop caps, read-only FS, seccomp; `restricted` PodSecurity
- [ ] Secrets via External Secrets/Secrets Manager (not in git); ConfigMap for config
- [ ] Default-deny NetworkPolicy; only required flows
- [ ] HPA (api) + KEDA/queue-depth (workers, min 0); node autoscaling
- [ ] RollingUpdate + PDB + graceful SIGTERM drain; rollback on failed health
- [ ] Metrics/logs/traces from pods; resource quotas; INFRA docs + CHANGELOG

## References
[INFRASTRUCTURE](../../../docs/06-infra/INFRASTRUCTURE.md) · [ADR-0001](../../../docs/adr/ADR-0001-core-stack.md) · skills: `docker`, `devops`, `queues`, `security`, `performance`.
