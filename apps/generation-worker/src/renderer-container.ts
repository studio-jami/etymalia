import { Container } from "@cloudflare/containers";

/**
 * Private, single-job renderer host. Its HTTP surface is reachable only through
 * the Worker Durable Object binding; it is never a public application route.
 */
export class RendererContainer extends Container {
  defaultPort = 8080;
  sleepAfter = "30s";
}
