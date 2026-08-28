import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DocumentStatus,
  DocumentType,
  VerificationStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit.service';
import { PiiCryptoService } from '../common/pii-crypto.service';
import { TutorsService } from '../tutors/tutors.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

const ID_DOC_TYPES: DocumentType[] = [
  DocumentType.AADHAAR,
  DocumentType.PAN,
  DocumentType.DEGREE,
];

@Injectable()
export class VerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly pii: PiiCryptoService,
    private readonly tutors: TutorsService,
    private readonly notifications: NotificationsService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async getMine(userId: string) {
    const { tutor } = await this.tutors.ensureProfile(userId);
    const documents = await this.prisma.tutorDocument.findMany({
      where: { tutorId: tutor.id, type: { in: ID_DOC_TYPES } },
      orderBy: { createdAt: 'desc' },
    });
    return {
      verificationStatus: tutor.verificationStatus,
      isVerified: tutor.isVerified,
      verificationRejectReason: tutor.verificationRejectReason,
      documents: documents.map((d) => ({
        id: d.id,
        type: d.type,
        fileName: d.fileName,
        // Never return permanent public URL — signed on demand via admin/tutor view
        fileUrl: d.storageKey
          ? this.cloudinary.signedUrl(d.storageKey, {
              resourceType: d.fileName?.toLowerCase().endsWith('.pdf')
                ? 'raw'
                : 'image',
              expiresInSeconds: 300,
            })
          : null,
        status: d.status,
        verificationStatus: d.verificationStatus,
        piiMasked: this.pii.maskLast4(d.piiLast4),
        createdAt: d.createdAt,
      })),
    };
  }

  async uploadDocument(
    userId: string,
    type: DocumentType,
    file: Express.Multer.File,
    uploaded: { secure_url: string; public_id: string },
    documentNumber?: string,
  ) {
    if (!ID_DOC_TYPES.includes(type)) {
      throw new BadRequestException('Invalid verification document type');
    }
    const { tutor } = await this.tutors.ensureProfile(userId);

    let piiCiphertext: string | null = null;
    let piiLast4: string | null = null;
    if (documentNumber?.trim()) {
      const enc = this.pii.encrypt(documentNumber.trim());
      if (enc) {
        piiCiphertext = enc.ciphertext;
        piiLast4 = enc.last4;
      } else {
        piiLast4 = documentNumber.replace(/\s+/g, '').slice(-4);
      }
    }

    await this.prisma.tutorDocument.create({
      data: {
        tutorId: tutor.id,
        type,
        // Store public_id reference only; delivery uses signed URLs
        fileUrl: uploaded.public_id,
        fileName: file.originalname,
        storageKey: uploaded.public_id,
        status: DocumentStatus.PENDING_REVIEW,
        verificationStatus: VerificationStatus.PENDING,
        piiCiphertext,
        piiLast4,
      },
    });

    await this.prisma.tutor.update({
      where: { id: tutor.id },
      data: {
        verificationStatus: VerificationStatus.PENDING,
        isVerified: false,
        verificationRejectReason: null,
      },
    });

    await this.audit.log({
      actorId: userId,
      action: 'VERIFICATION_DOC_UPLOADED',
      entityType: 'Tutor',
      entityId: tutor.id,
      metadata: { type },
    });

    return this.getMine(userId);
  }

  async adminQueue() {
    const tutors = await this.prisma.tutor.findMany({
      where: { verificationStatus: VerificationStatus.PENDING },
      include: {
        user: { select: { id: true, name: true, email: true } },
        documents: {
          where: { type: { in: ID_DOC_TYPES } },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { updatedAt: 'asc' },
      take: 100,
    });
    return tutors.map((t) => ({
      tutorId: t.id,
      userId: t.user.id,
      name: t.user.name,
      email: t.user.email,
      verificationStatus: t.verificationStatus,
      documents: t.documents.map((d) => ({
        id: d.id,
        type: d.type,
        fileName: d.fileName,
        status: d.status,
        verificationStatus: d.verificationStatus,
        piiMasked: this.pii.maskLast4(d.piiLast4),
        createdAt: d.createdAt,
      })),
    }));
  }

  async viewDocument(adminId: string, documentId: string) {
    const doc = await this.prisma.tutorDocument.findUnique({
      where: { id: documentId },
      include: {
        tutor: { include: { user: { select: { name: true, email: true } } } },
      },
    });
    if (!doc) throw new NotFoundException('Document not found');

    await this.audit.log({
      actorId: adminId,
      action: 'VERIFICATION_DOC_VIEWED',
      entityType: 'TutorDocument',
      entityId: doc.id,
      metadata: { tutorId: doc.tutorId, type: doc.type },
    });

    return {
      id: doc.id,
      type: doc.type,
      fileName: doc.fileName,
      fileUrl: doc.storageKey
        ? this.cloudinary.signedUrl(doc.storageKey, {
            resourceType: doc.fileName?.toLowerCase().endsWith('.pdf')
              ? 'raw'
              : 'image',
            expiresInSeconds: 300,
          })
        : null,
      piiMasked: this.pii.maskLast4(doc.piiLast4),
      tutorName: doc.tutor.user.name,
      verificationStatus: doc.verificationStatus,
    };
  }

  async approve(adminId: string, tutorId: string) {
    const tutor = await this.prisma.tutor.findUnique({
      where: { id: tutorId },
      include: { user: true },
    });
    if (!tutor) throw new NotFoundException('Tutor not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.tutor.update({
        where: { id: tutorId },
        data: {
          verificationStatus: VerificationStatus.APPROVED,
          isVerified: true,
          verificationRejectReason: null,
        },
      });
      await tx.tutorDocument.updateMany({
        where: {
          tutorId,
          type: { in: ID_DOC_TYPES },
          verificationStatus: VerificationStatus.PENDING,
        },
        data: {
          verificationStatus: VerificationStatus.APPROVED,
          status: DocumentStatus.APPROVED,
          reviewedAt: new Date(),
          reviewedBy: adminId,
        },
      });
    });

    await this.audit.log({
      actorId: adminId,
      action: 'VERIFICATION_APPROVED',
      entityType: 'Tutor',
      entityId: tutorId,
    });

    void this.notifications
      .enqueueEmail({
        userId: tutor.userId,
        event: 'VERIFICATION_APPROVED',
        to: tutor.user.email,
        subject: 'TutorConnect — verification approved',
        text: `Hi ${tutor.user.name}, your tutor verification was approved. Your verified badge is now visible.`,
        html: `<p>Hi ${tutor.user.name},</p><p>Your verification was <strong>approved</strong>. Your verified badge is now visible on search.</p>`,
      })
      .catch(() => undefined);

    await this.tutors.refreshDiscoverable(tutorId);
    return { ok: true, isVerified: true };
  }

  async reject(adminId: string, tutorId: string, reason: string) {
    if (!reason || reason.trim().length < 5) {
      throw new BadRequestException('Rejection reason is required (min 5 chars)');
    }
    const tutor = await this.prisma.tutor.findUnique({
      where: { id: tutorId },
      include: { user: true },
    });
    if (!tutor) throw new NotFoundException('Tutor not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.tutor.update({
        where: { id: tutorId },
        data: {
          verificationStatus: VerificationStatus.REJECTED,
          isVerified: false,
          verificationRejectReason: reason.trim(),
        },
      });
      await tx.tutorDocument.updateMany({
        where: {
          tutorId,
          type: { in: ID_DOC_TYPES },
          verificationStatus: VerificationStatus.PENDING,
        },
        data: {
          verificationStatus: VerificationStatus.REJECTED,
          status: DocumentStatus.REJECTED,
          reviewedAt: new Date(),
          reviewedBy: adminId,
        },
      });
    });

    await this.audit.log({
      actorId: adminId,
      action: 'VERIFICATION_REJECTED',
      entityType: 'Tutor',
      entityId: tutorId,
      metadata: { reason: reason.trim() },
    });

    void this.notifications
      .enqueueEmail({
        userId: tutor.userId,
        event: 'VERIFICATION_REJECTED',
        to: tutor.user.email,
        subject: 'TutorConnect — verification needs update',
        text: `Hi ${tutor.user.name}, verification was rejected: ${reason.trim()}. Please re-upload documents.`,
        html: `<p>Hi ${tutor.user.name},</p><p>Verification was <strong>rejected</strong>:</p><p>${reason.trim()}</p><p>Please re-upload documents from your verification page.</p>`,
      })
      .catch(() => undefined);

    await this.tutors.refreshDiscoverable(tutorId);
    return { ok: true, isVerified: false };
  }
}
