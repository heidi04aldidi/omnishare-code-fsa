import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { CurrentUser } from './auth/current-user.decorator';

@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  listBookings() {
    return this.bookingsService.listBookings();
  }

  @Post()
  createBooking(
    @Body() dto: CreateBookingDto,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    if (user.role !== UserRole.ADMIN && dto.userId !== user.id) {
      throw new ForbiddenException('You can only create bookings for yourself');
    }
    return this.bookingsService.createBooking(dto);
  }

  @Patch(':id/start')
  async startBooking(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    const booking = await this.bookingsService.getBookingById(id);
    if (
      user.role !== UserRole.ADMIN &&
      booking &&
      booking.userId !== user.id
    ) {
      throw new ForbiddenException('You can only start your own bookings');
    }
    return this.bookingsService.startBooking(id);
  }

  @Patch(':id/complete')
  async completeBooking(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    const booking = await this.bookingsService.getBookingById(id);
    if (
      user.role !== UserRole.ADMIN &&
      booking &&
      booking.userId !== user.id
    ) {
      throw new ForbiddenException('You can only complete your own bookings');
    }
    return this.bookingsService.completeBooking(id);
  }
}
