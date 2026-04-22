import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AppController } from './app.controller';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { JwtStrategy } from './auth/jwt.strategy';
import { RolesGuard } from './auth/roles.guard';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { MaintenanceController } from './maintenance.controller';
import { PrismaService } from './prisma.service';
import { SetupController } from './setup.controller';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'dev-secret',
      signOptions: { expiresIn: '8h' },
    }),
  ],
  controllers: [
    AppController,
    AuthController,
    UsersController,
    AssetsController,
    BookingsController,
    MaintenanceController,
    SetupController,
  ],
  providers: [
    PrismaService,
    AuthService,
    UsersService,
    AssetsService,
    BookingsService,
    JwtStrategy,
    RolesGuard,
  ],
})
export class AppModule {}
