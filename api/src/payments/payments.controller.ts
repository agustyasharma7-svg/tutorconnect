import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import {
  CurrentUser,
  JwtPayload,
} from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { PaymentsService } from './payments.service';
import {
  InitiatePaymentDto,
  MockCompletePaymentDto,
  VerifyPaymentDto,
} from './dto/payment.dto';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('webhook')
  async webhook(@Req() req: Request) {
    const raw =
      (req as Request & { rawBody?: Buffer }).rawBody ??
      Buffer.from(JSON.stringify(req.body ?? {}));
    const signature = req.headers['x-razorpay-signature'] as string | undefined;
    return this.payments.handleWebhook(raw, signature);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.TUTOR)
  @Post('initiate')
  initiate(@CurrentUser() user: JwtPayload, @Body() dto: InitiatePaymentDto) {
    return this.payments.initiate(user.sub, user.role as UserRole, dto);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.TUTOR)
  @Post('verify')
  verify(@CurrentUser() user: JwtPayload, @Body() dto: VerifyPaymentDto) {
    return this.payments.verifyClient(user.sub, dto);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.TUTOR)
  @Post('mock-complete')
  mockComplete(
    @CurrentUser() user: JwtPayload,
    @Body() dto: MockCompletePaymentDto,
  ) {
    return this.payments.mockComplete(user.sub, dto);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.TUTOR)
  @Get('history')
  history(@CurrentUser() user: JwtPayload) {
    return this.payments.history(user.sub);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.TUTOR)
  @Get(':id')
  one(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.payments.getOne(user.sub, id);
  }
}
