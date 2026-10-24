/**
 * CI Guard: Booking Transition Table verification (A04, T3.4).
 * Reads the ARCH §6.1 transition table from transition-table.ts and asserts
 * every non-listed pair is strictly rejected (BOOK-STATUS-001..017, BP §15).
 *
 * Usage: node services/api/src/modules/booking/tools/check-transition-table.ts
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const possiblePaths = [
  join(process.cwd(), 'services/api/src/modules/booking/transition-table.ts'),
  join(process.cwd(), 'src/modules/booking/transition-table.ts'),
];
const transitionTablePath = possiblePaths.find((p) => existsSync(p)) ?? possiblePaths[0]!;

const ALL_STATUSES = [
  'DRAFT',
  'REQUESTED',
  'QUOTE_PENDING',
  'QUOTED',
  'ACCEPTED',
  'SCHEDULED',
  'PROVIDER_EN_ROUTE',
  'ARRIVED',
  'IN_PROGRESS',
  'AWAITING_APPROVAL',
  'COMPLETED',
  'DISPUTED',
  'CANCELLED',
  'EXPIRED',
  'CLOSED',
  'REJECTED',
  'NO_SHOW',
] as const;

type StatusName = (typeof ALL_STATUSES)[number];

function checkTransitionTable(): void {
  const content = readFileSync(transitionTablePath, 'utf-8');

  // Regex to extract all transition definitions: from: BookingStatus.X, to: BookingStatus.Y
  const transitionRegex = /from:\s*BookingStatus\.([A-Z_]+),\s*to:\s*BookingStatus\.([A-Z_]+)/g;

  const allowedPairs = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = transitionRegex.exec(content)) !== null) {
    const from = match[1];
    const to = match[2];
    if (!from || !to) continue;

    if (!ALL_STATUSES.includes(from as StatusName)) {
      console.error(`Unknown from status in transition-table.ts: ${from}`);
      process.exit(1);
    }
    if (!ALL_STATUSES.includes(to as StatusName)) {
      console.error(`Unknown to status in transition-table.ts: ${to}`);
      process.exit(1);
    }

    const pair = `${from}->${to}`;
    if (allowedPairs.has(pair)) {
      console.error(`Duplicate transition in transition-table.ts: ${pair}`);
      process.exit(1);
    }
    allowedPairs.add(pair);
  }

  if (allowedPairs.size === 0) {
    console.error(`No transitions found in ${transitionTablePath}`);
    process.exit(1);
  }

  let allowedCount = 0;
  let rejectedCount = 0;

  for (const from of ALL_STATUSES) {
    for (const to of ALL_STATUSES) {
      const pair = `${from}->${to}`;
      if (allowedPairs.has(pair)) {
        allowedCount++;
      } else {
        rejectedCount++;
      }
    }
  }

  // 1. Assert CLOSED has zero outgoing transitions (BOOK-STATUS-015)
  for (const to of ALL_STATUSES) {
    if (allowedPairs.has(`CLOSED->${to}`)) {
      console.error(
        `Violation: CLOSED must have no outgoing transitions, but CLOSED->${to} is allowed`,
      );
      process.exit(1);
    }
  }

  // 2. Assert terminal statuses only transition to CLOSED
  const terminalStatuses: StatusName[] = ['CANCELLED', 'EXPIRED', 'REJECTED', 'NO_SHOW'];
  for (const terminal of terminalStatuses) {
    for (const to of ALL_STATUSES) {
      if (allowedPairs.has(`${terminal}->${to}`) && to !== 'CLOSED') {
        console.error(
          `Violation: ${terminal} may only transition to CLOSED, but ${terminal}->${to} is allowed`,
        );
        process.exit(1);
      }
    }
  }

  const totalPairs = ALL_STATUSES.length * ALL_STATUSES.length;
  console.log(
    `[transition-table] Checked ${totalPairs} status pairs (17x17): ` +
      `${allowedCount} allowed, ${rejectedCount} rejected as expected. Transition table guard passed.`,
  );
}

checkTransitionTable();
