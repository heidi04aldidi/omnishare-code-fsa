import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AssetState } from '@prisma/client';
import { PrismaService } from './prisma.service';
import { CreateAssetDto } from './dto/create-asset.dto';

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  async createAsset(dto: CreateAssetDto) {
    if (dto.requiredCertificationId) {
      const cert = await this.prisma.certification.findUnique({
        where: { id: dto.requiredCertificationId },
      });
      if (!cert) {
        throw new NotFoundException('Required certification does not exist');
      }
    }

    return this.prisma.asset.create({
      data: {
        ...dto,
        maintenanceEveryUses: dto.maintenanceEveryUses ?? 10,
      },
      include: { requiredCertification: true },
    });
  }

  listAssets() {
    return this.prisma.asset.findMany({
      include: {
        requiredCertification: true,
        maintenanceRecords: {
          where: { isResolved: false },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async transitionAssetState(assetId: string, nextState: AssetState) {
    const asset = await this.prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    const allowedTransitions: Record<AssetState, AssetState[]> = {
      AVAILABLE: [AssetState.RESERVED, AssetState.MAINTENANCE, AssetState.RETIRED],
      RESERVED: [AssetState.IN_USE, AssetState.AVAILABLE, AssetState.MAINTENANCE],
      IN_USE: [AssetState.AVAILABLE, AssetState.MAINTENANCE],
      MAINTENANCE: [AssetState.AVAILABLE, AssetState.RETIRED],
      RETIRED: [],
    };

    if (!allowedTransitions[asset.state].includes(nextState)) {
      throw new BadRequestException(
        `Invalid transition from ${asset.state} to ${nextState}`,
      );
    }

    return this.prisma.asset.update({
      where: { id: assetId },
      data: { state: nextState },
    });
  }
}
