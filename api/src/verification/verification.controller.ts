import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { DocumentType, UserRole } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { memoryStorage } from 'multer';
import {
  CurrentUser,
  JwtPayload,
} from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { VerificationService } from './verification.service';

class UploadMetaDto {
  @IsEnum(DocumentType)
  type!: DocumentType;

  @IsOptional()
  @IsString()
  documentNumber?: string;
}

class RejectDto {
  @IsString()
  @MinLength(5)
  reason!: string;
}

@ApiTags('verification')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller()
export class VerificationController {
  constructor(
    private readonly verification: VerificationService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  @Roles(UserRole.TUTOR)
  @Get('tutors/me/verification')
  mine(@CurrentUser() user: JwtPayload) {
    return this.verification.getMine(user.sub);
  }

  @Roles(UserRole.TUTOR)
  @Post('tutors/me/documents')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        type: { type: 'string', enum: ['AADHAAR', 'PAN', 'DEGREE'] },
        documentNumber: { type: 'string' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (
          !file.mimetype.match(
            /^(image\/(jpeg|png|jpg)|application\/pdf)$/,
          )
        ) {
          return cb(
            new BadRequestException('Only JPG/PNG/PDF allowed') as unknown as Error,
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async upload(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadMetaDto,
  ) {
    if (!file?.buffer) throw new BadRequestException('File is required');
    const uploaded = await this.cloudinary.uploadDocument(
      file,
      'tutorconnect/verification',
    );
    return this.verification.uploadDocument(
      user.sub,
      body.type,
      file,
      { secure_url: uploaded.secure_url, public_id: uploaded.public_id },
      body.documentNumber,
    );
  }

  @Roles(UserRole.ADMIN)
  @Get('admin/verification/queue')
  queue() {
    return this.verification.adminQueue();
  }

  @Roles(UserRole.ADMIN)
  @Get('admin/verification/documents/:id')
  viewDoc(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.verification.viewDocument(user.sub, id);
  }

  @Roles(UserRole.ADMIN)
  @Post('admin/verification/:tutorId/approve')
  approve(@CurrentUser() user: JwtPayload, @Param('tutorId') tutorId: string) {
    return this.verification.approve(user.sub, tutorId);
  }

  @Roles(UserRole.ADMIN)
  @Post('admin/verification/:tutorId/reject')
  reject(
    @CurrentUser() user: JwtPayload,
    @Param('tutorId') tutorId: string,
    @Body() dto: RejectDto,
  ) {
    return this.verification.reject(user.sub, tutorId, dto.reason);
  }
}
