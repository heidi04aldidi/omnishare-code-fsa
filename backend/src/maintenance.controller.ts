import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { AssetState } from '@prisma/client';
import { PrismaService } from './prisma.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { Roles } from './auth/roles.decorator';
import { Role } from './auth/roles.enum';

@Controller('maintenance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MaintenanceController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Roles(Role.ADMIN)
  listOpenTickets() {
    return this.prisma.maintenanceRecord.findMany({
      where: { isResolved: false },
      include: { asset: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Patch(':id/resolve')
  @Roles(Role.ADMIN)
  async resolveTicket(@Param('id') id: string) {
    const ticket = await this.prisma.maintenanceRecord.update({
      where: { id },
      data: { isResolved: true, resolvedAt: new Date() },
    });

    await this.prisma.asset.update({
      where: { id: ticket.assetId },
      data: { state: AssetState.AVAILABLE },
    });

    return ticket;
  }
}
