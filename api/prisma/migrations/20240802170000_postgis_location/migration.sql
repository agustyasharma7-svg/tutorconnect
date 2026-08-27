-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Geography columns (WGS84)
ALTER TABLE "tutors" ADD COLUMN IF NOT EXISTS "location" geography(Point, 4326);
ALTER TABLE "requirements" ADD COLUMN IF NOT EXISTS "location" geography(Point, 4326);

-- Backfill from existing lat/lng
UPDATE "tutors"
SET "location" = ST_SetSRID(ST_MakePoint("longitude", "latitude"), 4326)::geography
WHERE "latitude" IS NOT NULL AND "longitude" IS NOT NULL;

UPDATE "requirements"
SET "location" = ST_SetSRID(ST_MakePoint("longitude", "latitude"), 4326)::geography
WHERE "latitude" IS NOT NULL AND "longitude" IS NOT NULL;

-- GIST indexes for distance queries
CREATE INDEX IF NOT EXISTS "tutors_location_gix" ON "tutors" USING GIST ("location");
CREATE INDEX IF NOT EXISTS "requirements_location_gix" ON "requirements" USING GIST ("location");

-- Keep geography in sync whenever lat/lng change
CREATE OR REPLACE FUNCTION sync_row_location()
RETURNS trigger AS $$
BEGIN
  IF NEW.latitude IS NULL OR NEW.longitude IS NULL THEN
    NEW.location := NULL;
  ELSE
    NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tutors_sync_location ON "tutors";
CREATE TRIGGER tutors_sync_location
  BEFORE INSERT OR UPDATE OF latitude, longitude ON "tutors"
  FOR EACH ROW EXECUTE PROCEDURE sync_row_location();

DROP TRIGGER IF EXISTS requirements_sync_location ON "requirements";
CREATE TRIGGER requirements_sync_location
  BEFORE INSERT OR UPDATE OF latitude, longitude ON "requirements"
  FOR EACH ROW EXECUTE PROCEDURE sync_row_location();
