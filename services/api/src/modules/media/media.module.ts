/**
 * MediaModule (T3.2, owner A08; M14 Media).
 * Requirements: MEDIA-001..009, INFRA-003, CHAT-003
 * BP §20, §74, §76; ARCH §4 M14, §5.3; D-001, D-011
 */
import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { FakeSpeechToTextService } from './speech-to-text/fake-speech-to-text.service';
import { SPEECH_TO_TEXT_SERVICE } from './speech-to-text/speech-to-text.interface';
import { FakeStorageService } from './storage/fake-storage.service';
import { OBJECT_STORAGE } from './storage/storage.interface';
import { ThumbnailService } from './thumbnail/thumbnail.service';

@Module({
  imports: [IdentityModule],
  controllers: [MediaController],
  providers: [
    MediaService,
    ThumbnailService,
    {
      provide: OBJECT_STORAGE,
      useClass: FakeStorageService,
    },
    {
      provide: SPEECH_TO_TEXT_SERVICE,
      useClass: FakeSpeechToTextService,
    },
  ],
  exports: [MediaService, ThumbnailService, OBJECT_STORAGE, SPEECH_TO_TEXT_SERVICE],
})
export class MediaModule {}
