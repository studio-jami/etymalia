# Cloudflare generation operations

The isolated staging control-plane foundation is deployed. It does **not** process product generation, access Supabase, or make Cloudflare the active runner. Supabase remains product truth until the adapter work and production gate in the [delivery plan](../plan.md) are complete.

## Recorded staging foundation

- Cloudflare account: `jami-studio` (`c294df364db8742bc02db57c046043ef`)
- Worker: `etymalia-generation-staging`
- Queue: `etymalia-generation-staging`
- Dead-letter queue: `etymalia-generation-staging-dlq`
- Workflow: `etymalia-full-kit-staging`
- First harmless Workflow instance: `-0803cbbe58d1de5c616e45185c7b61f4b7651d6f0dcae00523cf37f1e3348fb4` — completed successfully on 2026-07-15

Production configuration names are committed but production resources must not be deployed until the delivery plan's Cloudflare adapter and verification work is complete.

## Preconditions

Before creating a new environment, production resource, or product-data integration:

1. Authenticate with the intended account using `wrangler login` and confirm it with `wrangler whoami`.
2. Record any changed account, Worker, Queue, Workflow, or environment name in the active [delivery plan](../plan.md).
3. Review the secret boundary: Supabase service credentials stay in secret bindings or the deployment system—never in `wrangler.jsonc`, source, queue messages, logs, browser state, or command arguments.
4. Define a harmless staging request and its expected durable-state evidence before changing the Worker.

Do not proceed when any precondition is unknown.

## Local validation after the Worker package exists

```sh
wrangler types --check
wrangler check startup
wrangler deploy --dry-run --env staging
```

Run Worker tests with local bindings by default. Do not use remote bindings or production data for the harmless staging request.

## Container image publishing

The private renderer image is defined by [`apps/generation-worker/container/Dockerfile`](../../apps/generation-worker/container/Dockerfile). Do not build it locally: local Docker is deliberately out of scope.

The GitHub Actions workflow [`.github/workflows/publish-generation-renderer.yml`](../../.github/workflows/publish-generation-renderer.yml) builds a Linux `amd64` image and pushes it to Cloudflare Registry. The GitHub `staging` environment has a `CLOUDFLARE_API_TOKEN` secret configured on 2026-07-15. Its Cloudflare token is limited to `Workers Containers: Edit` for the `jami-studio` account and expires after 90 days. The workflow publishes the committed staging tag; publish and verify that image before deploying the Container-enabled staging Worker.

The initial image intentionally exposes only an internal `/health` endpoint. It is not a product renderer and has no Supabase credential or public route.

## Deployment and observation

```sh
wrangler containers images list
wrangler deploy --env staging
wrangler tail --env staging
wrangler workflows list
wrangler queues list
```

Use the generated Worker configuration as the authoritative binding list. Record the deployed version, Workflow instance ID, queue name, request/job ID, and outcome with the corresponding release evidence; do not put secret values in that record. GitHub secret verification must be limited to metadata, for example `gh secret list --env staging --repo studio-jami/etymalia`; never print or retrieve a secret value.

## Failure recovery

1. Inspect the product `generation_jobs` record first; it remains the source of truth for user-visible lifecycle state.
2. Inspect the Workflow instance and queue state using Wrangler.
3. Confirm whether individual artifacts reached private Supabase Storage and have matching `assets` records.
4. Replay only the bounded job/request reference after confirming its idempotency key and retry eligibility.
5. For a dead-lettered message, diagnose the safe error classification, correct the underlying fault, then replay through the documented queue procedure.
6. Do not manually upload artifacts or mark jobs complete to bypass the ledger.

## Production verification gate

Cloudflare-backed generation is production-verified only after the six checks in the [delivery plan](../plan.md#6-verify-the-production-path) have recorded evidence.
