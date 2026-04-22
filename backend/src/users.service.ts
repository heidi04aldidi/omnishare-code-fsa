import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async createUser(dto: CreateUserDto) {
    const passwordHash = await bcrypt.hash(dto.password ?? 'password123', 10);
    return this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash,
        role: UserRole.USER,
      },
    });
  }

  listUsers() {
    return this.prisma.user.findMany({
      include: {
        certifications: { include: { certification: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  promoteToAdmin(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { role: UserRole.ADMIN },
    });
  }
}
