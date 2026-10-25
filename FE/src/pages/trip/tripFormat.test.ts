import { describe, expect, it } from 'bun:test';

import { recordedByLine } from './tripFormat';

describe('recordedByLine', () => {
  it('marks an entry the office made for the escort', () => {
    expect(recordedByLine('Đỗ Minh Khôi', 'WEB')).toBe(
      'Recorded by Đỗ Minh Khôi from the office, for the escort',
    );
  });

  it('says an entry came from the cab', () => {
    expect(recordedByLine('Trần Văn Minh', 'CAB_TABLET')).toBe(
      'Recorded by Trần Văn Minh in the cab',
    );
  });

  it('says nothing when the record names nobody', () => {
    expect(recordedByLine(null, 'WEB')).toBeNull();
  });
});
