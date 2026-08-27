import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { memoryStorage } from 'multer';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { TutorsService } from './tutors.service';
import {
  RegistrationFeeChoiceDto,
  UpdateAvailabilityDto,
  UpdateLocationDto,
  UpdateTutorProfileDto,
  UpdateTutorSubjectsDto,
} from './dto/tutor.dto';

@ApiTags('tutors')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.TUTOR)
@Controller('tutors')
export class TutorsController {
  constructor(
    private readonly tutorsService: TutorsService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  @Get('me')
  getMe(@CurrentUser() user: JwtPayload) {
    return this.tutorsService.getMe(user.sub);
  }

  @Patch('me')
  updateProfile(@CurrentUser() user: JwtPayload, @Body() dto: UpdateTutorProfileDto) {
    return this.tutorsService.updateProfile(user.sub, dto);
  }

  @Patch('me/subjects')
  updateSubjects(@CurrentUser() user: JwtPayload, @Body() dto: UpdateTutorSubjectsDto) {
    return this.tutorsService.updateSubjects(user.sub, dto);
  }

  @Patch('me/availability')
  updateAvailability(@CurrentUser() user: JwtPayload, @Body() dto: UpdateAvailabilityDto) {
    return this.tutorsService.updateAvailability(user.sub, dto);
  }

  @Patch('me/location')
  updateLocation(@CurrentUser() user: JwtPayload, @Body() dto: UpdateLocationDto) {
    return this.tutorsService.updateLocation(user.sub, dto);
  }

  @Post('me/registration-fee-choice')
  feeChoice(@CurrentUser() user: JwtPayload, @Body() dto: RegistrationFeeChoiceDto) {
    return this.tutorsService.chooseRegistrationFee(user.sub, dto);
  }

  @Post('me/photo')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/^image\/(jpeg|png|jpg)$/)) {
          return cb(new BadRequestException('Only JPG/PNG allowed') as unknown as Error, false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadPhoto(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('Photo file is required');
    }
    const uploaded = await this.cloudinary.uploadImage(file, 'tutorconnect/tutors');
    return this.tutorsService.savePhoto(
      user.sub,
      uploaded.secure_url,
      file.originalname,
      uploaded.public_id,
    );
  }
}
