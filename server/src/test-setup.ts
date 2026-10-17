import 'reflect-metadata'
import { Logger } from '@nestjs/common'

// The proxy logs every request through the access log in
// http-bootstrap.ts; in tests that is one line per supertest call, which
// buries the real failure output. Turn Nest's logger off for the suite —
// no server test asserts on log output (they assert on responses).
Logger.overrideLogger(false)
