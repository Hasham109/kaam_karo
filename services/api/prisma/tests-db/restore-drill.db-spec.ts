/**
 * Database Restore & DR Verification Spec (T2.7; REL-012, BP §31.2, §31.3, §49).
 *
 * Validates:
 * 1. Consistent logical backup creation with cryptographic SHA-256 checksum.
 * 2. Checksum tampering detection on restore.
 * 3. Restoration into an isolated test database (`kaamkaro_vitest_restore`).
 * 4. Structural & functional integrity: PostGIS extension, base tables, and trigger freeze.
 */
import { execSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { PrismaPg } from '@prisma/adapter-pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { performBackup } from '../../../../infra/scripts/db-backup.ts';
import { performRestore } from '../../../../infra/scripts/db-restore.ts';
import { PrismaClient } from '../../src/generated/prisma/client.js';

const appUrl = process.env['DATABASE_URL'];
const ownerUrl = process.env['MIGRATION_DATABASE_URL'];
if (!appUrl || !ownerUrl) {
  throw new Error('needs DATABASE_URL (API login) and MIGRATION_DATABASE_URL');
}

describe('T2.7 Database Backup & Restore Drill (REL-012, BP §31.3)', () => {
  const container = 'kaamkaro-dev-postgres-1';
  const user = process.env['POSTGRES_USER'] ?? 'kaamkaro';
  const testRestoreDb = 'kaamkaro_vitest_restore';
  const createdFiles: string[] = [];

  beforeAll(() => {
    // Ensure clean state for test restore database
    try {
      execSync(
        `docker exec ${container} psql -U ${user} -d template1 -c "DROP DATABASE IF EXISTS ${testRestoreDb};"`,
        { stdio: 'ignore' },
      );
    } catch {
      // ignore
    }
  });

  afterAll(() => {
    // Clean up temporary database and backup artifacts
    try {
      execSync(
        `docker exec ${container} psql -U ${user} -d template1 -c "DROP DATABASE IF EXISTS ${testRestoreDb};"`,
        { stdio: 'ignore' },
      );
    } catch {
      // ignore
    }

    for (const f of createdFiles) {
      try {
        rmSync(f, { force: true });
      } catch {
        // ignore
      }
    }
  });

  it('performs logical backup and generates valid SHA-256 checksum', () => {
    // Backup the current test database
    const currentDbMatch = ownerUrl.match(/\/([^/?]+)\?/);
    const sourceDb = currentDbMatch ? currentDbMatch[1] : 'kaamkaro_dev';

    const result = performBackup({
      dbName: sourceDb,
      fileName: `test_backup_${Date.now()}.sql`,
    });

    createdFiles.push(result.filePath);
    createdFiles.push(result.checksumPath);

    expect(result.success).toBe(true);
    expect(result.sizeBytes).toBeGreaterThan(1000);
    expect(result.sha256).toMatch(/^[a-f0-9]{64}$/);

    // Verify SHA-256 file format
    const checksumContent = readFileSync(result.checksumPath, 'utf8');
    expect(checksumContent).toContain(result.sha256);
  });

  it('fails restoration when backup file has been tampered with (checksum mismatch)', () => {
    const currentDbMatch = ownerUrl.match(/\/([^/?]+)\?/);
    const sourceDb = currentDbMatch ? currentDbMatch[1] : 'kaamkaro_dev';

    const result = performBackup({
      dbName: sourceDb,
      fileName: `tampered_test_${Date.now()}.sql`,
    });

    createdFiles.push(result.filePath);
    createdFiles.push(result.checksumPath);

    // Tamper with the backup file content
    const originalContent = readFileSync(result.filePath, 'utf8');
    writeFileSync(result.filePath, originalContent + '\n-- MALICIOUS_INJECTION\n', 'utf8');

    // Attempt restore — must throw checksum mismatch
    expect(() => {
      performRestore({
        backupFilePath: result.filePath,
        targetDb: testRestoreDb,
      });
    }).toThrow(/Checksum mismatch/);
  });

  it('successfully restores backup into isolated database and verifies integrity', async () => {
    const currentDbMatch = ownerUrl.match(/\/([^/?]+)\?/);
    const sourceDb = currentDbMatch ? currentDbMatch[1] : 'kaamkaro_dev';

    const backup = performBackup({
      dbName: sourceDb,
      fileName: `valid_restore_test_${Date.now()}.sql`,
    });

    createdFiles.push(backup.filePath);
    createdFiles.push(backup.checksumPath);

    // Restore into isolated test database
    const restore = performRestore({
      backupFilePath: backup.filePath,
      targetDb: testRestoreDb,
    });

    expect(restore.success).toBe(true);
    expect(restore.targetDatabase).toBe(testRestoreDb);

    // Verify PostGIS
    const postgisCheck = execSync(
      `docker exec ${container} psql -U ${user} -d ${testRestoreDb} -t -c "SELECT ST_AsText(ST_MakePoint(74.34, 31.52));"`,
      { encoding: 'utf8' },
    ).trim();
    expect(postgisCheck).toContain('POINT(74.34 31.52)');

    // Verify base table counts (≥ 50 tables)
    const tableCountStr = execSync(
      `docker exec ${container} psql -U ${user} -d ${testRestoreDb} -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';"`,
      { encoding: 'utf8' },
    ).trim();
    const tableCount = parseInt(tableCountStr, 10);
    expect(tableCount).toBeGreaterThanOrEqual(50);

    // Verify trigger kk_location_snapshot_freeze in restored database
    const restoredUrl = ownerUrl.replace(/kaamkaro_[a-zA-Z0-9_-]+/, testRestoreDb);
    const restoredClient = new PrismaClient({
      adapter: new PrismaPg({ connectionString: restoredUrl }),
    });

    try {
      // Find or create a city for FK
      const city =
        (await restoredClient.city.findFirst()) ??
        (await restoredClient.city.create({
          data: {
            nameEn: 'Lahore',
            nameUr: 'لاہور',
            code: 'LHE',
            isListed: true,
            isActive: true,
          },
        }));

      // Create confirmed location snapshot
      const snapshot = await restoredClient.locationSnapshot.create({
        data: {
          addressText: 'Restored Drill Street',
          cityId: city.id,
          source: 'MANUAL_ENTRY',
          confirmationStatus: 'CONFIRMED',
        },
      });

      // Attempting to update a CONFIRMED snapshot must be blocked by the freeze trigger
      await expect(
        restoredClient.locationSnapshot.update({
          where: { id: snapshot.id },
          data: { addressText: 'Tampered After Restore' },
        }),
      ).rejects.toThrow();
    } finally {
      await restoredClient.$disconnect();
    }
  });
});
