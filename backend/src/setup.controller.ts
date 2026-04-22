import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { Roles } from './auth/roles.decorator';
import { Role } from './auth/roles.enum';

@Controller('setup')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class SetupController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('certifications')
  createCertification(@Body('name') name: string) {
    return this.prisma.certification.create({ data: { name } });
  }

  @Post('grant-certification')
  grantCertification(
    @Body('userId') userId: string,
    @Body('certificationId') certificationId: string,
  ) {
    return this.prisma.userCertification.upsert({
      where: { userId_certificationId: { userId, certificationId } },
      update: {},
      create: { userId, certificationId },
    });
  }
}
