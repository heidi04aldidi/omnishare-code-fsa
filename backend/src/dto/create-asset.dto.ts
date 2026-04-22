import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateAssetDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  requiredCertificationId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maintenanceEveryUses?: number;
}
