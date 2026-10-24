import { beforeEach, describe, expect, it } from 'vitest';
import type {
  ConfigContext,
  ConfigParser,
  ConfigResult,
  ConfigService,
  ServerEnv,
} from '@kaamkaro/platform';
import { FakeSpeechToTextService } from '../speech-to-text/fake-speech-to-text.service';
import { FakeStorageService } from '../storage/fake-storage.service';
import { ThumbnailService } from '../thumbnail/thumbnail.service';
import { MediaService } from '../media.service';
import type {
  MediaKind,
  MediaPurpose,
  MediaScanStatus,
  MediaSensitivity,
  MediaUploadStatus,
} from '../media.types';
import type { PrismaService } from '../../../platform/prisma.service';

interface StoredMediaMock {
  id: string;
  ownerUserId: string;
  kind: MediaKind;
  purpose: MediaPurpose;
  sensitivity: MediaSensitivity;
  mimeType: string;
  sizeBytes: bigint | null;
  durationMs: number | null;
  storageKey: string;
  thumbnailMediaId: string | null;
  transcriptRef: string | null;
  retentionUntil: Date | null;
  uploadStatus: MediaUploadStatus;
  scanStatus: MediaScanStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  version: number;
}

class MockConfigService implements ConfigService {
  private configMap = new Map<string, number | null>();

  set(key: string, value: number | null): void {
    this.configMap.set(key, value);
  }

  invalidate(_key?: string): void {}

  async get<T>(
    key: string,
    parse: ConfigParser<T>,
    _context?: ConfigContext,
  ): Promise<ConfigResult<T>> {
    if (!this.configMap.has(key)) {
      return { status: 'not_configured', key, reason: 'NO_RULE', scope: null, ruleId: null };
    }
    const val = this.configMap.get(key);
    if (val === undefined) {
      return { status: 'not_configured', key, reason: 'NO_RULE', scope: null, ruleId: null };
    }
    if (val === null) {
      return { status: 'not_configured', key, reason: 'VALUE_NULL', scope: null, ruleId: null };
    }
    const parsed = parse(val);
    if (parsed === undefined) {
      return { status: 'not_configured', key, reason: 'INVALID_VALUE', scope: null, ruleId: null };
    }
    return {
      status: 'configured',
      key,
      scope: 'GLOBAL',
      scopeRefId: null,
      value: parsed,
      ruleId: 'mock',
      effectiveFrom: new Date(),
    };
  }

  async inspect<T>(key: string, parse: ConfigParser<T>, context?: ConfigContext) {
    return this.get(key, parse, context);
  }

  async require<T>(key: string, parse: ConfigParser<T>, context?: ConfigContext): Promise<T> {
    const res = await this.get(key, parse, context);
    if (res.status === 'configured') return res.value;
    throw new Error(`Config not set: ${key}`);
  }
}

class MockPrismaService {
  public mediaObjects = new Map<string, StoredMediaMock>();

  mediaObject = {
    create: async ({
      data,
    }: {
      data: Omit<StoredMediaMock, 'createdAt' | 'updatedAt' | 'deletedAt' | 'version'>;
    }) => {
      const obj: StoredMediaMock = {
        id: data.id,
        ownerUserId: data.ownerUserId,
        kind: data.kind,
        purpose: data.purpose,
        sensitivity: data.sensitivity,
        mimeType: data.mimeType,
        sizeBytes: data.sizeBytes ?? null,
        durationMs: data.durationMs ?? null,
        storageKey: data.storageKey,
        thumbnailMediaId: data.thumbnailMediaId ?? null,
        transcriptRef: data.transcriptRef ?? null,
        retentionUntil: data.retentionUntil ?? null,
        uploadStatus: data.uploadStatus ?? 'PENDING',
        scanStatus: data.scanStatus ?? 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        version: 1,
      };
      this.mediaObjects.set(obj.id, obj);
      return obj;
    },
    findUnique: async ({ where }: { where: { id: string } }) => {
      const obj = this.mediaObjects.get(where.id);
      return obj ? { ...obj } : null;
    },
    update: async ({ where, data }: { where: { id: string }; data: Partial<StoredMediaMock> }) => {
      const existing = this.mediaObjects.get(where.id);
      if (!existing) throw new Error('Not found');
      const updated: StoredMediaMock = { ...existing, ...data, updatedAt: new Date() };
      this.mediaObjects.set(where.id, updated);
      return updated;
    },
    findMany: async ({
      where,
    }: {
      where: {
        deletedAt?: Date | null;
        retentionUntil?: { lte?: Date };
      };
    }) => {
      const all = Array.from(this.mediaObjects.values());
      return all.filter((item) => {
        if (where.deletedAt === null && item.deletedAt !== null) return false;
        if (
          where.retentionUntil?.lte &&
          (!item.retentionUntil || item.retentionUntil > where.retentionUntil.lte)
        ) {
          return false;
        }
        return true;
      });
    },
  };
}

const baseEnv: ServerEnv = {
  appEnv: 'development',
  port: 3000,
  databaseUrl: null,
  redisUrl: null,
  sentryDsn: null,
  sentryTracesSampleRate: 0,
  healthProbeTimeoutMs: 2000,
  configCacheTtlMs: 30000,
  idempotencyKeyTtlHours: 24,
  idempotencyInFlightTimeoutMs: 60000,
  idempotencyMaxResponseBytes: 16384,
  httpRequestTimeoutMs: 30000,
  outboxPollIntervalMs: 1000,
  outboxBatchSize: 100,
  outboxMaxAttempts: 10,
  outboxBackoffBaseMs: 1000,
  outboxBackoffMaxMs: 300000,
  outboxRetentionDays: 14,
  deadLetterRetentionDays: 30,
  logLevel: 'info',
};

describe('MediaService (T3.2; MEDIA-001..009, INFRA-003)', () => {
  let mediaService: MediaService;
  let mockPrisma: MockPrismaService;
  let mockConfig: MockConfigService;
  let storage: FakeStorageService;
  let sttService: FakeSpeechToTextService;
  let thumbnailService: ThumbnailService;
  let env: ServerEnv;

  beforeEach(() => {
    mockPrisma = new MockPrismaService();
    mockConfig = new MockConfigService();
    storage = new FakeStorageService();
    sttService = new FakeSpeechToTextService();
    thumbnailService = new ThumbnailService(storage);

    env = { ...baseEnv };

    // Seed default test limits (BP §76, D-011)
    mockConfig.set('media.audio.max_seconds', 120);
    mockConfig.set('media.video.max_seconds', 30);
    mockConfig.set('media.max_upload_bytes', 26_214_400); // 25 MiB
    mockConfig.set('media.retention_days', 30);

    mediaService = new MediaService(
      mockPrisma as unknown as PrismaService,
      mockConfig,
      storage,
      sttService,
      thumbnailService,
      env,
    );
  });

  describe('[MEDIA-004][MEDIA-009][INFRA-003] Upload Session Initiation', () => {
    it('creates an upload session with signed upload URL and PENDING state', async () => {
      const result = await mediaService.createUploadSession({
        ownerUserId: '11111111-1111-1111-1111-111111111111',
        kind: 'AUDIO',
        purpose: 'VOICE_RECORDING',
        mimeType: 'audio/mpeg',
        expectedSizeBytes: 500_000,
        durationMs: 45_000,
      });

      expect(result.mediaId).toBeDefined();
      expect(result.storageKey).toMatch(/^media\/voice_recording\//);
      expect(result.uploadUrl).toContain('action=PUT');
      expect(result.uploadStatus).toBe('PENDING');

      const saved = await mockPrisma.mediaObject.findUnique({ where: { id: result.mediaId } });
      expect(saved).not.toBeNull();
      expect(saved!.sensitivity).toBe('STANDARD');
      expect(saved!.scanStatus).toBe('PENDING');
    });

    it('sets RESTRICTED sensitivity for verification documents (ABUSE-010, BP §29)', async () => {
      const result = await mediaService.createUploadSession({
        ownerUserId: '11111111-1111-1111-1111-111111111111',
        kind: 'DOCUMENT',
        purpose: 'VERIFICATION_DOCUMENT',
        mimeType: 'application/pdf',
      });

      const saved = await mockPrisma.mediaObject.findUnique({ where: { id: result.mediaId } });
      expect(saved!.sensitivity).toBe('RESTRICTED');
    });

    it('rejects unsupported MIME types with INVALID_MIME_TYPE (CHAT-003)', async () => {
      await expect(
        mediaService.createUploadSession({
          ownerUserId: '11111111-1111-1111-1111-111111111111',
          kind: 'AUDIO',
          purpose: 'VOICE_RECORDING',
          mimeType: 'application/x-executable',
        }),
      ).rejects.toThrowError(/not allowed for media kind/);
    });

    it('rejects expected size exceeding maximum upload limit (413 Payload Too Large)', async () => {
      await expect(
        mediaService.createUploadSession({
          ownerUserId: '11111111-1111-1111-1111-111111111111',
          kind: 'VIDEO',
          purpose: 'REQUEST_ATTACHMENT',
          mimeType: 'video/mp4',
          expectedSizeBytes: 30_000_000, // exceeds 25 MiB limit
        }),
      ).rejects.toThrowError(/exceeds maximum allowed limit/);
    });

    it('rejects expected duration exceeding maximum duration limit (400 Bad Request)', async () => {
      await expect(
        mediaService.createUploadSession({
          ownerUserId: '11111111-1111-1111-1111-111111111111',
          kind: 'VIDEO',
          purpose: 'REQUEST_ATTACHMENT',
          mimeType: 'video/mp4',
          durationMs: 45_000, // exceeds 30s limit
        }),
      ).rejects.toThrowError(/duration exceeds maximum allowed/);
    });

    it('fails closed when limit is null outside dev environment (LIMIT_NOT_CONFIGURED)', async () => {
      const prodEnv: ServerEnv = { ...baseEnv, appEnv: 'production' };
      mockConfig.set('media.max_upload_bytes', null);

      const prodService = new MediaService(
        mockPrisma as unknown as PrismaService,
        mockConfig,
        storage,
        sttService,
        thumbnailService,
        prodEnv,
      );

      await expect(
        prodService.createUploadSession({
          ownerUserId: '11111111-1111-1111-1111-111111111111',
          kind: 'PHOTO',
          purpose: 'REQUEST_ATTACHMENT',
          mimeType: 'image/jpeg',
        }),
      ).rejects.toThrowError(/media\.max_upload_bytes.*not set/);
    });
  });

  describe('[IMPL §6 T3.2][MEDIA-004][MEDIA-009] Finalize: Oversize/overlong rejected, draft survives failure', () => {
    it('successfully finalizes upload within limits', async () => {
      const session = await mediaService.createUploadSession({
        ownerUserId: '11111111-1111-1111-1111-111111111111',
        kind: 'PHOTO',
        purpose: 'REQUEST_ATTACHMENT',
        mimeType: 'image/jpeg',
      });

      const finalized = await mediaService.finalizeUploadSession(session.mediaId, {
        actualSizeBytes: 2_000_000,
      });

      expect(finalized.uploadStatus).toBe('UPLOADED');
      expect(finalized.scanStatus).toBe('CLEAN');
      expect(finalized.sizeBytes).toBe(BigInt(2_000_000));
      expect(finalized.retentionUntil).not.toBeNull();
    });

    it('[Acceptance Criterion] rejects oversize upload and marks FAILED without losing draft', async () => {
      const session = await mediaService.createUploadSession({
        ownerUserId: '11111111-1111-1111-1111-111111111111',
        kind: 'PHOTO',
        purpose: 'REQUEST_ATTACHMENT',
        mimeType: 'image/jpeg',
      });

      // Attempt to finalize with size exceeding 25 MiB
      await expect(
        mediaService.finalizeUploadSession(session.mediaId, {
          actualSizeBytes: 30_000_000,
        }),
      ).rejects.toThrowError(/exceeds maximum limit/);

      // Verify draft survives failure in FAILED status (MEDIA-009)
      const surviving = await mockPrisma.mediaObject.findUnique({ where: { id: session.mediaId } });
      expect(surviving).not.toBeNull();
      expect(surviving!.uploadStatus).toBe('FAILED');
    });

    it('[Acceptance Criterion] rejects overlong media and marks FAILED without losing draft', async () => {
      const session = await mediaService.createUploadSession({
        ownerUserId: '11111111-1111-1111-1111-111111111111',
        kind: 'VIDEO',
        purpose: 'REQUEST_ATTACHMENT',
        mimeType: 'video/mp4',
      });

      // Attempt to finalize video with 45s (> 30s limit)
      await expect(
        mediaService.finalizeUploadSession(session.mediaId, {
          actualSizeBytes: 5_000_000,
          durationMs: 45_000,
        }),
      ).rejects.toThrowError(/exceeds maximum limit/);

      const surviving = await mockPrisma.mediaObject.findUnique({ where: { id: session.mediaId } });
      expect(surviving).not.toBeNull();
      expect(surviving!.uploadStatus).toBe('FAILED');
    });
  });

  describe('[MEDIA-005] Video Thumbnail Generation', () => {
    it('generates a thumbnail MediaObject for completed video uploads', async () => {
      const session = await mediaService.createUploadSession({
        ownerUserId: '11111111-1111-1111-1111-111111111111',
        kind: 'VIDEO',
        purpose: 'SERVICE_IMAGE',
        mimeType: 'video/mp4',
      });

      const finalized = await mediaService.finalizeUploadSession(session.mediaId, {
        actualSizeBytes: 10_000_000,
        durationMs: 15_000,
      });

      expect(finalized.thumbnailMediaId).toBeDefined();

      const thumb = await mockPrisma.mediaObject.findUnique({
        where: { id: finalized.thumbnailMediaId! },
      });
      expect(thumb).not.toBeNull();
      expect(thumb!.kind).toBe('PHOTO');
      expect(thumb!.mimeType).toBe('image/jpeg');
      expect(thumb!.storageKey).toContain('.thumb.jpg');
      expect(thumb!.uploadStatus).toBe('UPLOADED');
    });
  });

  describe('[MEDIA-006] Audio Speech-To-Text Transcription', () => {
    it('generates transcript on audio upload completion', async () => {
      const session = await mediaService.createUploadSession({
        ownerUserId: '11111111-1111-1111-1111-111111111111',
        kind: 'AUDIO',
        purpose: 'VOICE_RECORDING',
        mimeType: 'audio/mpeg',
      });

      const finalized = await mediaService.finalizeUploadSession(session.mediaId, {
        actualSizeBytes: 300_000,
        durationMs: 20_000,
      });

      expect(finalized.transcriptRef).toContain('stt:fake:');
    });

    it('leaves audio usable even if STT transcription fails', async () => {
      sttService.setShouldFail(true);

      const session = await mediaService.createUploadSession({
        ownerUserId: '11111111-1111-1111-1111-111111111111',
        kind: 'AUDIO',
        purpose: 'VOICE_RECORDING',
        mimeType: 'audio/mpeg',
      });

      const finalized = await mediaService.finalizeUploadSession(session.mediaId, {
        actualSizeBytes: 300_000,
        durationMs: 20_000,
      });

      expect(finalized.uploadStatus).toBe('UPLOADED');
      expect(finalized.transcriptRef).toBeNull();
    });
  });

  describe('[INFRA-003] Signed URLs and Signature Validation', () => {
    it('generates a signed download URL for uploaded media', async () => {
      const session = await mediaService.createUploadSession({
        ownerUserId: '11111111-1111-1111-1111-111111111111',
        kind: 'PHOTO',
        purpose: 'PROFILE_PHOTO',
        mimeType: 'image/jpeg',
      });

      await mediaService.finalizeUploadSession(session.mediaId, {
        actualSizeBytes: 500_000,
      });

      const { downloadUrl, expiresAt } = await mediaService.getDownloadUrl(session.mediaId);
      expect(downloadUrl).toBeDefined();
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now());

      // Validate signature
      const check = storage.validateSignedUrl(downloadUrl);
      expect(check.valid).toBe(true);
    });

    it('refuses access to object URL without a valid signature or expired signature', () => {
      // URL without signature
      const unsignedUrl = 'https://storage.local.kaamkaro.pk/media/photo/test-file';
      const checkUnsigned = storage.validateSignedUrl(unsignedUrl);
      expect(checkUnsigned.valid).toBe(false);

      // Expired URL
      const expiredUrl = `https://storage.local.kaamkaro.pk/media/photo/test-file?action=GET&expires=${Date.now() - 1000}&sig=abcdef`;
      const checkExpired = storage.validateSignedUrl(expiredUrl);
      expect(checkExpired.valid).toBe(false);

      // Tampered URL
      const tamperedUrl = `https://storage.local.kaamkaro.pk/media/photo/test-file?action=GET&expires=${Date.now() + 10000}&sig=badbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbad`;
      const checkTampered = storage.validateSignedUrl(tamperedUrl);
      expect(checkTampered.valid).toBe(false);
    });
  });

  describe('[MEDIA-007] Retention Cleanup Job', () => {
    it('operates in dry-run mode when retention days config is null', async () => {
      mockConfig.set('media.retention_days', null);

      const session = await mediaService.createUploadSession({
        ownerUserId: '11111111-1111-1111-1111-111111111111',
        kind: 'PHOTO',
        purpose: 'REQUEST_ATTACHMENT',
        mimeType: 'image/jpeg',
      });

      await mediaService.finalizeUploadSession(session.mediaId, { actualSizeBytes: 100_000 });

      // Backdate retention_until to simulate expiration
      await mockPrisma.mediaObject.update({
        where: { id: session.mediaId },
        data: { retentionUntil: new Date(Date.now() - 1000) },
      });

      const result = await mediaService.runRetentionJob();
      expect(result.dryRun).toBe(true);
      expect(result.scannedCount).toBe(1);
      expect(result.deletedCount).toBe(0);

      // Item should still not be marked deleted
      const item = await mockPrisma.mediaObject.findUnique({ where: { id: session.mediaId } });
      expect(item!.deletedAt).toBeNull();
    });

    it('deletes expired media objects when retention days is configured', async () => {
      mockConfig.set('media.retention_days', 30);

      const session = await mediaService.createUploadSession({
        ownerUserId: '11111111-1111-1111-1111-111111111111',
        kind: 'PHOTO',
        purpose: 'REQUEST_ATTACHMENT',
        mimeType: 'image/jpeg',
      });

      await mediaService.finalizeUploadSession(session.mediaId, { actualSizeBytes: 100_000 });

      // Backdate retention_until
      await mockPrisma.mediaObject.update({
        where: { id: session.mediaId },
        data: { retentionUntil: new Date(Date.now() - 1000) },
      });

      const result = await mediaService.runRetentionJob(false);
      expect(result.dryRun).toBe(false);
      expect(result.scannedCount).toBe(1);
      expect(result.deletedCount).toBe(1);

      const item = await mockPrisma.mediaObject.findUnique({ where: { id: session.mediaId } });
      expect(item!.deletedAt).not.toBeNull();
    });
  });
});
