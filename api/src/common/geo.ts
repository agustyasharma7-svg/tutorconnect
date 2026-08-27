import { Prisma, PrismaClient } from '@prisma/client';

/** Deterministic stub geocode until Maps API is wired. */
export function geocodePincode(pincode: string): { latitude: number; longitude: number } {
  const n = Number(pincode.slice(0, 3)) || 110;
  return {
    latitude: 28.4 + (n % 50) / 100,
    longitude: 77.0 + (n % 40) / 100,
  };
}

type DistanceRow = { id: string; distance_km: number };

/**
 * Tutors within each tutor's teaching radius of a requirement (PostGIS ST_DWithin).
 */
export async function distancesFromRequirement(
  prisma: PrismaClient,
  requirementId: string,
): Promise<Map<string, number>> {
  const rows = await prisma.$queryRaw<DistanceRow[]>`
    SELECT t.id,
           ST_Distance(t.location, r.location) / 1000.0 AS distance_km
    FROM tutors t
    INNER JOIN requirements r ON r.id = ${requirementId}
    WHERE t.is_discoverable = true
      AND t.location IS NOT NULL
      AND r.location IS NOT NULL
      AND t.teaching_radius_km IS NOT NULL
      AND ST_DWithin(
        t.location,
        r.location,
        (t.teaching_radius_km::double precision) * 1000.0
      )
  `;
  return new Map(rows.map((r) => [r.id, Number(r.distance_km)]));
}

/**
 * Tutors within their teaching radius of an origin point (search by pincode).
 */
export async function distancesFromPoint(
  prisma: PrismaClient,
  latitude: number,
  longitude: number,
  tutorIds?: string[],
): Promise<Map<string, number>> {
  if (tutorIds && tutorIds.length === 0) return new Map();

  const rows =
    tutorIds && tutorIds.length > 0
      ? await prisma.$queryRaw<DistanceRow[]>`
          SELECT t.id,
                 ST_Distance(
                   t.location,
                   ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
                 ) / 1000.0 AS distance_km
          FROM tutors t
          WHERE t.id IN (${Prisma.join(tutorIds)})
            AND t.location IS NOT NULL
            AND t.teaching_radius_km IS NOT NULL
            AND ST_DWithin(
              t.location,
              ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
              (t.teaching_radius_km::double precision) * 1000.0
            )
        `
      : await prisma.$queryRaw<DistanceRow[]>`
          SELECT t.id,
                 ST_Distance(
                   t.location,
                   ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
                 ) / 1000.0 AS distance_km
          FROM tutors t
          WHERE t.is_discoverable = true
            AND t.location IS NOT NULL
            AND t.teaching_radius_km IS NOT NULL
            AND ST_DWithin(
              t.location,
              ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
              (t.teaching_radius_km::double precision) * 1000.0
            )
        `;

  return new Map(rows.map((r) => [r.id, Number(r.distance_km)]));
}
