# Etymalia documentation

The active documentation is intentionally small. Start with the document that answers the question you have; do not use a dated record as current implementation or release evidence.

| Document | Use it for |
| --- | --- |
| [Product](./product.md) | Current source-backed product scope, known gaps, and verification boundaries. |
| [Web platform](./architecture/web-platform.md) | Current application, package, data, and service boundaries. |
| [Generation contract](./architecture/generation-contract.md) | The stable request, job, asset, and export model. |
| [Delivery plan](./plan.md) | **Canonical current work:** ordered delivery package, blockers, and evidence of done. |
| [Roadmap](./roadmap.md) | Product arc and end-state direction beyond the current delivery package. |
| [Web development runbook](./runbooks/web-development.md) | Local setup, migration safety, and environment configuration. |
| [Cloudflare generation preflight](./runbooks/cloudflare-generation.md) | Future runner preconditions, validation, observation, and recovery. |
| [History](./history/README.md) | Dated handoffs, audits, changelogs, and superseded proposals. |
| [References](./references/) | Source material and design proposals; not implementation truth. |

## Documentation rules

- Current product facts belong in `product.md`.
- Current work, sequencing, blockers, and completion evidence belong in `plan.md`.
- The long-range product arc belongs in `roadmap.md`.
- Cross-cutting technical invariants belong in `architecture/`.
- Local procedures belong in `runbooks/`.
- Dated reports and superseded plans belong in `history/`.
- Label claims that cannot be reproduced from source as **requires remote verification**.
- Keep one authoritative home for each decision. Link instead of copying.
