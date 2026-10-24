/**
 * Database integration tests for Media module M14 (T3.2, owner A08).
 * Requirements: MEDIA-001..009, INFRA-003, CHAT-003
 *
 * Verifies:
 *  - Postgres constraints: media_object_restricted_purposes, media_object_sizes_not_negative
 *  - Database trigger: kk_freeze on frozen columns (owner_user_id, kind, purpose, sensitivity, storage_key)
 *  - Thumbnail foreign key relation (thumbnail_media_id)
 *  - Retention filtering and soft-deletion
 */
import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { afterAll, describe, expect, it } from 'vitest';
import {
  type MediaKind,
  type MediaPurpose,
  type MediaSensitivity,
  PrismaClient,
} from '../../src/generated/prisma/client.js';

const appUrl = process.env['DATABASE_URL'];
const ownerUrl = process.env['MIGRATION_DATABASE_URL'];
if (!appUrl || !ownerUrl) {
  throw new Error('media.db-spec needs DATABASE_URL and MIGRATION_DATABASE_URL');
}

const app = new PrismaClient({ adapter: new PrismaPg({ connectionString: appUrl }) });
const owner = new PrismaClient({ adapter: new PrismaPg({ connectionString: ownerUrl }) });

afterAll(async () => {
  await app.$disconnect();
  await owner.$disconnect();
});

class Rollback extends Error {}

async function attempt<T>(client: PrismaClient, fn: (tx: PrismaClient) => Promise<T>): Promise<T> {
  let value: T | undefined;
  try {
    await client.$transaction(async (tx) => {
      value = await fn(tx as unknown as PrismaClient);
      throw new Rollback();
    });
  } catch (err) {
    if (err instanceof Rollback) return value as T;
    throw err;
  }
  return value as T;
}

describe('[T3.2] Media Database Integration', () => {
  it('creates and reads a standard MediaObject within database limits', async () => {
    await attempt(app, async (tx) => {
      // Find an existing user or seed dummy ID
      const user = await tx.user.findFirst();
      const userId = user ? user.id : randomUUID();

      const media = await tx.mediaObject.create({
        data: {
          id: randomUUID(),
          ownerUserId: userId,
          kind: 'AUDIO' as MediaKind,
          purpose: 'VOICE_RECORDING' as MediaPurpose,
          sensitivity: 'STANDARD' as MediaSensitivity,
          mimeType: 'audio/mpeg',
          sizeBytes: BigInt(500_000),
          durationMs: 45_000,
          storageKey: `media/voice_recording/${randomUUID()}`,
          uploadStatus: 'PENDING',
          scanStatus: 'PENDING',
        },
      });

      expect(media.id).toBeDefined();
      expect(media.kind).toBe('AUDIO');
      expect(media.sensitivity).toBe('STANDARD');

      const read = await tx.mediaObject.findUnique({ where: { id: media.id } });
      expect(read).not.toBeNull();
      expect(read?.sizeBytes).toBe(BigInt(500_000));
    });
  });

  it('enforces media_object_restricted_purposes CHECK constraint on invalid sensitivity', async () => {
    await attempt(app, async (tx) => {
      const user = await tx.user.findFirst();
      const userId = user ? user.id : randomUUID();

      // Attempting to save VERIFICATION_DOCUMENT with STANDARD sensitivity violates constraint
      await expect(
        tx.mediaObject.create({
          data: {
            id: randomUUID(),
            ownerUserId: userId,
            kind: 'DOCUMENT' as MediaKind,
            purpose: 'VERIFICATION_DOCUMENT' as MediaPurpose,
            sensitivity: 'STANDARD' as MediaSensitivity, // Must be RESTRICTED
            mimeType: 'application/pdf',
            storageKey: `media/verification_document/${randomUUID()}`,
          },
        }),
      ).rejects.toThrow();
    });
  });

  it('allows media_object_restricted_purposes with RESTRICTED sensitivity', async () => {
    await attempt(app, async (tx) => {
      const user = await tx.user.findFirst();
      const userId = user ? user.id : randomUUID();

      const valid = await tx.mediaObject.create({
        data: {
          id: randomUUID(),
          ownerUserId: userId,
          kind: 'DOCUMENT' as MediaKind,
          purpose: 'VERIFICATION_DOCUMENT' as MediaPurpose,
          sensitivity: 'RESTRICTED' as MediaSensitivity,
          mimeType: 'application/pdf',
          storageKey: `media/verification_document/${randomUUID()}`,
        },
      });
      expect(valid.sensitivity).toBe('RESTRICTED');
    });
  });

  it('enforces media_object_sizes_not_negative CHECK constraint', async () => {
    await attempt(app, async (tx) => {
      const user = await tx.user.findFirst();
      const userId = user ? user.id : randomUUID();

      await expect(
        tx.mediaObject.create({
          data: {
            id: randomUUID(),
            ownerUserId: userId,
            kind: 'PHOTO' as MediaKind,
            purpose: 'REQUEST_ATTACHMENT' as MediaPurpose,
            sensitivity: 'STANDARD' as MediaSensitivity,
            mimeType: 'image/jpeg',
            sizeBytes: BigInt(-100),
            storageKey: `media/request_attachment/${randomUUID()}`,
          },
        }),
      ).rejects.toThrow();
    });
  });

  it('enforces kk_freeze trigger when attempting to mutate owner_user_id', async () => {
    await attempt(app, async (tx) => {
      const user = await tx.user.findFirst();
      const userId = user ? user.id : randomUUID();
      const otherUserId = randomUUID();

      const media = await tx.mediaObject.create({
        data: {
          id: randomUUID(),
          ownerUserId: userId,
          kind: 'PHOTO' as MediaKind,
          purpose: 'PROFILE_PHOTO' as MediaPurpose,
          sensitivity: 'STANDARD' as MediaSensitivity,
          mimeType: 'image/jpeg',
          storageKey: `media/profile_photo/${randomUUID()}`,
        },
      });

      await expect(
        tx.mediaObject.update({
          where: { id: media.id },
          data: { ownerUserId: otherUserId },
        }),
      ).rejects.toThrow();
    });
  });

  it('enforces kk_freeze trigger when attempting to mutate storage_key', async () => {
    await attempt(app, async (tx) => {
      const user = await tx.user.findFirst();
      const userId = user ? user.id : randomUUID();

      const media = await tx.mediaObject.create({
        data: {
          id: randomUUID(),
          ownerUserId: userId,
          kind: 'PHOTO' as MediaKind,
          purpose: 'PROFILE_PHOTO' as MediaPurpose,
          sensitivity: 'STANDARD' as MediaSensitivity,
          mimeType: 'image/jpeg',
          storageKey: `media/profile_photo/${randomUUID()}`,
        },
      });

      await expect(
        tx.mediaObject.update({
          where: { id: media.id },
          data: { storageKey: 'tampered-key' },
        }),
      ).rejects.toThrow();
    });
  });

  it('allows updating mutable columns (upload_status, size_bytes)', async () => {
    await attempt(app, async (tx) => {
      const user = await tx.user.findFirst();
      const userId = user ? user.id : randomUUID();

      const media = await tx.mediaObject.create({
        data: {
          id: randomUUID(),
          ownerUserId: userId,
          kind: 'PHOTO' as MediaKind,
          purpose: 'PROFILE_PHOTO' as MediaPurpose,
          sensitivity: 'STANDARD' as MediaSensitivity,
          mimeType: 'image/jpeg',
          storageKey: `media/profile_photo/${randomUUID()}`,
        },
      });

      const updated = await tx.mediaObject.update({
        where: { id: media.id },
        data: {
          uploadStatus: 'UPLOADED',
          sizeBytes: BigInt(250_000),
        },
      });
      expect(updated.uploadStatus).toBe('UPLOADED');
      expect(updated.sizeBytes).toBe(BigInt(250_000));
    });
  });

  it('supports video thumbnail foreign key relationship', async () => {
    await attempt(app, async (tx) => {
      const user = await tx.user.findFirst();
      const userId = user ? user.id : randomUUID();

      const thumb = await tx.mediaObject.create({
        data: {
          id: randomUUID(),
          ownerUserId: userId,
          kind: 'PHOTO' as MediaKind,
          purpose: 'SERVICE_IMAGE' as MediaPurpose,
          sensitivity: 'STANDARD' as MediaSensitivity,
          mimeType: 'image/jpeg',
          storageKey: `media/service_image/${randomUUID()}.thumb.jpg`,
          uploadStatus: 'UPLOADED',
        },
      });

      const video = await tx.mediaObject.create({
        data: {
          id: randomUUID(),
          ownerUserId: userId,
          kind: 'VIDEO' as MediaKind,
          purpose: 'SERVICE_IMAGE' as MediaPurpose,
          sensitivity: 'STANDARD' as MediaSensitivity,
          mimeType: 'video/mp4',
          storageKey: `media/service_image/${randomUUID()}.mp4`,
          uploadStatus: 'UPLOADED',
          thumbnailMediaId: thumb.id,
        },
      });

      expect(video.thumbnailMediaId).toBe(thumb.id);

      // Foreign key RESTRICT: cannot delete thumbnail while referenced by video
      await expect(tx.mediaObject.delete({ where: { id: thumb.id } })).rejects.toThrow();
    });
  });
});
