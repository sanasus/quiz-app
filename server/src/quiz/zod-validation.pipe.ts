/**
 * ZodValidationPipe — validates request query objects against a zod
 * schema and injects the parsed value.
 *
 * A class-validator pipe would duplicate what zod already does here, so
 * the schema (also shared with the e2e fixtures) is used directly. A
 * failed parse becomes a 400 with Nest's standard `message` field —
 * a malformed request is the client's fault, never a provider failure,
 * so it must not wear the upstream error envelope.
 */

import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common'
import type { ZodType } from 'zod'

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodType) {}

  transform(value: unknown): unknown {
    const result = this.schema.safeParse(value)
    if (!result.success) {
      throw new BadRequestException({
        message: result.error.issues.map((issue) => issue.message),
        error: 'Bad Request',
        statusCode: 400,
      })
    }
    return result.data
  }
}
