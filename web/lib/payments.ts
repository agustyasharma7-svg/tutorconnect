import { apiWithAuth } from './api';

type InitiateResult = {
  paymentId: string;
  orderId: string;
  amount: number;
  amountPaise: number;
  currency: string;
  keyId: string | null;
  mock: boolean;
  prefill: { name: string; email: string };
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay'));
    document.body.appendChild(script);
  });
}

export async function startCheckout(
  token: string,
  body: { type: 'REGISTRATION' | 'COMMISSION'; commissionId?: string },
  locale: string,
) {
  const order = await apiWithAuth<InitiateResult>('/payments/initiate', token, {
    method: 'POST',
    body: JSON.stringify(body),
  });

  if (order.mock) {
    const paid = await apiWithAuth<{ id: string }>('/payments/mock-complete', token, {
      method: 'POST',
      body: JSON.stringify({ paymentId: order.paymentId }),
    });
    window.location.href = `/${locale}/payments/success?paymentId=${paid.id}`;
    return;
  }

  await loadRazorpayScript();
  const key =
    order.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';
  if (!key || !window.Razorpay) {
    throw new Error('Razorpay is not configured');
  }

  const rzp = new window.Razorpay({
    key,
    amount: order.amountPaise,
    currency: order.currency,
    name: 'TutorConnect India',
    description:
      body.type === 'REGISTRATION'
        ? 'Registration fee (GST inclusive)'
        : 'Platform commission (GST inclusive)',
    order_id: order.orderId,
    prefill: order.prefill,
    handler: async (response: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    }) => {
      try {
        const paid = await apiWithAuth<{ id: string }>('/payments/verify', token, {
          method: 'POST',
          body: JSON.stringify({
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          }),
        });
        window.location.href = `/${locale}/payments/success?paymentId=${paid.id}`;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'verify failed';
        window.location.href = `/${locale}/payments/fail?reason=${encodeURIComponent(msg)}`;
      }
    },
    modal: {
      ondismiss: () => {
        window.location.href = `/${locale}/payments/fail?reason=cancelled`;
      },
    },
  });
  rzp.open();
}
