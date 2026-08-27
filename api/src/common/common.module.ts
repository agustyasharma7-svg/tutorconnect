import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { PiiCryptoService } from './pii-crypto.service';

@Global()
@Module({
  providers: [AuditService, PiiCryptoService],
  exports: [AuditService, PiiCryptoService],
})
export class CommonModule {}
