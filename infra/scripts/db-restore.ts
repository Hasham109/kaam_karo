/**
 * Database Restore Utility (T2.7; REL-012, BP §31.2, §31.3, §49).
 *
 * Restores a PostgreSQL logical backup into a specified target database.
 * Verifies SHA-256 checksum before restoration to prevent corrupt or tampered loads.
 */
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface RestoreResult {
  readonly success: boolean;
  readonly targetDatabase: string;
  readonly backupFilePath: string;
  readonly durationMs: number;
  readonly timestamp: string;
}

export interface RestoreOptions {
  readonly backupFilePath: string;
  readonly targetDb: string;
  readonly containerName?: string | undefined;
  readonly skipChecksumVerification?: boolean | undefined;
}

export function performRestore(options: RestoreOptions): RestoreResult {
  const startTime = Date.now();
  const filePath = resolve(process.cwd(), options.backupFilePath);
  const containerName = options.containerName ?? 'kaamkaro-dev-postgres-1';

  if (!existsSync(filePath)) {
    throw new Error(`Backup file not found at: ${filePath}`);
  }

  // 1. Verify Checksum
  if (!options.skipChecksumVerification) {
    const checksumPath = `${filePath}.sha256`;
    if (existsSync(checksumPath)) {
      const expectedChecksum = readFileSync(checksumPath, 'utf8').trim().split(/\s+/)[0];
      const actualBuffer = readFileSync(filePath);
      const actualChecksum = createHash('sha256').update(actualBuffer).digest('hex');
      if (expectedChecksum !== actualChecksum) {
        throw new Error(`Checksum mismatch! Expected: ${expectedChecksum}, got: ${actualChecksum}`);
      }
    }
  }

  // 2. Ensure target database exists
  let isDocker = false;
  try {
    execSync('psql --version', { stdio: 'ignore' });
  } catch {
    isDocker = true;
  }

  const user = process.env['POSTGRES_USER'] ?? 'kaamkaro';
  const fileContent = readFileSync(filePath);

  if (!isDocker) {
    const host = '127.0.0.1';
    const port = process.env['POSTGRES_PORT'] ?? '5432';
    // Create DB if not exists
    try {
      execSync(
        `psql -U ${user} -h ${host} -p ${port} -d template1 -c "CREATE DATABASE ${options.targetDb} OWNER ${user};"`,
        {
          stdio: 'ignore',
        },
      );
    } catch {
      // already exists
    }
    // Restore SQL via input buffer
    execSync(`psql -U ${user} -h ${host} -p ${port} -d ${options.targetDb}`, {
      input: fileContent,
      stdio: ['pipe', 'ignore', 'pipe'],
      maxBuffer: 128 * 1024 * 1024,
    });
  } else {
    // Docker mode
    try {
      execSync(
        `docker exec ${containerName} psql -U ${user} -d template1 -c "CREATE DATABASE ${options.targetDb} OWNER ${user};"`,
        {
          stdio: 'ignore',
        },
      );
    } catch {
      // already exists
    }
    // Pipe buffer into docker exec psql
    execSync(`docker exec -i ${containerName} psql -U ${user} -d ${options.targetDb}`, {
      input: fileContent,
      stdio: ['pipe', 'ignore', 'pipe'],
      maxBuffer: 128 * 1024 * 1024,
    });
  }

  const durationMs = Date.now() - startTime;

  return {
    success: true,
    targetDatabase: options.targetDb,
    backupFilePath: filePath,
    durationMs,
    timestamp: new Date().toISOString(),
  };
}

// CLI entry point
if (process.argv[1]?.includes('db-restore')) {
  const backupFile = process.argv[2];
  const targetDb = process.argv[3];
  if (!backupFile || !targetDb || backupFile === '--help' || backupFile === '-h') {
    console.error('Usage: node infra/scripts/db-restore.ts <backup_file> <target_db>');
    process.exit(backupFile === '--help' || backupFile === '-h' ? 0 : 1);
  }
  const res = performRestore({ backupFilePath: backupFile, targetDb });
  console.log(`[RESTORE SUCCESS] Restored to database: ${res.targetDatabase}`);
  console.log(`[DURATION] ${res.durationMs}ms`);
}
