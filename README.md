# Etymalia

Etymalia is a web-first brand-identity workspace. It helps authenticated users turn a brand brief into etymology-driven name candidates, a contrast-checked token palette, deterministic identity assets, and an exportable brand kit.

The repository is a pnpm/Turborepo workspace centred on the Next.js application in [`apps/web`](./apps/web). Supabase provides authentication, product data, and private asset storage. The former Android prototype has been removed; its source history is preserved under [`docs/history`](./docs/history/README.md).

## Start here

```sh
pnpm install
pnpm check
```

For interactive work, configure `apps/web/.env.local` as described in the [web development runbook](./docs/runbooks/web-development.md), then run:

```sh
pnpm --filter etymalia-web dev
```

## Documentation

- [Documentation map](./docs/README.md)
- [Product: current source-backed state](./docs/product.md)
- [Web platform architecture](./docs/architecture/web-platform.md)
- [Generation contract](./docs/architecture/generation-contract.md)
- **[Delivery plan: current work](./docs/plan.md)**
- [Roadmap: product arc](./docs/roadmap.md)
- [Historical records and superseded proposals](./docs/history/README.md)

Provider and service credentials are server-only. Never expose service-role, provider, OAuth, Trigger, or other private credentials to the browser or repository.
