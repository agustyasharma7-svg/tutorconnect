import { scoreTutor } from './matching-score';

describe('scoreTutor', () => {
  const base = {
    scheduleScore: 1,
    distanceKm: null as number | null,
    radiusKm: null as number | null,
    experienceYears: 5,
    needsGeo: false,
  };

  it('boosts verified tutors', () => {
    const plain = scoreTutor({ ...base, isVerified: false });
    const verified = scoreTutor({ ...base, isVerified: true });
    expect(verified - plain).toBe(18);
  });

  it('includes ratingAvg × 2', () => {
    const low = scoreTutor({ ...base, ratingAvg: 0 });
    const high = scoreTutor({ ...base, ratingAvg: 5 });
    expect(high - low).toBe(10);
  });

  it('rejects tutors outside radius when geo required', () => {
    expect(
      scoreTutor({
        ...base,
        needsGeo: true,
        distanceKm: 25,
        radiusKm: 10,
      }),
    ).toBe(-1);
  });
});
