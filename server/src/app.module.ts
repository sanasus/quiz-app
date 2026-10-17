import { Module } from '@nestjs/common'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { HealthModule } from './health/health.module'
import { QuizModule } from './quiz/quiz.module'
import { UpstreamErrorFilter } from './quiz/http-error.filter'
import { throttleOptions } from './throttle.config'

@Module({
  imports: [
    ThrottlerModule.forRoot(throttleOptions()),
    HealthModule,
    QuizModule,
  ],
  providers: [
    // Bound globally so every endpoint that can throw UpstreamError is
    // converted to the typed envelope. It only catches UpstreamError —
    // anything else still reaches Nest's default 500 handling.
    { provide: APP_FILTER, useClass: UpstreamErrorFilter },
    // Our own throttle answers with Nest's plain 429 body, *not* the
    // provider envelope: the client's policy switches providers off that
    // envelope, and switching cannot fix a limit that is ours. The
    // numbers live in throttle.config.ts.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
