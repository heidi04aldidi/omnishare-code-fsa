import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AssetState, BookingStatus, Prisma } from '@prisma/client';
import { PrismaService } from './prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  listBookings() {
    return this.prisma.booking.findMany({
      include: { asset: true, user: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createBooking(dto: CreateBookingDto) {
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);

    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      throw new BadRequestException('Invalid booking date range');
    }
    if (endAt <= startAt) {
      throw new BadRequestException('endAt must be after startAt');
    }

    return this.prisma.$transaction(async (tx) => {
      const [asset, user] = await Promise.all([
        tx.asset.findUnique({
          where: { id: dto.assetId },
          include: { requiredCertification: true },
        }),
        tx.user.findUnique({
          where: { id: dto.userId },
          include: { certifications: true },
        }),
      ]);

      if (!asset) {
        throw new NotFoundException('Asset not found');
      }
      if (!user) {
        throw new NotFoundException('User not found');
      }
      if (asset.state !== AssetState.AVAILABLE) {
        throw new BadRequestException('Asset is not available for reservation');
      }

      if (asset.requiredCertificationId) {
        const now = new Date();
        const certificationMatch = user.certifications.some(
          (c) =>
            c.certificationId === asset.requiredCertificationId &&
            (!c.expiresAt || c.expiresAt > now),
        );

        if (!certificationMatch) {
          throw new BadRequestException(
            'User lacks valid certification for this asset',
          );
        }
      }

      const overlap = await tx.booking.findFirst({
        where: {
          assetId: dto.assetId,
          status: { in: [BookingStatus.RESERVED, BookingStatus.ACTIVE] },
          startAt: { lt: endAt },
          endAt: { gt: startAt },
        },
      });

      if (overlap) {
        throw new BadRequestException('Scheduling conflict: overlapping booking');
      }

      const booking = await tx.booking.create({
        data: {
          assetId: dto.assetId,
          userId: dto.userId,
          startAt,
          endAt,
          status: BookingStatus.RESERVED,
        },
        include: { asset: true, user: true },
      });

      await tx.asset.update({
        where: { id: dto.assetId },
        data: { state: AssetState.RESERVED },
      });

      return booking;
    });
  }

  async getBookingById(bookingId: string) {
    return this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { user: true, asset: true },
    });
  }

  async startBooking(bookingId: string) {
    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({ where: { id: bookingId } });
      if (!booking) {
        throw new NotFoundException('Booking not found');
      }
      if (booking.status !== BookingStatus.RESERVED) {
        throw new BadRequestException('Only reserved bookings can be activated');
      }

      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.ACTIVE },
      });

      await tx.asset.update({
        where: { id: booking.assetId },
        data: { state: AssetState.IN_USE },
      });

      return updated;
    });
  }

  async completeBooking(bookingId: string) {
    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({ where: { id: bookingId } });
      if (!booking) {
        throw new NotFoundException('Booking not found');
      }
      if (booking.status !== BookingStatus.ACTIVE) {
        throw new BadRequestException('Only active bookings can be completed');
      }

      await tx.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.COMPLETED },
      });

      const updatedAsset = await tx.asset.update({
        where: { id: booking.assetId },
        data: { usageCount: { increment: 1 } },
      });

      const needsMaintenance =
        updatedAsset.usageCount % updatedAsset.maintenanceEveryUses === 0;

      if (needsMaintenance) {
        await tx.asset.update({
          where: { id: updatedAsset.id },
          data: { state: AssetState.MAINTENANCE },
        });
        await tx.maintenanceRecord.create({
          data: {
            assetId: updatedAsset.id,
            reason: `Auto-flagged after ${updatedAsset.usageCount} uses`,
          },
        });
      } else {
        await tx.asset.update({
          where: { id: updatedAsset.id },
          data: { state: AssetState.AVAILABLE },
        });
      }

      return { success: true, autoMaintenance: needsMaintenance };
    });
  }
}
