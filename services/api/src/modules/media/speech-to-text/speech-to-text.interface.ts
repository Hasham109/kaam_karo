/**
 * SpeechToText interface for audio transcription (BP §76.1, §77.1; D-009; MEDIA-006).
 */

export interface SpeechToTextResult {
  readonly transcriptRef: string;
  readonly text: string;
}

export interface SpeechToTextService {
  /**
   * Transcribes an audio recording by storage key.
   * Throws an error on failure (which the caller catches to leave audio usable).
   */
  transcribeAudio(mediaId: string, storageKey: string): Promise<SpeechToTextResult>;
}

export const SPEECH_TO_TEXT_SERVICE = Symbol('SPEECH_TO_TEXT_SERVICE');
