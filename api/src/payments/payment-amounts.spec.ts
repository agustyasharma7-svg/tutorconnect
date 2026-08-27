import {
  commissionGrossFromMonthlyFee,
  gstBreakdown,
  REGISTRATION_FEE_GROSS,
} from '../common/gst';

/** Lightweight payment math integration — mirrors PaymentsService mock path totals. */
describe('mock payment amounts', () => {
  it('registration fee matches REGISTRATION_FEE_GROSS', () => {
    expect(REGISTRATION_FEE_GROSS).toBe(199);
    const parts = gstBreakdown(REGISTRATION_FEE_GROSS);
    expect(parts.taxable + parts.gst).toBeCloseTo(199, 1);
  });

  it('commission + deferred registration totals correctly', () => {
    const commissionGross = commissionGrossFromMonthlyFee(8000);
    expect(commissionGross).toBe(2400);
    const total = commissionGross + REGISTRATION_FEE_GROSS;
    expect(total).toBe(2599);
  });
});
