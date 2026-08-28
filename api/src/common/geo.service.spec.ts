import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GeoService } from './geo.service';
import { geocodePincodeStub } from './geo';

describe('GeoService.resolveCoordinates', () => {
  function makeService(env: Record<string, string | undefined> = {}) {
    const config = {
      get: (key: string) => env[key],
    } as unknown as ConfigService;
    return new GeoService(config);
  }

  it('prefers valid client lat/lng over pincode', async () => {
    const svc = makeService({});
    const result = await svc.resolveCoordinates({
      latitude: 19.076,
      longitude: 72.8777,
      pincode: '110001',
    });
    expect(result).toEqual({
      latitude: 19.076,
      longitude: 72.8777,
      source: 'client',
    });
  });

  it('falls back to stub when no Maps key', async () => {
    const svc = makeService({});
    const stub = geocodePincodeStub('400001');
    const result = await svc.resolveCoordinates({ pincode: '400001' });
    expect(result).toEqual({ ...stub, source: 'stub' });
  });

  it('rejects missing pincode and coords', async () => {
    const svc = makeService({});
    await expect(svc.resolveCoordinates({})).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('ignores out-of-range client coords and uses pincode stub', async () => {
    const svc = makeService({});
    const stub = geocodePincodeStub('560001');
    const result = await svc.resolveCoordinates({
      latitude: 51.5,
      longitude: -0.12,
      pincode: '560001',
    });
    expect(result).toEqual({ ...stub, source: 'stub' });
  });
});
