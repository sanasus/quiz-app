/**
 * Test harness shared by every server test that boots a full module.
 *
 * A prefix and any other global wiring used to be copy-pasted into each
 * test file: a change in main.ts would not fail the tests, it would
 * just leave them exercising different wiring than production. Routing
 * it through the same helper main.ts uses means a drift breaks tests.
 *
 * Test-only — excluded from the production build by the `test-` glob in
 * tsconfig.build.json.
 */

import type { INestApplication } from '@nestjs/common'
import type { TestingModule } from '@nestjs/testing'
import { configureHttp } from './http-bootstrap'

/** Boot a compiled module the way main.ts does. */
export async function createTestApp(
  moduleRef: TestingModule,
): Promise<INestApplication> {
  const app = moduleRef.createNestApplication()
  configureHttp(app)
  await app.init()
  return app
}
