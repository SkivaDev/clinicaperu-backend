import { ApiProperty } from '@nestjs/swagger';

export class SpecialtiesStatsDto {
  @ApiProperty() totalSpecialties: number;
  @ApiProperty() activeSpecialties: number;
  @ApiProperty() inactiveSpecialties: number;
  @ApiProperty() totalDoctors: number;
  @ApiProperty() activeDoctors: number;
}
