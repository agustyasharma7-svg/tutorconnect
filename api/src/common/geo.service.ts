import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { geocodePincodeStub, isCoordsInIndia } from './geo';

export type GeoSource = 'client' | 'google' | 'stub';

export type ResolvedCoords = {
  latitude: number;
  longitude: number;
  source: GeoSource;
};

@Injectable()
export class GeoService {
  private readonly logger = new Logger(GeoService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Prefer client lat/lng → Google Geocoding (pincode) → deterministic stub.
   */
  async resolveCoordinates(input: {
    latitude?: number | null;
    longitude?: number | null;
    pincode?: string | null;
  }): Promise<ResolvedCoords> {
    const lat = input.latitude != null ? Number(input.latitude) : null;
    const lng = input.longitude != null ? Number(input.longitude) : null;

    if (lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng)) {
      if (isCoordsInIndia(lat, lng)) {
        return { latitude: lat, longitude: lng, source: 'client' };
      }
      this.logger.warn(
        `Ignoring out-of-range coordinates lat=${lat} lng=${lng}; falling back to pincode`,
      );
    }

    const pin = input.pincode?.trim() ?? '';
    if (!/^\d{6}$/.test(pin)) {
      throw new BadRequestException(
        'Provide a valid 6-digit Indian pincode or latitude/longitude within India',
      );
    }

    const fromGoogle = await this.geocodePincodeGoogle(pin);
    if (fromGoogle) {
      return { ...fromGoogle, source: 'google' };
    }

    this.logger.warn(
      `Geocode stub used for pincode ${pin} (set GOOGLE_MAPS_API_KEY for real coords)`,
    );
    return { ...geocodePincodeStub(pin), source: 'stub' };
  }

  private async geocodePincodeGoogle(
    pincode: string,
  ): Promise<{ latitude: number; longitude: number } | null> {
    const key = this.config.get<string>('GOOGLE_MAPS_API_KEY')?.trim();
    if (!key) return null;

    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('components', `postal_code:${pincode}|country:IN`);
    url.searchParams.set('key', key);

    try {
      const res = await fetch(url.toString());
      if (!res.ok) {
        this.logger.warn(`Google Geocoding HTTP ${res.status} for ${pincode}`);
        return null;
      }
      const data = (await res.json()) as {
        status: string;
        results?: Array<{ geometry?: { location?: { lat: number; lng: number } } }>;
        error_message?: string;
      };
      if (data.status !== 'OK' || !data.results?.[0]?.geometry?.location) {
        this.logger.warn(
          `Google Geocoding status=${data.status} for ${pincode}` +
            (data.error_message ? `: ${data.error_message}` : ''),
        );
        return null;
      }
      const { lat, lng } = data.results[0].geometry.location;
      if (!isCoordsInIndia(lat, lng)) return null;
      return { latitude: lat, longitude: lng };
    } catch (err) {
      this.logger.warn(`Google Geocoding failed for ${pincode}: ${String(err)}`);
      return null;
    }
  }
}
