import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class WaiveCommissionDto {
  @ApiProperty()
  @IsString()
  @MinLength(5)
  reason!: string;
}

export class InitiatePaymentDto {
  @ApiProperty({ enum: ['REGISTRATION', 'COMMISSION'] })
  @IsIn(['REGISTRATION', 'COMMISSION'])
  type!: 'REGISTRATION' | 'COMMISSION';

  @ApiPropertyOptional({ description: 'Required when type=COMMISSION' })
  @IsOptional()
  @IsString()
  commissionId?: string;
}

export class VerifyPaymentDto {
  @ApiProperty()
  @IsString()
  razorpayOrderId!: string;

  @ApiProperty()
  @IsString()
  razorpayPaymentId!: string;

  @ApiProperty()
  @IsString()
  razorpaySignature!: string;
}

export class MockCompletePaymentDto {
  @ApiProperty()
  @IsString()
  paymentId!: string;
}
