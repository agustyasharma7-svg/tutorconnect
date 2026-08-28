import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { PiiCryptoService } from './pii-crypto.service';
import { GeoService } from './geo.service';
import { GeoController } from './geo.controller';

@Global()
@Module({
  controllers: [GeoController],
  providers: [AuditService, PiiCryptoService, GeoService],
  exports: [AuditService, PiiCryptoService, GeoService],
})
export class CommonModule {}
