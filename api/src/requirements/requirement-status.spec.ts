/**
 * Requirement publish status machine smoke (pure assertions mirroring service rules).
 * Full HTTP E2E lives in Playwright.
 */
describe('requirement status transitions', () => {
  const canPublish = (status: string) => status === 'DRAFT';
  const canComplete = (status: string) => status === 'ACTIVE';

  it('only DRAFT can publish', () => {
    expect(canPublish('DRAFT')).toBe(true);
    expect(canPublish('OPEN')).toBe(false);
  });

  it('only ACTIVE can complete', () => {
    expect(canComplete('ACTIVE')).toBe(true);
    expect(canComplete('MATCHED')).toBe(false);
  });
});
