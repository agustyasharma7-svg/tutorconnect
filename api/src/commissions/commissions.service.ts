import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AgreementStatus,
  CommissionStatus,
  Prisma,
  RegistrationFeeStatus,
} from '@prisma/client';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  REGISTRATION_FEE_GROSS,
  commissionGrossFromMonthlyFee,
  gstBreakdown,
  splitCgstSgst,
} from '../common/gst';
import { WaiveCommissionDto } from '../payments/dto/payment.dto';

@Injectable()
export class CommissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly cloudinary: CloudinaryService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * One-time commission when agreement becomes ACTIVE.
   * Skips if tutor–student pair already has a commission row.
   */
  async generateForAgreement(agreementId: string) {
    const agreement = await this.prisma.agreement.findUnique({
      where: { id: agreementId },
      include: {
        match: {
          include: {
            tutor: { include: { user: true } },
            requirement: {
              include: { student: { include: { user: true } } },
            },
          },
        },
      },
    });
    if (!agreement) return null;

    if (
      agreement.status !== AgreementStatus.ACTIVE &&
      agreement.status !== AgreementStatus.COMPLETED
    ) {
      throw new BadRequestException(
        `Commission can only be generated for ACTIVE agreements (got ${agreement.status})`,
      );
    }

    const tutorId = agreement.match.tutorId;
    const studentId = agreement.match.requirement.studentId;

    const existing = await this.prisma.commission.findUnique({
      where: { tutorId_studentId: { tutorId, studentId } },
    });
    if (existing) {
      await this.audit.log({
        action: 'COMMISSION_SKIPPED_DUPLICATE',
        entityType: 'Commission',
        entityId: existing.id,
        metadata: { agreementId, tutorId, studentId },
      });
      return existing;
    }

    const byAgreement = await this.prisma.commission.findUnique({
      where: { agreementId },
    });
    if (byAgreement) return byAgreement;

    const commissionGross = commissionGrossFromMonthlyFee(agreement.monthlyFee);
    const commissionParts = gstBreakdown(commissionGross);

    const tutor = agreement.match.tutor;
    const includeRegistration =
      tutor.registrationFeeStatus === RegistrationFeeStatus.PENDING;
    const registrationGross = includeRegistration ? REGISTRATION_FEE_GROSS : 0;
    const registrationParts = gstBreakdown(registrationGross);

    const grossAmount = commissionGross + registrationGross;
    const taxableAmount =
      Math.round(
        (commissionParts.taxable + registrationParts.taxable) * 100,
      ) / 100;
    const gstAmount =
      Math.round((commissionParts.gst + registrationParts.gst) * 100) / 100;

    const dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + 7);

    const created = await this.prisma.commission.create({
      data: {
        tutorId,
        studentId,
        agreementId,
        monthlyFee: agreement.monthlyFee,
        commissionGross,
        commissionTaxable: new Prisma.Decimal(commissionParts.taxable),
        commissionGst: new Prisma.Decimal(commissionParts.gst),
        registrationGross,
        registrationTaxable: new Prisma.Decimal(registrationParts.taxable),
        registrationGst: new Prisma.Decimal(registrationParts.gst),
        taxableAmount: new Prisma.Decimal(taxableAmount),
        gstAmount: new Prisma.Decimal(gstAmount),
        grossAmount,
        status: CommissionStatus.GENERATED,
        dueAt,
      },
    });

    try {
      const pdf = await this.buildInvoicePdf(created.id);
      const uploaded = await this.cloudinary.uploadRawPdf(
        pdf,
        `commission-${created.id}.pdf`,
        'tutorconnect/invoices',
      );
      await this.prisma.commission.update({
        where: { id: created.id },
        data: {
          invoicePdfUrl: uploaded.secure_url,
          invoiceStorageKey: uploaded.public_id,
        },
      });
    } catch {
      // Invoice PDF optional if Cloudinary fails — commission still valid
    }

    const tutorUser = tutor.user;
    void this.notifications
      .enqueueEmail({
        userId: tutorUser.id,
        event: 'PAYMENT_DUE',
        to: tutorUser.email,
        subject: 'TutorConnect payment due',
        text: `Hi ${tutorUser.name}, payment of ₹${grossAmount} is due for your new agreement.`,
        html: `<p>Hi ${tutorUser.name},</p><p>Payment of <strong>₹${grossAmount}</strong> is due (commission ₹${commissionGross}${
          registrationGross ? ` + registration ₹${registrationGross}` : ''
        }).</p>`,
        payload: {
          commissionId: created.id,
          grossAmount,
          commissionGross,
          registrationGross,
        },
      })
      .catch(() => undefined);

    await this.audit.log({
      action: 'COMMISSION_GENERATED',
      entityType: 'Commission',
      entityId: created.id,
      metadata: { agreementId, grossAmount, registrationGross },
    });

    return this.serialize(created.id);
  }

  async listForTutor(userId: string) {
    const tutor = await this.prisma.tutor.findUnique({ where: { userId } });
    if (!tutor) throw new NotFoundException('Tutor profile not found');
    await this.markOverdue(tutor.id);
    const rows = await this.prisma.commission.findMany({
      where: { tutorId: tutor.id },
      orderBy: { createdAt: 'desc' },
      include: {
        student: { include: { user: { select: { name: true } } } },
        agreement: { select: { id: true, monthlyFee: true, status: true } },
      },
    });
    return rows.map((c) => this.toDto(c));
  }

  async getForTutor(userId: string, id: string) {
    const tutor = await this.prisma.tutor.findUnique({ where: { userId } });
    if (!tutor) throw new NotFoundException('Tutor profile not found');
    const c = await this.prisma.commission.findFirst({
      where: { id, tutorId: tutor.id },
      include: {
        student: { include: { user: { select: { name: true } } } },
        agreement: { select: { id: true, monthlyFee: true, status: true } },
      },
    });
    if (!c) throw new NotFoundException('Commission not found');
    return this.toDto(c);
  }

  async listAdmin() {
    const rows = await this.prisma.commission.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        tutor: { include: { user: { select: { name: true, email: true } } } },
        student: { include: { user: { select: { name: true } } } },
      },
    });
    return rows.map((c) => this.toDto(c));
  }

  async waive(adminUserId: string, id: string, dto: WaiveCommissionDto) {
    const c = await this.prisma.commission.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Commission not found');
    if (c.status === CommissionStatus.PAID) {
      throw new BadRequestException('Cannot waive a paid commission');
    }
    if (c.status === CommissionStatus.WAIVED) {
      throw new BadRequestException('Already waived');
    }
    const updated = await this.prisma.commission.update({
      where: { id },
      data: {
        status: CommissionStatus.WAIVED,
        waivedReason: dto.reason,
      },
    });
    await this.liftPaymentRestrictionIfClear(c.tutorId);
    await this.audit.log({
      actorId: adminUserId,
      action: 'COMMISSION_WAIVED',
      entityType: 'Commission',
      entityId: id,
      metadata: { reason: dto.reason },
    });
    return this.toDto(updated);
  }

  async markPaid(commissionId: string) {
    const c = await this.prisma.commission.findUnique({
      where: { id: commissionId },
    });
    if (!c) return c;

    if (c.status !== CommissionStatus.PAID) {
      await this.prisma.$transaction(async (tx) => {
        await tx.commission.update({
          where: { id: commissionId },
          data: { status: CommissionStatus.PAID, paidAt: new Date() },
        });
        if (c.registrationGross > 0) {
          await tx.tutor.update({
            where: { id: c.tutorId },
            data: { registrationFeeStatus: RegistrationFeeStatus.PAID },
          });
        }
      });
    }

    await this.liftPaymentRestrictionIfClear(c.tutorId);
    return this.prisma.commission.findUnique({ where: { id: commissionId } });
  }

  /** Scan all tutors for past-due GENERATED commissions. Returns count marked. */
  async processAllOverdue(): Promise<number> {
    const now = new Date();
    const overdue = await this.prisma.commission.findMany({
      where: {
        status: CommissionStatus.GENERATED,
        dueAt: { lt: now },
      },
      include: { tutor: { include: { user: true } } },
    });
    for (const row of overdue) {
      await this.applyOverdue(row);
    }
    return overdue.length;
  }

  private async markOverdue(tutorId: string) {
    const now = new Date();
    const overdue = await this.prisma.commission.findMany({
      where: {
        tutorId,
        status: CommissionStatus.GENERATED,
        dueAt: { lt: now },
      },
      include: { tutor: { include: { user: true } } },
    });
    for (const row of overdue) {
      await this.applyOverdue(row);
    }
  }

  private async applyOverdue(row: {
    id: string;
    grossAmount: number;
    tutorId: string;
    tutor: { user: { id: string; email: string; name: string } };
  }) {
    await this.prisma.commission.update({
      where: { id: row.id },
      data: { status: CommissionStatus.OVERDUE },
    });
    // Recommended account restriction: hide from marketplace until paid
    await this.prisma.tutor.update({
      where: { id: row.tutorId },
      data: { isDiscoverable: false },
    });
    await this.audit.log({
      action: 'COMMISSION_OVERDUE',
      entityType: 'Commission',
      entityId: row.id,
      metadata: { tutorId: row.tutorId, restrictedDiscoverable: true },
    });
    void this.notifications
      .enqueueEmail({
        userId: row.tutor.user.id,
        event: 'PAYMENT_OVERDUE',
        to: row.tutor.user.email,
        subject: 'TutorConnect commission overdue — profile hidden',
        text: `Hi ${row.tutor.user.name}, ₹${row.grossAmount} is overdue. Your profile is hidden from search until you pay.`,
        html: `<p>Hi ${row.tutor.user.name},</p>
          <p>Your commission of <strong>₹${row.grossAmount}</strong> is overdue.</p>
          <p>Your tutor profile is <strong>hidden from search</strong> until payment is completed.</p>`,
        payload: { commissionId: row.id, grossAmount: row.grossAmount },
      })
      .catch(() => undefined);
  }

  private async liftPaymentRestrictionIfClear(tutorId: string) {
    const stillDue = await this.prisma.commission.count({
      where: {
        tutorId,
        status: { in: [CommissionStatus.GENERATED, CommissionStatus.OVERDUE] },
      },
    });
    if (stillDue > 0) return;

    const tutor = await this.prisma.tutor.findUnique({
      where: { id: tutorId },
      include: {
        subjects: true,
        classes: true,
        boards: true,
        availability: true,
      },
    });
    if (!tutor) return;
    // Re-enable discoverability only if profile is complete (incl. admin verification)
    const complete =
      !!tutor.bio &&
      tutor.experienceYears != null &&
      !!tutor.photoUrl &&
      tutor.subjects.length > 0 &&
      tutor.classes.length > 0 &&
      tutor.boards.length > 0 &&
      tutor.availability.length > 0 &&
      tutor.teachingRadiusKm != null &&
      tutor.isVerified;
    if (complete) {
      await this.prisma.tutor.update({
        where: { id: tutorId },
        data: { isDiscoverable: true },
      });
      await this.audit.log({
        action: 'PAYMENT_RESTRICTION_LIFTED',
        entityType: 'Tutor',
        entityId: tutorId,
      });
    }
  }

  private async serialize(id: string) {
    const c = await this.prisma.commission.findUniqueOrThrow({
      where: { id },
      include: {
        student: { include: { user: { select: { name: true } } } },
        agreement: { select: { id: true, monthlyFee: true, status: true } },
      },
    });
    return this.toDto(c);
  }

  private toDto(c: {
    id: string;
    tutorId: string;
    studentId: string;
    agreementId: string;
    monthlyFee: number;
    commissionGross: number;
    commissionTaxable: Prisma.Decimal;
    commissionGst: Prisma.Decimal;
    registrationGross: number;
    registrationTaxable: Prisma.Decimal;
    registrationGst: Prisma.Decimal;
    taxableAmount: Prisma.Decimal;
    gstAmount: Prisma.Decimal;
    grossAmount: number;
    status: CommissionStatus;
    dueAt: Date | null;
    paidAt: Date | null;
    waivedReason: string | null;
    invoicePdfUrl: string | null;
    createdAt: Date;
    student?: { user: { name: string } };
    agreement?: { id: string; monthlyFee: number; status: string };
    tutor?: { user: { name: string; email?: string } };
  }) {
    const gst = Number(c.gstAmount);
    const { cgst, sgst } = splitCgstSgst(gst);
    return {
      id: c.id,
      tutorId: c.tutorId,
      studentId: c.studentId,
      agreementId: c.agreementId,
      monthlyFee: c.monthlyFee,
      lineItems: [
        {
          label: 'Platform commission (30% incl. GST)',
          gross: c.commissionGross,
          taxable: Number(c.commissionTaxable),
          gst: Number(c.commissionGst),
        },
        ...(c.registrationGross > 0
          ? [
              {
                label: 'Registration fee (incl. GST)',
                gross: c.registrationGross,
                taxable: Number(c.registrationTaxable),
                gst: Number(c.registrationGst),
              },
            ]
          : []),
      ],
      taxableAmount: Number(c.taxableAmount),
      gstAmount: gst,
      cgst,
      sgst,
      grossAmount: c.grossAmount,
      status: c.status,
      dueAt: c.dueAt,
      paidAt: c.paidAt,
      waivedReason: c.waivedReason,
      invoicePdfUrl: c.invoicePdfUrl,
      createdAt: c.createdAt,
      studentName: c.student?.user.name,
      tutorName: c.tutor?.user.name,
      agreement: c.agreement,
    };
  }

  private async buildInvoicePdf(commissionId: string): Promise<Buffer> {
    const c = await this.prisma.commission.findUniqueOrThrow({
      where: { id: commissionId },
      include: {
        tutor: { include: { user: true } },
        student: { include: { user: true } },
      },
    });
    const doc = await PDFDocument.create();
    const page = doc.addPage([595, 842]);
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    let y = 800;
    const draw = (text: string, size = 11, useBold = false) => {
      page.drawText(text, {
        x: 50,
        y,
        size,
        font: useBold ? bold : font,
        color: rgb(0.1, 0.1, 0.1),
      });
      y -= size + 8;
    };
    draw('TutorConnect India — Tax Invoice', 16, true);
    draw(`Invoice for commission ${c.id}`);
    draw(`Tutor: ${c.tutor.user.name}`);
    draw(`Student: ${c.student.user.name}`);
    draw(`Monthly fee reference: ₹${c.monthlyFee}`);
    y -= 8;
    draw(`Commission (incl. GST): ₹${c.commissionGross}`);
    draw(
      `  Taxable: ₹${Number(c.commissionTaxable)}  GST: ₹${Number(c.commissionGst)}`,
    );
    if (c.registrationGross > 0) {
      draw(`Registration fee (incl. GST): ₹${c.registrationGross}`);
      draw(
        `  Taxable: ₹${Number(c.registrationTaxable)}  GST: ₹${Number(c.registrationGst)}`,
      );
    }
    y -= 8;
    const { cgst, sgst } = splitCgstSgst(Number(c.gstAmount));
    draw(`Taxable total: ₹${Number(c.taxableAmount)}`, 12, true);
    draw(`CGST (9%): ₹${cgst}   SGST (9%): ₹${sgst}`);
    draw(`Gross payable (incl. GST): ₹${c.grossAmount}`, 12, true);
    draw('GST @ 18% inclusive — not added on top.', 9);
    const bytes = await doc.save();
    return Buffer.from(bytes);
  }
}
