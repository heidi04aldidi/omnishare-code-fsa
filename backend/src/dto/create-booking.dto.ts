import { IsDateString, IsString } from 'class-validator';

export class CreateBookingDto {
  @IsString()
  assetId: string;

  @IsString()
  userId: string;

  @IsDateString()
  startAt: string;

  @IsDateString()
  endAt: string;
}
