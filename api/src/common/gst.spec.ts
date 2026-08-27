import {
  commissionGrossFromMonthlyFee,
  gstBreakdown,
  REGISTRATION_FEE_GROSS,
  splitCgstSgst,
} from './gst';

describe('gst helpers', () => {
  it('splits inclusive GST via ÷1.18', () => {
    const { taxable, gst } = gstBreakdown(REGISTRATION_FEE_GROSS);
    expect(taxable + gst).toBeCloseTo(REGISTRATION_FEE_GROSS, 1);
    expect(taxable).toBeCloseTo(168.64, 1);
    expect(gst).toBeCloseTo(30.36, 1);
  });

  it('computes 30% commission from monthly fee', () => {
    expect(commissionGrossFromMonthlyFee(10000)).toBe(3000);
    expect(commissionGrossFromMonthlyFee(5000)).toBe(1500);
  });

  it('splits GST into CGST + SGST', () => {
    const { cgst, sgst } = splitCgstSgst(30.36);
    expect(cgst + sgst).toBeCloseTo(30.36, 2);
  });
});
