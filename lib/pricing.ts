export const SURGE_TIERS = [
  { minSeats: 10, maxSeats: 999, multiplier: 1.0 }, // base (generous upper bound)
  { minSeats: 5, maxSeats: 9, multiplier: 1.1 },    // +10%
  { minSeats: 1, maxSeats: 4, multiplier: 1.25 },   // +25%
];

export function computeDynamicPrice(basePrice: number, seatsRemaining: number): number {
  const tier = SURGE_TIERS.find(
    (t) => seatsRemaining >= t.minSeats && seatsRemaining <= t.maxSeats
  );
  return Math.round(basePrice * (tier?.multiplier ?? 1.0));
}
