export type MockPayment = {
  payment_bank: string;
  payment_account: string;
  payment_reference: string;
  payment_expires_at: string;
};

export function generateMockPayment(reference: string): MockPayment {
  const account = Math.floor(1000000000 + Math.random() * 9000000000).toString();
  const expiresAt = new Date(Date.now() + 120 * 60 * 1000).toISOString();

  return {
    payment_bank: 'Demo Bank',
    payment_account: account,
    payment_reference: reference,
    payment_expires_at: expiresAt,
  };
}
