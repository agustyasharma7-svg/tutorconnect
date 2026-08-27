import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { MatchingService } from './matching.service';
import {
  ApplyMatchDto,
  InviteMatchDto,
  SearchTutorsQueryDto,
} from './dto/match.dto';

@ApiTags('matches')
@Controller()
export class MatchesController {
  constructor(private readonly matching: MatchingService) {}

  @Get('search/tutors')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.STUDENT, UserRole.ADMIN)
  search(@Query() query: SearchTutorsQueryDto) {
    return this.matching.searchTutors(query);
  }

  @Get('tutors/:id/public')
  getPublic(@Param('id') id: string) {
    return this.matching.getPublicTutor(id);
  }

  @Post('matches/apply')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.TUTOR)
  apply(@CurrentUser() user: JwtPayload, @Body() dto: ApplyMatchDto) {
    return this.matching.apply(user.sub, dto);
  }

  @Post('matches/invite')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.STUDENT)
  invite(@CurrentUser() user: JwtPayload, @Body() dto: InviteMatchDto) {
    return this.matching.invite(user.sub, dto);
  }

  @Patch('matches/:id/shortlist')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.STUDENT)
  shortlist(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.matching.shortlist(user.sub, id);
  }

  @Patch('matches/:id/reject')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.STUDENT)
  reject(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.matching.reject(user.sub, id);
  }

  @Patch('matches/:id/withdraw')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.TUTOR)
  withdraw(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.matching.withdraw(user.sub, id);
  }

  @Get('matches/inbox')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.STUDENT)
  inbox(
    @CurrentUser() user: JwtPayload,
    @Query('requirementId') requirementId?: string,
  ) {
    return this.matching.studentInbox(user.sub, requirementId);
  }

  @Get('matches/mine')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.TUTOR)
  mine(@CurrentUser() user: JwtPayload) {
    return this.matching.tutorMatches(user.sub);
  }
}
