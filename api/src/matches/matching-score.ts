/** Pure matching score — extracted for unit tests (Phase 6). */
export function scoreTutor(opts: {
  scheduleScore: number;
  distanceKm: number | null;
  radiusKm: number | null;
  experienceYears: number | null;
  needsGeo: boolean;
  isVerified?: boolean;
  ratingAvg?: number | null;
}): number {
  let score = 50 + opts.scheduleScore * 30;
  score += Math.min(opts.experienceYears ?? 0, 10);
  if (opts.isVerified) score += 18;
  if (opts.ratingAvg != null && opts.ratingAvg > 0) {
    score += opts.ratingAvg * 2;
  }
  if (opts.needsGeo && opts.distanceKm != null && opts.radiusKm != null) {
    if (opts.distanceKm <= opts.radiusKm) {
      score += 20 * (1 - opts.distanceKm / Math.max(opts.radiusKm, 1));
    } else {
      return -1;
    }
  }
  return Math.round(score * 10) / 10;
}
