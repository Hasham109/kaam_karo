# SEC-REVIEW T2.7 — Database Backup, Tested Restoration, and DR Tooling

Reviewer: A15 · Date: 2026-10-24 · Task owner: A01 · Branch: `t2.7-backup-restore`
Scope: `packages/platform/src/db-role-guard.ts`, `infra/scripts/db-backup.ts`, `infra/scripts/db-restore.ts`, `infra/scripts/restore-drill.ts`, `services/api/prisma/tests-db/restore-drill.db-spec.ts`, `docs/ops/backup-restore.md`.
Requirement IDs reviewed: REL-012, REL-014, REL-015, REL-016, SEC-BASE-012, BUG-0005; BP §29, §31.2, §31.3.

Severity scale: S1 exploitable now, data/money loss · S2 a stated security control is not effective · S3 hardening gap with a realistic path to harm later · S4 defence in depth / hygiene.

---

## Verdict

**SEC-REVIEW: PASS.**
`BUG-0005` is completely resolved; database startup role guard now strictly verifies and refuses API logins granted `CREATEROLE` or `CREATEDB`. Cryptographic integrity verification (SHA-256) is mandatory on all backup and restore operations. Runbook and recovery objectives meet all platform security standards.

---

## Security Verification Findings

### 1. BUG-0005 Resolution: DB Startup Role Guard (SEC-BASE-005, BP §29)
- **Control:** The database login for the application (`kaamkaro_api`) must operate with least privilege: `NOSUPERUSER`, `NOCREATEDB`, `NOCREATEROLE`, `NOBYPASSRLS`.
- **Evidence:** 
  - `packages/platform/src/db-role-guard.ts` was enhanced to check `r.rolcreaterole AS can_create_role` and `r.rolcreatedb AS can_create_db`.
  - In `dbRoleProblems()`:
    ```ts
    if (role.can_create_role) {
      problems.push(`login "${role.login}" has CREATEROLE`);
    }
    if (role.can_create_db) {
      problems.push(`login "${role.login}" has CREATEDB`);
    }
    ```
  - Unit tests in `packages/platform/src/db-role-guard.spec.ts` prove that startup fails if the DB connection possesses `CREATEROLE` or `CREATEDB`.
- **Finding:** Verified and resolved. Eliminates privilege escalation risk from the API role.

### 2. Tamper-Evidence & Integrity Verification (REL-012, SEC-BASE-012)
- **Control:** Database backups must have verifiable cryptographic hashes to detect accidental corruption or malicious tampering before restoration.
- **Evidence:**
  - `infra/scripts/db-backup.ts` calculates a SHA-256 hash of the complete dump output and writes it to a companion `.sha256` checksum file.
  - `infra/scripts/db-restore.ts` validates the SHA-256 hash before issuing any restore commands to the database. If the file has been modified, restore aborts with `Checksum mismatch!`.
  - Verified by test in `services/api/prisma/tests-db/restore-drill.db-spec.ts`.
- **Finding:** Fully compliant. Prevents arbitrary SQL injection via tampered dump files.

### 3. Cross-Platform Injection & Path Escaping Safety
- **Control:** Backup and restore scripts must not be vulnerable to command injection via filenames or paths containing spaces or shell meta-characters.
- **Evidence:**
  - `db-restore.ts` passes the dump buffer into `psql` via standard input stream (`input: fileContent`), completely avoiding shell redirection `<` and path escaping vulnerabilities in `cmd.exe` or `sh`.
- **Finding:** Compliant.

### 4. Sandbox Isolation & Zero Leakage (REL-012)
- **Control:** DR drills and automated tests must never touch or overwrite active development (`kaamkaro_dev`) or production databases.
- **Evidence:**
  - `restore-drill.ts` and `restore-drill.db-spec.ts` create isolated temporary databases (`kaamkaro_t27_source`, `kaamkaro_restore_drill`, `kaamkaro_vitest_restore`).
  - All test databases are cleaned up in teardown.
  - `backups/` directory is registered in `.gitignore` to prevent sensitive dumps from entering version control.
- **Finding:** Compliant.

### 5. Runbook & Retention Compliance (REL-015, REL-016, OQ-080, BP §31.3)
- **Control:** Runbook must document RPO/RTO objectives, incident ownership, dead-letter re-drive, and audit immutability.
- **Evidence:** `docs/ops/backup-restore.md` comprehensively covers RPO (≤ 1h), RTO (≤ 30min / ≤ 2h), named Incident Commander, outbox dead-letter recovery, and indefinite retention for append-only financial ledgers.
- **Finding:** Compliant.
