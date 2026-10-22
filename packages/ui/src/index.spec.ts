import { describe, expect, it } from 'vitest';
import { UI_PACKAGE_NAME } from './index';

describe('[PLAT-001] ui skeleton', () => {
  it('[PLAT-001] shared UI package loads', () => {
    expect(UI_PACKAGE_NAME).toBe('@kaamkaro/ui');
  });
});
