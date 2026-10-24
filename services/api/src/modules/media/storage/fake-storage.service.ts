/**
 * In-memory / fake S3-compatible object storage (D-001; INFRA-003).
 * Produces HMAC-SHA256 signed, time-limited URLs and stores payloads in memory.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type {
  ObjectMetadata,
  ObjectStorage,
  SignedUrlOptions,
  StorageDownloadResult,
  StorageUploadResult,
} from './storage.interface';

interface StoredEntry {
  readonly data: Buffer;
  readonly contentType: string;
  readonly createdAt: Date;
}

@Injectable()
export class FakeStorageService implements ObjectStorage {
  private readonly storage = new Map<string, StoredEntry>();
  private readonly signingSecret = 'fake-storage-signing-secret-key-12345';
  private readonly defaultTtlSeconds = 900; // 15 minutes
  private healthState: 'ok' | 'degraded' | 'down' = 'ok';

  setHealthState(state: 'ok' | 'degraded' | 'down'): void {
    this.healthState = state;
  }

  async getSignedUploadUrl(
    storageKey: string,
    options?: SignedUrlOptions,
  ): Promise<StorageUploadResult> {
    const ttl = options?.expiresInSeconds ?? this.defaultTtlSeconds;
    const expiresAt = new Date(Date.now() + ttl * 1000);
    const signature = this.sign(storageKey, 'PUT', expiresAt.getTime());
    const uploadUrl = `https://storage.local.kaamkaro.pk/${storageKey}?action=PUT&expires=${expiresAt.getTime()}&sig=${signature}`;
    return {
      uploadUrl,
      storageKey,
      expiresAt,
    };
  }

  async getSignedDownloadUrl(
    storageKey: string,
    options?: SignedUrlOptions,
  ): Promise<StorageDownloadResult> {
    const ttl = options?.expiresInSeconds ?? this.defaultTtlSeconds;
    const expiresAt = new Date(Date.now() + ttl * 1000);
    const signature = this.sign(storageKey, 'GET', expiresAt.getTime());
    const downloadUrl = `https://storage.local.kaamkaro.pk/${storageKey}?action=GET&expires=${expiresAt.getTime()}&sig=${signature}`;
    return {
      downloadUrl,
      expiresAt,
    };
  }

  /**
   * Validates a signed URL signature and expiry timestamp (INFRA-003).
   */
  validateSignedUrl(url: string): { valid: boolean; reason?: string } {
    try {
      const parsed = new URL(url);
      const action = parsed.searchParams.get('action');
      const expiresStr = parsed.searchParams.get('expires');
      const sig = parsed.searchParams.get('sig');

      if (!action || !expiresStr || !sig) {
        return { valid: false, reason: 'MISSING_SIGNATURE_PARAMETERS' };
      }

      const expires = Number.parseInt(expiresStr, 10);
      if (Number.isNaN(expires) || Date.now() > expires) {
        return { valid: false, reason: 'URL_EXPIRED' };
      }

      const storageKey = parsed.pathname.replace(/^\//, '');
      const expectedSig = this.sign(storageKey, action, expires);

      const bufA = Buffer.from(sig, 'hex');
      const bufB = Buffer.from(expectedSig, 'hex');
      if (bufA.length !== bufB.length || !timingSafeEqual(bufA, bufB)) {
        return { valid: false, reason: 'INVALID_SIGNATURE' };
      }

      return { valid: true };
    } catch {
      return { valid: false, reason: 'MALFORMED_URL' };
    }
  }

  async putObject(
    storageKey: string,
    data: Buffer,
    contentType = 'application/octet-stream',
  ): Promise<void> {
    this.storage.set(storageKey, {
      data,
      contentType,
      createdAt: new Date(),
    });
  }

  async getObject(storageKey: string): Promise<Buffer | null> {
    const entry = this.storage.get(storageKey);
    return entry ? entry.data : null;
  }

  async deleteObject(storageKey: string): Promise<void> {
    this.storage.delete(storageKey);
  }

  async headObject(storageKey: string): Promise<ObjectMetadata | null> {
    const entry = this.storage.get(storageKey);
    if (!entry) return null;
    return {
      sizeBytes: entry.data.length,
      contentType: entry.contentType,
      lastModified: entry.createdAt,
    };
  }

  async checkHealth(): Promise<'ok' | 'degraded' | 'down'> {
    return this.healthState;
  }

  clear(): void {
    this.storage.clear();
  }

  private sign(storageKey: string, action: string, timestamp: number): string {
    const payload = `${action}:${storageKey}:${timestamp}`;
    return createHmac('sha256', this.signingSecret).update(payload).digest('hex');
  }
}
