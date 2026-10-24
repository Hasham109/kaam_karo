/**
 * RTL layout helper for Customer App (BP §78.2, I18N-003).
 */
import { type Locale, textDirection } from '@kaamkaro/i18n';
import { mirroring, type Mirroring } from '@kaamkaro/ui';

export function getAppMirroring(locale: Locale, globalIsRtl = false): Mirroring {
  return mirroring(textDirection(locale), globalIsRtl);
}
