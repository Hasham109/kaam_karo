/** Converts masked JSON (platform) to Prisma JSON input; `null` → SQL NULL (T2.2). */
import type { MaskedJson } from '@kaamkaro/platform';
import { Prisma } from '../generated/prisma/client.js';

export function toDbJson(value: MaskedJson | null): Prisma.InputJsonValue | typeof Prisma.DbNull {
  return value === null ? Prisma.DbNull : (value as Prisma.InputJsonValue);
}
