import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Doctor, Room } from '@prisma/client';

export class ClinicResponseDto {
  // ===========================================================================
  // 🏥 Información principal de la clínica
  // ==========================================================================='
  @ApiProperty({ description: 'ID único de la clínica' })
  id: string;

  @ApiProperty({ description: 'Nombre comercial de la clínica' })
  name: string;

  @ApiProperty({ description: 'Dirección física de la clínica' })
  address: string;

  // ===========================================================================
  // 🗺️ Ubigeo
  // ==========================================================================='
  @ApiProperty({ description: 'Departamento de la clínica (Ubigeo)' })
  ubigeoDept: string;

  @ApiProperty({ description: 'Provincia de la clínica (Ubigeo)' })
  ubigeoProv: string;

  @ApiProperty({ description: 'Distrito de la clínica (Ubigeo)' })
  ubigeoDist: string;

  // ===========================================================================
  // ☎️ Información de contacto
  // ==========================================================================='
  @ApiPropertyOptional({
    description: 'Número telefónico de contacto',
    nullable: true,
  })
  phone: string | null;

  @ApiPropertyOptional({
    description: 'Correo electrónico de contacto',
    nullable: true,
  })
  email: string | null;

  // ===========================================================================
  // ⚙️ Estado y auditoría
  // ==========================================================================='
  @ApiProperty({ description: 'Indica si la clínica está activa' })
  isActive: boolean;

  @ApiProperty({ description: 'Fecha de creación del registro', type: String })
  createdAt: Date;

  @ApiProperty({
    description: 'Fecha de última actualización del registro',
    type: String,
  })
  updatedAt: Date;

  // ===========================================================================
  // 📚 Relaciones cargadas
  // ==========================================================================='
  @ApiPropertyOptional({
    description: 'Listado de salas asociadas a la clínica',
    isArray: true,
    type: () => Object,
    nullable: true,
  })
  rooms?: Room[];

  @ApiPropertyOptional({
    description: 'Listado de doctores pertenecientes a la clínica',
    isArray: true,
    type: () => Object,
    nullable: true,
  })
  doctors?: Doctor[];
}

// ============================================================================
// 🔒 CanDeactivateClinicResponseDto
// ============================================================================
export class CanDeactivateClinicResponseDto {
  @ApiProperty({
    description: 'Indica si la clínica puede desactivarse',
    example: true,
  })
  canDeactivate: boolean;

  @ApiProperty({
    description: 'Razones que impiden la desactivación',
    type: [String],
    example: ['La clínica tiene 2 doctor(es) activo(s).'],
  })
  reasons: string[];

  @ApiProperty({
    description: 'Advertencias relacionadas con la desactivación',
    type: [String],
    example: [],
  })
  warnings: string[];

  @ApiPropertyOptional({
    description: 'Métricas adicionales para la validación',
    example: {
      activeDoctors: 2,
      activeRooms: 3,
      futureAppointments: 4,
    },
  })
  metadata?: {
    activeDoctors: number;
    activeRooms: number;
    futureAppointments: number;
  };
}
