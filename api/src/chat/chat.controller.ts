import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import {
  CurrentUser,
  JwtPayload,
} from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ChatService } from './chat.service';

class PostMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  text!: string;
}

class MessagesQueryDto {
  @IsOptional()
  @IsString()
  after?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

@ApiTags('chat')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Roles(UserRole.STUDENT, UserRole.TUTOR)
  @Get('threads')
  list(@CurrentUser() user: JwtPayload) {
    return this.chat.listThreads(user.sub, user.role as UserRole);
  }

  @Roles(UserRole.STUDENT, UserRole.TUTOR)
  @Get('threads/by-agreement/:agreementId')
  byAgreement(
    @CurrentUser() user: JwtPayload,
    @Param('agreementId') agreementId: string,
  ) {
    return this.chat.getOrCreateByAgreement(user.sub, agreementId);
  }

  @Roles(UserRole.STUDENT, UserRole.TUTOR)
  @Get('threads/:threadId/messages')
  messages(
    @CurrentUser() user: JwtPayload,
    @Param('threadId') threadId: string,
    @Query() query: MessagesQueryDto,
  ) {
    return this.chat.listMessages(user.sub, threadId, query);
  }

  @Roles(UserRole.STUDENT, UserRole.TUTOR)
  @Post('threads/:threadId/messages')
  post(
    @CurrentUser() user: JwtPayload,
    @Param('threadId') threadId: string,
    @Body() dto: PostMessageDto,
  ) {
    return this.chat.postMessage(user.sub, threadId, dto.text);
  }
}
