import { Controller, Get } from '@nestjs/common'
import { SkipThrottle } from '@nestjs/throttler'

/**
 * Liveness probe. Deliberately outside the `api` global prefix: the
 * frontend only ever talks to /api/*, and the proxy in vite.config.ts
 * forwards that prefix alone.
 *
 * Also deliberately unthrottled: a CI or deploy health loop shares the
 * proxy's IP with the app itself, so a throttled probe would read as an
 * outage while the proxy is perfectly healthy.
 */
@SkipThrottle()
@Controller()
export class HealthController {
  @Get('health')
  check(): { status: 'ok'; uptime: number } {
    return { status: 'ok', uptime: process.uptime() }
  }
}
