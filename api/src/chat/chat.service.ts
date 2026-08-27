import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AgreementStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit.service';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async loadAgreementForUser(agreementId: string, userId: string) {
    const agreement = await this.prisma.agreement.findUnique({
      where: { id: agreementId },
      include: {
        match: {
          include: {
            tutor: { include: { user: { select: { id: true, name: true } } } },
            requirement: {
              include: {
                student: {
                  include: { user: { select: { id: true, name: true } } },
                },
                subject: true,
              },
            },
          },
        },
        chatThread: true,
      },
    });
    if (!agreement) throw new NotFoundException('Agreement not found');
    const studentUserId = agreement.match.requirement.student.user.id;
    const tutorUserId = agreement.match.tutor.user.id;
    if (userId !== studentUserId && userId !== tutorUserId) {
      throw new ForbiddenException();
    }
    return { agreement, studentUserId, tutorUserId };
  }

  private async loadThreadForUser(threadId: string, userId: string) {
    const thread = await this.prisma.chatThread.findUnique({
      where: { id: threadId },
      include: {
        agreement: {
          include: {
            match: {
              include: {
                tutor: true,
                requirement: { include: { student: true } },
              },
            },
          },
        },
      },
    });
    if (!thread) throw new NotFoundException('Thread not found');
    const studentUserId = thread.agreement.match.requirement.student.userId;
    const tutorUserId = thread.agreement.match.tutor.userId;
    if (userId !== studentUserId && userId !== tutorUserId) {
      throw new ForbiddenException();
    }
    return { thread, studentUserId, tutorUserId };
  }

  async listThreads(userId: string, role: UserRole) {
    if (role !== UserRole.STUDENT && role !== UserRole.TUTOR) {
      throw new ForbiddenException();
    }

    const where =
      role === UserRole.STUDENT
        ? { match: { requirement: { student: { userId } } } }
        : { match: { tutor: { userId } } };

    const agreements = await this.prisma.agreement.findMany({
      where: {
        ...where,
        status: {
          in: [AgreementStatus.ACTIVE, AgreementStatus.COMPLETED],
        },
        chatThread: { isNot: null },
      },
      include: {
        chatThread: {
          include: {
            messages: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
        match: {
          include: {
            tutor: { include: { user: { select: { name: true } } } },
            requirement: {
              include: {
                student: { include: { user: { select: { name: true } } } },
                subject: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Also include ACTIVE agreements without a thread yet (so user can open chat)
    const activeWithout = await this.prisma.agreement.findMany({
      where: {
        ...where,
        status: AgreementStatus.ACTIVE,
        chatThread: null,
      },
      include: {
        chatThread: true,
        match: {
          include: {
            tutor: { include: { user: { select: { name: true } } } },
            requirement: {
              include: {
                student: { include: { user: { select: { name: true } } } },
                subject: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const mapRow = (a: {
      id: string;
      status: AgreementStatus;
      chatThread: {
        id: string;
        messages?: { body: string; createdAt: Date; senderUserId: string }[];
      } | null;
      match: {
        tutor: { user: { name: string } };
        requirement: {
          student: { user: { name: string } };
          subject: { nameEn: string } | null;
        };
      };
    }) => ({
      agreementId: a.id,
      threadId: a.chatThread?.id ?? null,
      agreementStatus: a.status,
      studentName: a.match.requirement.student.user.name,
      tutorName: a.match.tutor.user.name,
      subject: a.match.requirement.subject?.nameEn ?? null,
      lastMessage: a.chatThread?.messages?.[0]
        ? {
            body: a.chatThread.messages[0].body,
            createdAt: a.chatThread.messages[0].createdAt,
            senderUserId: a.chatThread.messages[0].senderUserId,
          }
        : null,
      canSend: a.status === AgreementStatus.ACTIVE,
    });

    const seen = new Set<string>();
    const rows = [];
    for (const a of [...agreements, ...activeWithout]) {
      if (seen.has(a.id)) continue;
      seen.add(a.id);
      rows.push(mapRow(a as Parameters<typeof mapRow>[0]));
    }
    return rows;
  }

  async getOrCreateByAgreement(userId: string, agreementId: string) {
    const { agreement, studentUserId, tutorUserId } =
      await this.loadAgreementForUser(agreementId, userId);

    const canRead =
      agreement.status === AgreementStatus.ACTIVE ||
      agreement.status === AgreementStatus.COMPLETED;
    if (!canRead) {
      throw new ForbiddenException(
        'Chat available after agreement is ACTIVE',
      );
    }

    // Create only when ACTIVE; COMPLETED may open existing thread only
    let thread = agreement.chatThread;
    if (!thread) {
      if (agreement.status !== AgreementStatus.ACTIVE) {
        throw new ForbiddenException('No chat thread for this agreement');
      }
      thread = await this.prisma.chatThread.create({
        data: { agreementId },
      });
    }

    return {
      threadId: thread.id,
      agreementId: agreement.id,
      agreementStatus: agreement.status,
      canSend: agreement.status === AgreementStatus.ACTIVE,
      studentName: agreement.match.requirement.student.user.name,
      tutorName: agreement.match.tutor.user.name,
      studentUserId,
      tutorUserId,
    };
  }

  async listMessages(
    userId: string,
    threadId: string,
    opts: { after?: string; limit?: number },
  ) {
    const { thread } = await this.loadThreadForUser(threadId, userId);
    const limit = Math.min(Math.max(opts.limit ?? 50, 1), 100);

    const afterDate = opts.after ? new Date(opts.after) : null;
    if (opts.after && Number.isNaN(afterDate!.getTime())) {
      throw new BadRequestException('Invalid after timestamp');
    }

    const messages = await this.prisma.chatMessage.findMany({
      where: {
        threadId,
        ...(afterDate ? { createdAt: { gt: afterDate } } : {}),
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
      include: {
        sender: { select: { id: true, name: true } },
      },
    });

    return {
      agreementStatus: thread.agreement.status,
      canSend: thread.agreement.status === AgreementStatus.ACTIVE,
      messages: messages.map((m) => ({
        id: m.id,
        body: m.body,
        senderUserId: m.senderUserId,
        senderName: m.sender.name,
        createdAt: m.createdAt,
      })),
    };
  }

  async postMessage(userId: string, threadId: string, text: string) {
    const body = text?.trim() ?? '';
    if (body.length < 1 || body.length > 2000) {
      throw new BadRequestException('Message must be 1–2000 characters');
    }

    const { thread } = await this.loadThreadForUser(threadId, userId);
    if (thread.agreement.status !== AgreementStatus.ACTIVE) {
      throw new BadRequestException(
        'Messaging only allowed while agreement is ACTIVE',
      );
    }

    const message = await this.prisma.chatMessage.create({
      data: {
        threadId,
        senderUserId: userId,
        body,
      },
      include: {
        sender: { select: { id: true, name: true } },
      },
    });

    await this.prisma.chatThread.update({
      where: { id: threadId },
      data: { updatedAt: new Date() },
    });

    await this.audit.log({
      actorId: userId,
      action: 'CHAT_MESSAGE_SENT',
      entityType: 'ChatMessage',
      entityId: message.id,
      metadata: {
        threadId,
        agreementId: thread.agreementId,
        preview: body.slice(0, 80),
      },
    });

    return {
      id: message.id,
      body: message.body,
      senderUserId: message.senderUserId,
      senderName: message.sender.name,
      createdAt: message.createdAt,
    };
  }
}
