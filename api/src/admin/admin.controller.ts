import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CommissionStatus,
  DisputeStatus,
  PaymentStatus,
  PaymentType,
  UserRole,
  VerificationStatus,
} from '@prisma/client';
import { Response } from 'express';
import {
  CurrentUser,
  JwtPayload,
} from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit.service';
import { CommissionsService } from '../commissions/commissions.service';
import { WaiveCommissionDto } from '../payments/dto/payment.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commissions: CommissionsService,
    private readonly audit: AuditService,
  ) {}

  @Get('users')
  async users(
    @CurrentUser() user: JwtPayload,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('role') role?: UserRole,
  ) {
    const take = Math.min(Number(limit) || 20, 100);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take;
    const where = role ? { role } : {};
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          mobile: true,
          role: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    await this.audit.log({
      actorId: user.sub,
      action: 'ADMIN_USERS_LISTED',
      entityType: 'User',
      metadata: { page: Number(page) || 1, limit: take, role: role ?? null },
    });
    return { items, total, page: Number(page) || 1, limit: take };
  }

  @Get('commissions')
  listCommissions() {
    return this.commissions.listAdmin();
  }

  @Post('commissions/:id/waive')
  waive(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: WaiveCommissionDto,
  ) {
    return this.commissions.waive(user.sub, id, dto);
  }

  @Get('metrics/users')
  async metricsUsers() {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const [students, tutors, admins, mau] = await Promise.all([
      this.prisma.user.count({ where: { role: UserRole.STUDENT } }),
      this.prisma.user.count({ where: { role: UserRole.TUTOR } }),
      this.prisma.user.count({ where: { role: UserRole.ADMIN } }),
      this.prisma.user.count({ where: { updatedAt: { gte: since } } }),
    ]);
    return { students, tutors, admins, mau30d: mau };
  }

  @Get('metrics/revenue')
  async metricsRevenue() {
    const [reg, com] = await Promise.all([
      this.prisma.payment.aggregate({
        where: {
          type: PaymentType.REGISTRATION,
          status: PaymentStatus.SUCCESS,
        },
        _sum: { grossAmount: true },
        _count: true,
      }),
      this.prisma.payment.aggregate({
        where: {
          type: PaymentType.COMMISSION,
          status: PaymentStatus.SUCCESS,
        },
        _sum: { grossAmount: true },
        _count: true,
      }),
    ]);
    return {
      registrationGross: reg._sum.grossAmount ?? 0,
      registrationCount: reg._count,
      commissionGross: com._sum.grossAmount ?? 0,
      commissionCount: com._count,
      totalGross: (reg._sum.grossAmount ?? 0) + (com._sum.grossAmount ?? 0),
    };
  }

  @Get('metrics/operations')
  async metricsOps() {
    const [pendingVerifications, openDisputes, overdueCommissions] =
      await Promise.all([
        this.prisma.tutor.count({
          where: { verificationStatus: VerificationStatus.PENDING },
        }),
        this.prisma.dispute.count({
          where: {
            status: { in: [DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW] },
          },
        }),
        this.prisma.commission.count({
          where: { status: CommissionStatus.OVERDUE },
        }),
      ]);
    return { pendingVerifications, openDisputes, overdueCommissions };
  }

  @Get('audit-logs')
  async auditLogs(
    @CurrentUser() user: JwtPayload,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
  ) {
    const take = Math.min(Number(limit) || 50, 200);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take;
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count(),
    ]);
    await this.audit.log({
      actorId: user.sub,
      action: 'ADMIN_AUDIT_LOG_VIEWED',
      entityType: 'AuditLog',
      metadata: { page: Number(page) || 1, limit: take },
    });
    return { items, total, page: Number(page) || 1, limit: take };
  }

  @Get('export/users.csv')
  @Header('Content-Type', 'text/csv')
  async exportUsers(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5000,
      select: {
        id: true,
        name: true,
        email: true,
        mobile: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });
    await this.audit.log({
      actorId: user.sub,
      action: 'ADMIN_USERS_EXPORTED',
      entityType: 'User',
      metadata: { count: users.length },
    });
    const lines = [
      'id,name,email,mobile,role,status,createdAt',
      ...users.map(
        (u) =>
          `${u.id},"${u.name.replace(/"/g, '""')}",${u.email},${u.mobile},${u.role},${u.status},${u.createdAt.toISOString()}`,
      ),
    ];
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="users.csv"',
    );
    res.send(lines.join('\n'));
  }

  @Get('export/revenue.csv')
  @Header('Content-Type', 'text/csv')
  async exportRevenue(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const payments = await this.prisma.payment.findMany({
      where: { status: PaymentStatus.SUCCESS },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });
    await this.audit.log({
      actorId: user.sub,
      action: 'ADMIN_REVENUE_EXPORTED',
      entityType: 'Payment',
      metadata: { count: payments.length },
    });
    const lines = [
      'id,type,grossAmount,taxableAmount,gstAmount,payerId,createdAt',
      ...payments.map(
        (p) =>
          `${p.id},${p.type},${p.grossAmount},${p.taxableAmount},${p.gstAmount},${p.payerId},${p.createdAt.toISOString()}`,
      ),
    ];
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="revenue.csv"',
    );
    res.send(lines.join('\n'));
  }
}
