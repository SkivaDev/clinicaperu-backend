import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class UserSearchResultDto {
  @ApiProperty({
    description: 'ID único del usuario',
    example: 'uuid-here',
  })
  id: string;

  @ApiProperty({
    description: 'DNI del usuario',
    example: '12345678',
  })
  dni: string;

  @ApiProperty({
    description: 'Nombre del usuario',
    example: 'Juan',
  })
  firstName: string;

  @ApiProperty({
    description: 'Apellido del usuario',
    example: 'Pérez García',
  })
  lastName: string;

  @ApiProperty({
    description: 'Email del usuario',
    example: 'juan.perez@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'Teléfono del usuario',
    example: '+51987654321',
    required: false,
  })
  phone?: string;

  @ApiProperty({
    description: 'URL de la imagen de perfil',
    example: 'https://example.com/profile.jpg',
    required: false,
  })
  profileImage?: string;

  @ApiProperty({
    description: 'Rol del usuario',
    enum: Role,
    example: Role.PATIENT,
  })
  role: Role;

  @ApiProperty({
    description: 'Estado activo del usuario',
    example: true,
  })
  isActive: boolean;
}
