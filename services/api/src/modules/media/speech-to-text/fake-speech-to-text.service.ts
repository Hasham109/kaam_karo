/**
 * Fake implementation of SpeechToText for development and tests (MEDIA-006, D-009).
 */
import { Injectable } from '@nestjs/common';
import type { SpeechToTextResult, SpeechToTextService } from './speech-to-text.interface';

@Injectable()
export class FakeSpeechToTextService implements SpeechToTextService {
  private shouldFail = false;

  setShouldFail(fail: boolean): void {
    this.shouldFail = fail;
  }

  async transcribeAudio(mediaId: string, storageKey: string): Promise<SpeechToTextResult> {
    if (this.shouldFail) {
      throw new Error(`STT_TRANSCRIPTION_FAILED: simulated transcription failure for ${mediaId}`);
    }

    const transcriptRef = `stt:fake:${mediaId}`;
    const text = `AC service required. Water leaking from indoor unit. (Auto-transcribed from ${storageKey})`;
    return {
      transcriptRef,
      text,
    };
  }
}
