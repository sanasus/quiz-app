/**
 * QuizModule — the two proxy endpoints plus their upstream wiring.
 *
 * ProviderRegistry is created once from env (QUIZAPI_KEY, optional
 * base-URL overrides for tests); CatalogCacheService holds the ~1h
 * per-provider catalog cache. The UpstreamErrorFilter is bound globally
 * in AppModule via APP_FILTER — it only @Catch(UpstreamError), so health
 * endpoints (which never throw one) keep plain Nest errors.
 */

import { Module } from '@nestjs/common'
import type { Provider } from '@nestjs/common'
import { QuizController } from './quiz.controller'
import { QuizService } from './quiz.service'
import { CatalogCacheService } from './catalog-cache.service'
import {
  ProviderRegistry,
  type ProviderRegistryOptions,
} from './providers/provider-registry'

/** Env-driven registry config; overridable so tests can point at fixtures. */
export function registryOptionsFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): ProviderRegistryOptions {
  const timeout = Number(env.UPSTREAM_TIMEOUT_MS)
  return {
    quizApiKey: env.QUIZAPI_KEY,
    quizApiBaseUrl: env.QUIZAPI_BASE_URL,
    triviaBaseUrl: env.TRIVIA_BASE_URL,
    // Guard against absent / non-numeric env so a bad value never
    // disables the abort deadline (0 or NaN would hang forever).
    upstreamTimeoutMs:
      Number.isFinite(timeout) && timeout > 0 ? timeout : undefined,
  }
}

/**
 * Registry provider. `useFactory` keeps a single instance per app and
 * lets the e2e harness swap base URLs without rebuilding the module.
 */
function registryProvider(
  options?: ProviderRegistryOptions,
): Provider<ProviderRegistry> {
  return {
    provide: ProviderRegistry,
    useFactory: () => new ProviderRegistry(options ?? registryOptionsFromEnv()),
  }
}

@Module({
  controllers: [QuizController],
  providers: [registryProvider(), QuizService, CatalogCacheService],
})
export class QuizModule {}
