import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import { GeoService } from './geo.service';

class ResolveGeoQueryDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/)
  pincode?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(6)
  @Max(38)
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(68)
  @Max(98)
  longitude?: number;
}

@ApiTags('geo')
@Controller('geo')
export class GeoController {
  constructor(private readonly geo: GeoService) {}

  /** Resolve coordinates: prefer lat/lng, else geocode pincode (Google → stub). */
  @Get('resolve')
  resolve(@Query() query: ResolveGeoQueryDto) {
    return this.geo.resolveCoordinates(query);
  }
}
