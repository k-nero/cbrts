import { describe, expect, test } from 'bun:test';

import { fileSize } from './file';

describe('fileSize', () => {
  test('kilobytes under a megabyte, then megabytes to one decimal', () => {
    expect(fileSize(200)).toBe('1 KB');
    expect(fileSize(412 * 1024)).toBe('412 KB');
    expect(fileSize(3.4 * 1024 * 1024)).toBe('3.4 MB');
  });
});
