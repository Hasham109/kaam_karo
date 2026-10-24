# Database Backup, Recovery & Disaster Recovery Runbook

> **Task ID:** T2.7 / T8.5  
> **Requirements:** `REL-012`, `REL-014`, `REL-015`, `REL-016`, `SEC-BASE-012`  
> **Blueprint References:** BP §29, §31.2, §31.3, §49, §84 item 120; D-012, D-013, OQ-080  
> **Owner:** A01 (Platform DevOps) / Reviewed by A15 (Security)  
> **Last Tested:** 2026-10-24  

---

## 1. Overview & Recovery Objectives

This document establishes the operational procedures for database backups, point-in-time recovery, disaster recovery drills, outbox dead-letter recovery, and data retention policies for the Kaam Karo platform.

### 1.1 Recovery Objectives (REL-015, BP §31.3, D-012)

| Objective | Target | Rationale & Mechanism |
|---|---|---|
| **RPO** (Recovery Point Objective) | **≤ 1 hour** (Production target: ≤ 15 min with continuous WAL archiving; Staging: ≤ 24 hours) | WAL segment streaming to encrypted cold storage + automated daily base dumps. Maximum data at risk is restricted to the latest uncommitted WAL chunk. |
| **RTO** (Recovery Time Objective) | **≤ 30 minutes** (single node / corrupted replica)<br>**≤ 2 hours** (total regional disaster recovery) | Automated container / cloud instance provisioning + streamlined parallel database restore. |

### 1.2 Incident Ownership & Escalation (REL-016, BP §31.3)

- **Primary Incident Commander:** Lead Platform DevOps Engineer (`ops@kaamkaro.pk`).
- **Secondary Incident Commander:** Staff Backend Architect / Orchestrator (`lead@kaamkaro.pk`).
- **Customer Status Channel:** Status page at `status.kaamkaro.pk` and in-app maintenance notification payload via push notification channel (`push.platform.maintenance`).
- **Drill Cadence:** Monthly automated restore drill in staging/isolated environment (T8.5).

---

## 2. Backup Architecture & Automation (REL-014, BP §31.2)

### 2.1 Backup Strategy & Schedule

1. **Daily Full Logical Dumps:**
   - Generated daily at **02:00 UTC (07:00 PKT)**.
   - Performed via `pnpm run db:backup` (`infra/scripts/db-backup.ts`).
   - Clean, consistent SQL dump flags: `--clean --if-exists --no-owner --no-acl`.
2. **Cryptographic Integrity & Tamper Evidence:**
   - Every backup generates an associated `.sha256` checksum file.
   - Any restore operation strictly validates `sha256sum` prior to execution.
3. **Storage & Encryption (SEC-BASE-012):**
   - In production, backup artifacts are compressed and encrypted with AES-256 (`pgcrypto` / SSE-S3 with KMS customer-managed key).
   - In local / staging development, backups reside in `backups/` (git-ignored) with restricted permissions (0600).

---

## 3. Restoration Procedure (REL-012, BP §31.3)

### 3.1 Prerequisites
- Access to the target PostgreSQL host with `CREATEROLE` or superuser privileges (`kaamkaro`).
- Verification that target database is either empty or created fresh for staging/drill purposes.
- **NEVER restore directly over `kaamkaro_dev` or production without verified snapshot and explicit sign-off.**

### 3.2 Step-by-Step Recovery

1. **Locate and verify backup artifact:**
   ```bash
   # Verify SHA-256 checksum
   sha256sum -c backups/backup_<dbname>_<timestamp>.sql.sha256
   ```

2. **Execute restoration tool:**
   ```bash
   pnpm run db:restore backups/backup_<dbname>_<timestamp>.sql <target_dbname>
   ```

3. **Verify Restored Database Health:**
   - **PostGIS Extension:** Verify spatial calculations work:
     ```sql
     SELECT ST_AsText(ST_MakePoint(74.34, 31.52)); -- Lahore coordinate check
     ```
   - **Base Table Count:** Must contain all platform base tables (≥ 50 tables across identity, catalog, bookings, ledger, reviews):
     ```sql
     SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
     ```
   - **Freeze Trigger Integrity:** Confirm immutable triggers remain intact (e.g. `kk_location_snapshot_freeze`):
     ```sql
     -- Attempting update on CONFIRMED snapshot must raise exception SQLSTATE 55000
     ```
   - **Role Separation:** Verify `kaamkaro_api` login has `CONNECT` and `USAGE` on schema `public` without superuser or `CREATEDB` / `CREATEROLE` (SEC-BASE-005, BUG-0005).

---

## 4. Automated Disaster Recovery Drill (IMPL T2.7, T8.5)

To ensure backups are never write-only, the automated DR drill script (`infra/scripts/restore-drill.ts`) simulates a full end-to-end recovery:

```bash
pnpm run db:restore-drill
```

### Drill Execution Workflow:
1. Bootstraps a fresh source database (`kaamkaro_t27_source`) with full migrations and catalog seed.
2. Dumps the database using `performBackup()`, generating a SHA-256 checksum.
3. Initializes an isolated restore sandbox (`kaamkaro_restore_drill`).
4. Restores the dump using `performRestore()` with checksum validation.
5. Executes automated integrity tests (PostGIS, table count, catalog record counts, freeze trigger checks).
6. Drops temporary drill databases.
7. Logs the drill result with UTC timestamp, duration, and verdict into `docs/ops/restore-drill-log.md`.

---

## 5. Outbox Dead-Letter Queue Re-Drive Runbook (BP §28.4, T2.2)

When an event worker fails after maximum retry attempts (exponential backoff up to 5 retries), the row in `outbox_events` has its status updated to `FAILED`.

### 5.1 Investigation
```sql
SELECT id, event_type, aggregate_type, aggregate_id, attempts, last_error, created_at 
FROM outbox_events 
WHERE status = 'FAILED' 
ORDER BY created_at DESC 
LIMIT 50;
```

### 5.2 Re-drive Procedure
Once the root cause (e.g., downstream third-party outage, Redis connection hiccup) is resolved:
```sql
-- Re-queue failed events for redelivery
UPDATE outbox_events 
SET status = 'PENDING', 
    attempts = 0, 
    last_error = NULL, 
    next_retry_at = clock_timestamp() 
WHERE status = 'FAILED' 
  AND created_at >= NOW() - INTERVAL '24 hours';
```

---

## 6. Data Retention & Immutability Policy (OQ-080, ARCH §5, BP §49)

In compliance with financial auditability, tax regulations, and customer dispute history in Pakistan:

1. **Append-Only Ledgers:**
   - Financial ledger (`ledger_account`, `ledger_journal_entry`, `ledger_entry_line`) and audit logs (`audit_log`) are **retained indefinitely** (keep forever; no purge).
2. **Booking & Job History:**
   - Bookings, job state transitions, and fare line items are retained for a minimum of 7 years.
3. **Location Snapshots:**
   - `location_snapshot` records once confirmed (`CONFIRMED`) are locked via the PostgreSQL freeze trigger `kk_location_snapshot_freeze` and cannot be mutated or deleted.
4. **Media Retention:**
   - Temporary intake audio/video recordings and non-completion media are managed by retention rules (30 days post dispute window, T3.2).
