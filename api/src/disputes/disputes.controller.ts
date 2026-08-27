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
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { DisputeType, UserRole } from '@prisma/client';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { memoryStorage } from 'multer';
import {
  CurrentUser,
  JwtPayload,
} from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { DisputesService } from './disputes.service';

class CreateDisputeDto {
  @IsUUID()
  agreementId!: string;

  @IsEnum(DisputeType)
  type!: DisputeType;

  @IsString()
  @MinLength(10)
  description!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidenceUrls?: string[];
}

class ResolveDisputeDto {
  @IsString()
  @MinLength(5)
  resolution!: string;
}

@ApiTags('disputes')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('disputes')
export class DisputesController {
  constructor(
    private readonly disputes: DisputesService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  @Roles(UserRole.STUDENT, UserRole.TUTOR, UserRole.ADMIN)
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateDisputeDto) {
    return this.disputes.create(user.sub, user.role as UserRole, dto);
  }

  @Roles(UserRole.STUDENT, UserRole.TUTOR, UserRole.ADMIN)
  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.disputes.listMine(user.sub, user.role as UserRole);
  }

  @Roles(UserRole.STUDENT, UserRole.TUTOR, UserRole.ADMIN)
  @Post('evidence/upload')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (
          !file.mimetype.match(/^(image\/(jpeg|png|jpg)|application\/pdf)$/)
        ) {
          return cb(
            new BadRequestException('Only JPG/PNG/PDF') as unknown as Error,
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadEvidence(@UploadedFile() file: Express.Multer.File) {
    if (!file?.buffer) throw new BadRequestException('File required');
    const uploaded = await this.cloudinary.uploadDocument(
      file,
      'tutorconnect/disputes',
    );
    return { url: uploaded.secure_url, publicId: uploaded.public_id };
  }

  @Roles(UserRole.STUDENT, UserRole.TUTOR, UserRole.ADMIN)
  @Get(':id')
  one(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.disputes.getOne(user.sub, user.role as UserRole, id);
  }

  @Roles(UserRole.ADMIN)
  @Post(':id/resolve')
  resolve(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: ResolveDisputeDto,
  ) {
    return this.disputes.close(user.sub, id, dto.resolution);
  }
}
