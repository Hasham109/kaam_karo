/**
 * Database Backup Utility (T2.7; REL-012, BP §31.2, §31.3, §49).
 *
 * Performs a consistent PostgreSQL logical backup using pg_dump.
 * Computes SHA-256 checksum for tamper-evidence and integrity verification.
 * Supports both direct execution (with local pg_dump) and containerized execution (via docker exec).
 */
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface BackupResult {
  readonly success: boolean;
  readonly filePath: string;
  readonly checksumPath: string;
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly durationMs: number;
  readonly timestamp: string;
  readonly database: string;
}

export interface BackupOptions {
  readonly dbName?: string | undefined;
  readonly outputDir?: string | undefined;
  readonly fileName?: string | undefined;
  readonly containerName?: string | undefined;
}

export function performBackup(options: BackupOptions = {}): BackupResult {
  const startTime = Date.now();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dbName = options.dbName ?? process.env['POSTGRES_DB'] ?? 'kaamkaro_dev';
  const containerName = options.containerName ?? 'kaamkaro-dev-postgres-1';

  const outputDir = resolve(process.cwd(), options.outputDir ?? 'backups');
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const fileName = options.fileName ?? `backup_${dbName}_${timestamp}.sql`;
  const filePath = resolve(outputDir, fileName);
  const checksumPath = `${filePath}.sha256`;

  // Determine if pg_dump is available natively or run via docker
  let isDocker = false;
  try {
    execSync('pg_dump --version', { stdio: 'ignore' });
  } catch {
    isDocker = true;
  }

  // Dump command: plain SQL format with clean and if-exists flags
  let dumpBuffer: Buffer;
  const maxBuffer = 128 * 1024 * 1024; // 128MB
  if (!isDocker) {
    const user = process.env['POSTGRES_USER'] ?? 'kaamkaro';
    const host = '127.0.0.1';
    const port = process.env['POSTGRES_PORT'] ?? '5432';
    dumpBuffer = execSync(
      `pg_dump -U ${user} -h ${host} -p ${port} -d ${dbName} --clean --if-exists --no-owner --no-acl`,
      { maxBuffer },
    );
  } else {
    // Run via docker exec
    dumpBuffer = execSync(
      `docker exec ${containerName} pg_dump -U kaamkaro -d ${dbName} --clean --if-exists --no-owner --no-acl`,
      { maxBuffer },
    );
  }

  writeFileSync(filePath, dumpBuffer);

  const sha256 = createHash('sha256').update(dumpBuffer).digest('hex');
  writeFileSync(checksumPath, `${sha256}  ${fileName}\n`, 'utf8');

  const stats = statSync(filePath);
  const durationMs = Date.now() - startTime;

  return {
    success: true,
    filePath,
    checksumPath,
    sha256,
    sizeBytes: stats.size,
    durationMs,
    timestamp: new Date().toISOString(),
    database: dbName,
  };
}

// CLI entry point
if (process.argv[1]?.includes('db-backup')) {
  const arg = process.argv[2];
  if (arg === '--help' || arg === '-h') {
    console.log('Usage: node infra/scripts/db-backup.ts [target_db]');
    process.exit(0);
  }
  const targetDb = arg?.startsWith('--') ? undefined : arg;
  const res = performBackup({ dbName: targetDb });
  console.log(`[BACKUP SUCCESS] Database: ${res.database}`);
  console.log(`[BACKUP FILE] ${res.filePath} (${res.sizeBytes} bytes)`);
  console.log(`[SHA256] ${res.sha256}`);
  console.log(`[DURATION] ${res.durationMs}ms`);
}
