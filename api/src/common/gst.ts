/** GST inclusive helpers — amount charged includes 18% GST (÷ 1.18). */

export const GST_RATE = 0.18;
export const GST_DIVISOR = 1.18;
export const COMMISSION_RATE = 0.3;
export const REGISTRATION_FEE_GROSS = 199;

export function gstBreakdown(grossInclusive: number): {
  taxable: number;
  gst: number;
} {
  const taxable = Math.round((grossInclusive / GST_DIVISOR) * 100) / 100;
  const gst = Math.round((grossInclusive - taxable) * 100) / 100;
  return { taxable, gst };
}

export function commissionGrossFromMonthlyFee(monthlyFee: number): number {
  return Math.round(monthlyFee * COMMISSION_RATE);
}

/** Split inclusive GST into CGST + SGST (intra-state default for MVP invoices). */
export function splitCgstSgst(gstAmount: number): { cgst: number; sgst: number } {
  const half = Math.round((gstAmount / 2) * 100) / 100;
  return { cgst: half, sgst: Math.round((gstAmount - half) * 100) / 100 };
}
