/**
 * LLM observability seam (B-007). A provider-agnostic tracing interface with a no-op default and a
 * Langfuse-backed implementation that activates only when `LANGFUSE_PUBLIC_KEY` + `LANGFUSE_SECRET_KEY`
 * are set — so scoring runs, is testable, and stays reproducible with zero keys (matching the
 * adapter+Stub pattern used across `@aioi/*`).
 *
 * Tracing is strictly best-effort: it never blocks or throws into the LLM path. The Langfuse client is
 * imported lazily, so the no-keys path never loads the dependency (keeps the Next.js/RSC bundle lean).
 */

/** OpenAI-compatible token accounting, when the gateway returns it. */
export interface TokenUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

/** A single in-flight model call. `end` is called exactly once (success or error). */
export interface LlmGeneration {
  end(result: { output?: unknown; usage?: TokenUsage; error?: string }): void;
}

export interface Tracer {
  /** True when a real backend is wired (keys present). */
  readonly enabled: boolean;
  /** Open a generation span for one model call. */
  generation(params: {
    name: string;
    model: string;
    input: unknown;
    metadata?: Record<string, unknown>;
  }): LlmGeneration;
  /** Flush buffered events — call at the end of a job/request in serverless. */
  flush(): Promise<void>;
}

const NOOP_GENERATION: LlmGeneration = { end() {} };

/** Default tracer — records nothing. Used whenever Langfuse keys are absent. */
export class NoopTracer implements Tracer {
  readonly enabled = false;
  generation(): LlmGeneration {
    return NOOP_GENERATION;
  }
  async flush(): Promise<void> {}
}

export interface LangfuseConfig {
  publicKey: string;
  secretKey: string;
  baseUrl?: string;
}

/**
 * Langfuse-backed tracer. The client is created on first use via a lazy dynamic import, so a repo with
 * no Langfuse keys never imports the package. Every interaction is wrapped in a catch — a tracing
 * failure must never break an LLM call.
 */
export class LangfuseTracer implements Tracer {
  readonly enabled = true;
  // Typed loosely on purpose: langfuse is an optional peer resolved at runtime.
  private clientPromise: Promise<{
    generation(args: Record<string, unknown>): { end(args: Record<string, unknown>): void };
    flushAsync?(): Promise<unknown>;
  } | null> | null = null;

  constructor(private readonly cfg: LangfuseConfig) {}

  private client() {
    if (!this.clientPromise) {
      this.clientPromise = import("langfuse")
        .then(
          ({ Langfuse }) =>
            new Langfuse({
              publicKey: this.cfg.publicKey,
              secretKey: this.cfg.secretKey,
              baseUrl: this.cfg.baseUrl,
            }) as unknown as Awaited<NonNullable<typeof this.clientPromise>>,
        )
        .catch(() => null);
    }
    return this.clientPromise;
  }

  generation(params: {
    name: string;
    model: string;
    input: unknown;
    metadata?: Record<string, unknown>;
  }): LlmGeneration {
    const startTime = new Date();
    const genPromise = this.client()
      .then((c) =>
        c
          ? c.generation({
              name: params.name,
              model: params.model,
              input: params.input,
              metadata: params.metadata,
              startTime,
            })
          : null,
      )
      .catch(() => null);

    return {
      end: (result) => {
        genPromise
          .then((gen) =>
            gen?.end({
              output: result.output,
              endTime: new Date(),
              level: result.error ? "ERROR" : "DEFAULT",
              statusMessage: result.error,
              usage: result.usage
                ? {
                    promptTokens: result.usage.promptTokens,
                    completionTokens: result.usage.completionTokens,
                    totalTokens: result.usage.totalTokens,
                  }
                : undefined,
            }),
          )
          .catch(() => {});
      },
    };
  }

  async flush(): Promise<void> {
    try {
      const c = await this.client();
      await c?.flushAsync?.();
    } catch {
      /* best-effort */
    }
  }
}

/**
 * Returns a `LangfuseTracer` when both Langfuse keys are set, else a `NoopTracer`. `LANGFUSE_BASE_URL`
 * is optional (defaults to Langfuse cloud / self-host default inside the SDK).
 */
export function getTracer(env: NodeJS.ProcessEnv = process.env): Tracer {
  const publicKey = env.LANGFUSE_PUBLIC_KEY;
  const secretKey = env.LANGFUSE_SECRET_KEY;
  if (publicKey && secretKey) {
    return new LangfuseTracer({ publicKey, secretKey, baseUrl: env.LANGFUSE_BASE_URL });
  }
  return new NoopTracer();
}

/** Pull OpenAI-compatible usage off a chat/completions response body, if present. */
export function usageFrom(data: unknown): TokenUsage | undefined {
  const u = (data as { usage?: Record<string, number> })?.usage;
  if (!u) return undefined;
  return {
    promptTokens: u.prompt_tokens,
    completionTokens: u.completion_tokens,
    totalTokens: u.total_tokens,
  };
}
