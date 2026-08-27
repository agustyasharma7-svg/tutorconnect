import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('catalog')
@Controller('catalog')
export class CatalogController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('subjects')
  subjects() {
    return this.prisma.subject.findMany({ orderBy: { nameEn: 'asc' } });
  }

  @Get('classes')
  classes() {
    return this.prisma.classLevel.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  @Get('boards')
  boards() {
    return this.prisma.board.findMany({ orderBy: { nameEn: 'asc' } });
  }
}
