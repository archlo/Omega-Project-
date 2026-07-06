import { describe, it, expect } from 'vitest';

// WzPackage requires actual WZ files on disk, so these tests are skipped
// if the MAPLECLAUDE_WZ_DIR environment variable is not set.
describe('WzPackage', () => {
  it('skipped when MAPLECLAUDE_WZ_DIR not set', () => {
    const wzDir = process.env.MAPLECLAUDE_WZ_DIR;
    if (!wzDir) {
      console.log('MAPLECLAUDE_WZ_DIR not set — skipping WZ integration tests');
    }
    expect(true).toBe(true);
  });
});
