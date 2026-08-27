import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CommissionStatus,
  PaymentStatus,
  PaymentType,
  Prisma,
  RegistrationFeeStatus,
  UserRole,
} from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CommissionsService } from '../commissions/commissions.service';
import {
  REGISTRATION_FEE_GROSS,
  gstBreakdown,
} from '../common/gst';
import {
  InitiatePaymentDto,
  MockCompletePaymentDto,
  VerifyPaymentDto,
} from './dto/payment.dto';

type RazorpayOrder = { id: string; amount: number; currency: string };

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private razorpay: {
    orders: { create: (opts: Record<string, unknown>) => Promise<RazorpayOrder> };
  } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly commissions: CommissionsService,
  ) {
    const keyId = this.config.get<string>('RAZORPAY_KEY_ID');
    const keySecret = this.config.get<string>('RAZORPAY_KEY_SECRET');
    if (keyId && keySecret && !this.isMockMode()) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Razorpay = require('razorpay');
      this.razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    }
  }

  isMockMode(): boolean {
    if (this.config.get('PAYMENTS_MOCK') === 'true') return true;
    if (this.config.get('PAYMENTS_MOCK') === 'false') return false;
    return !this.config.get('RAZORPAY_KEY_ID');
  }

  async initiate(userId: string, role: UserRole, dto: InitiatePaymentDto) {
    if (role !== UserRole.TUTOR) {
      throw new ForbiddenException('Only tutors can initiate payments');
    }
    const tutor = await this.prisma.tutor.findUnique({
      where: { userId },
      include: { user: true },
    });
    if (!tutor) throw new NotFoundException('Tutor profile not found');

    if (dto.type === 'REGISTRATION') {
      return this.initiateRegistration(tutor);
    }
    if (!dto.commissionId) {
      throw new BadRequestException('commissionId is required');
    }
    return this.initiateCommission(tutor, dto.commissionId);
  }

  private async initiateRegistration(tutor: {
    id: string;
    userId: string;
    user: { id: string; name: string; email: string };
    registrationFeeStatus: RegistrationFeeStatus;
    registrationFeeChoice: string | null;
  }) {
    if (tutor.registrationFeeStatus === RegistrationFeeStatus.PAID) {
      throw new BadRequestException('Registration fee already paid');
    }
    if (tutor.registrationFeeStatus === RegistrationFeeStatus.WAIVED) {
      throw new BadRequestException('Registration fee waived');
    }
    if (tutor.registrationFeeChoice === 'EARN_FIRST') {
      throw new BadRequestException(
        'Earn First selected — registration is deferred to first commission',
      );
    }

    const { taxable, gst } = gstBreakdown(REGISTRATION_FEE_GROSS);
    const payment = await this.prisma.payment.create({
      data: {
        payerId: tutor.userId,
        type: PaymentType.REGISTRATION,
        status: PaymentStatus.CREATED,
        grossAmount: REGISTRATION_FEE_GROSS,
        taxableAmount: new Prisma.Decimal(taxable),
        gstAmount: new Prisma.Decimal(gst),
        entityType: 'Tutor',
        entityId: tutor.id,
      },
    });

    return this.createGatewayOrder(payment.id, REGISTRATION_FEE_GROSS, tutor.user);
  }

  private async initiateCommission(
    tutor: {
      id: string;
      userId: string;
      user: { id: string; name: string; email: string };
    },
    commissionId: string,
  ) {
    const commission = await this.prisma.commission.findFirst({
      where: { id: commissionId, tutorId: tutor.id },
    });
    if (!commission) throw new NotFoundException('Commission not found');
    if (
      commission.status !== CommissionStatus.GENERATED &&
      commission.status !== CommissionStatus.OVERDUE
    ) {
      throw new BadRequestException(
        `Commission cannot be paid in status ${commission.status}`,
      );
    }

    const payment = await this.prisma.payment.create({
      data: {
        payerId: tutor.userId,
        type: PaymentType.COMMISSION,
        status: PaymentStatus.CREATED,
        grossAmount: commission.grossAmount,
        taxableAmount: commission.taxableAmount,
        gstAmount: commission.gstAmount,
        entityType: 'Commission',
        entityId: commission.id,
      },
    });

    return this.createGatewayOrder(
      payment.id,
      commission.grossAmount,
      tutor.user,
    );
  }

  private async createGatewayOrder(
    paymentId: string,
    amountRupees: number,
    user: { name: string; email: string },
  ) {
    const amountPaise = amountRupees * 100;
    let orderId: string;
    let mock = false;

    if (this.isMockMode() || !this.razorpay) {
      mock = true;
      orderId = `order_mock_${paymentId.replace(/-/g, '').slice(0, 14)}`;
    } else {
      const order = await this.razorpay.orders.create({
        amount: amountPaise,
        currency: 'INR',
        receipt: paymentId.slice(0, 40),
        notes: { paymentId },
      });
      orderId = order.id;
    }

    const payment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        gatewayOrderId: orderId,
        status: PaymentStatus.PENDING,
      },
    });

    return {
      paymentId: payment.id,
      orderId,
      amount: amountRupees,
      amountPaise,
      currency: 'INR',
      keyId: this.config.get<string>('RAZORPAY_KEY_ID') ?? null,
      mock,
      prefill: { name: user.name, email: user.email },
      // Explicitly no subscription / recurring fields
    };
  }

  async verifyClient(userId: string, dto: VerifyPaymentDto) {
    const payment = await this.prisma.payment.findFirst({
      where: { gatewayOrderId: dto.razorpayOrderId, payerId: userId },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status === PaymentStatus.SUCCESS) {
      return this.serialize(payment.id);
    }

    const secret = this.config.get<string>('RAZORPAY_KEY_SECRET');
    if (!secret || this.isMockMode()) {
      throw new BadRequestException(
        'Use mock-complete endpoint when PAYMENTS_MOCK is enabled',
      );
    }

    const body = `${dto.razorpayOrderId}|${dto.razorpayPaymentId}`;
    const expected = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');
    if (expected !== dto.razorpaySignature) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          failureReason: 'Invalid signature',
        },
      });
      throw new BadRequestException('Invalid payment signature');
    }

    return this.markSuccess(payment.id, {
      gatewayPaymentId: dto.razorpayPaymentId,
      gatewaySignature: dto.razorpaySignature,
    });
  }

  async mockComplete(userId: string, dto: MockCompletePaymentDto) {
    if (!this.isMockMode()) {
      throw new BadRequestException('Mock payments are disabled');
    }
    const payment = await this.prisma.payment.findFirst({
      where: { id: dto.paymentId, payerId: userId },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status === PaymentStatus.SUCCESS) {
      return this.serialize(payment.id);
    }
    return this.markSuccess(payment.id, {
      gatewayPaymentId: `pay_mock_${Date.now()}`,
      gatewaySignature: 'mock',
    });
  }

  async handleWebhook(rawBody: Buffer, signature: string | undefined) {
    // Fail-closed outside mock mode: unsigned webhooks must never mark payments SUCCESS.
    if (!this.isMockMode()) {
      const webhookSecret = this.config.get<string>('RAZORPAY_WEBHOOK_SECRET')?.trim();
      if (!webhookSecret) {
        throw new BadRequestException(
          'RAZORPAY_WEBHOOK_SECRET is required when PAYMENTS_MOCK is disabled',
        );
      }
      if (!signature) {
        throw new BadRequestException('Missing X-Razorpay-Signature');
      }
      const expected = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');
      if (expected !== signature) {
        throw new BadRequestException('Invalid webhook signature');
      }
    }

    const payload = JSON.parse(rawBody.toString('utf8')) as {
      event?: string;
      payload?: {
        payment?: {
          entity?: {
            id?: string;
            order_id?: string;
            status?: string;
          };
        };
      };
    };

    const event = payload.event;
    const entity = payload.payload?.payment?.entity;
    if (!entity?.order_id) {
      return { ok: true, ignored: true };
    }

    const payment = await this.prisma.payment.findUnique({
      where: { gatewayOrderId: entity.order_id },
    });
    if (!payment) {
      this.logger.warn(`Webhook for unknown order ${entity.order_id}`);
      return { ok: true, ignored: true };
    }

    // Idempotent — already SUCCESS
    if (payment.status === PaymentStatus.SUCCESS) {
      return { ok: true, idempotent: true, paymentId: payment.id };
    }

    if (event === 'payment.captured' || entity.status === 'captured') {
      await this.markSuccess(payment.id, {
        gatewayPaymentId: entity.id,
      });
      return { ok: true, paymentId: payment.id };
    }

    if (event === 'payment.failed') {
      // Failure must not change commission/registration business state
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          failureReason: 'Gateway reported failure',
          gatewayPaymentId: entity.id,
        },
      });
      return { ok: true, failed: true, paymentId: payment.id };
    }

    return { ok: true, ignored: true };
  }

  async history(userId: string) {
    const rows = await this.prisma.payment.findMany({
      where: { payerId: userId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((p) => ({
      id: p.id,
      type: p.type,
      status: p.status,
      grossAmount: p.grossAmount,
      taxableAmount: Number(p.taxableAmount),
      gstAmount: Number(p.gstAmount),
      entityType: p.entityType,
      entityId: p.entityId,
      gatewayOrderId: p.gatewayOrderId,
      gatewayPaymentId: p.gatewayPaymentId,
      createdAt: p.createdAt,
    }));
  }

  async getOne(userId: string, id: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, payerId: userId },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    return this.serialize(payment.id);
  }

  private async markSuccess(
    paymentId: string,
    gateway: { gatewayPaymentId?: string; gatewaySignature?: string },
  ) {
    const payment = await this.prisma.payment.findUniqueOrThrow({
      where: { id: paymentId },
      include: { payer: true },
    });

    if (payment.status === PaymentStatus.SUCCESS) {
      return this.serialize(paymentId);
    }

    await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.SUCCESS,
        gatewayPaymentId: gateway.gatewayPaymentId,
        gatewaySignature: gateway.gatewaySignature,
      },
    });

    if (payment.type === PaymentType.REGISTRATION) {
      await this.prisma.tutor.update({
        where: { id: payment.entityId },
        data: { registrationFeeStatus: RegistrationFeeStatus.PAID },
      });
    } else if (payment.type === PaymentType.COMMISSION) {
      await this.commissions.markPaid(payment.entityId);
    }

    void this.notifications
      .enqueueEmail({
        userId: payment.payerId,
        event: 'PAYMENT_RECEIPT',
        to: payment.payer.email,
        subject: 'TutorConnect payment receipt',
        text: `Hi ${payment.payer.name}, payment of ₹${payment.grossAmount} received (${payment.type}). Taxable ₹${Number(payment.taxableAmount)}, GST ₹${Number(payment.gstAmount)}. Ref ${payment.id}`,
        html: `<p>Hi ${payment.payer.name},</p>
          <p>Payment received for <strong>${payment.type}</strong>.</p>
          <ul>
            <li>Gross (incl. GST): ₹${payment.grossAmount}</li>
            <li>Taxable: ₹${Number(payment.taxableAmount)}</li>
            <li>GST: ₹${Number(payment.gstAmount)}</li>
            <li>Ref: ${payment.id}</li>
          </ul>`,
        payload: {
          paymentId: payment.id,
          type: payment.type,
          grossAmount: payment.grossAmount,
        },
      })
      .catch(() => undefined);

    await this.audit.log({
      actorId: payment.payerId,
      action: 'PAYMENT_SUCCESS',
      entityType: 'Payment',
      entityId: payment.id,
      metadata: { type: payment.type, grossAmount: payment.grossAmount },
    });

    return this.serialize(paymentId);
  }

  private async serialize(id: string) {
    const p = await this.prisma.payment.findUniqueOrThrow({ where: { id } });
    return {
      id: p.id,
      type: p.type,
      status: p.status,
      grossAmount: p.grossAmount,
      taxableAmount: Number(p.taxableAmount),
      gstAmount: Number(p.gstAmount),
      entityType: p.entityType,
      entityId: p.entityId,
      gatewayOrderId: p.gatewayOrderId,
      gatewayPaymentId: p.gatewayPaymentId,
      createdAt: p.createdAt,
    };
  }
}
