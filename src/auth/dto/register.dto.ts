import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MinLength,
  Matches,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Gender } from '@prisma/client';

/**
 * Validador personalizado para verificar que el usuario sea mayor de edad (18-100 años)
 */
@ValidatorConstraint({ name: 'isAdult', async: false })
export class IsAdultConstraint implements ValidatorConstraintInterface {
  validate(dateString: string): boolean {
    if (!dateString) return false;

    const birthDate = new Date(dateString);
    const today = new Date();

    // Calcular edad
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age >= 18 && age <= 80;
  }

  defaultMessage(): string {
    return 'El usuario debe tener entre 18 y 80 años de edad';
  }
}

export class RegisterDto {
  @ApiProperty({
    description: 'DNI del usuario',
    example: '12345678',
    minLength: 8,
    maxLength: 8,
  })
  @IsString()
  @IsNotEmpty()
  @Length(8)
  dni: string;

  @ApiProperty({
    description: 'Correo electrónico del usuario',
    example: 'usuario@example.com',
    format: 'email',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Nombre del usuario',
    example: 'Juan',
  })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({
    description: 'Apellido del usuario',
    example: 'Pérez',
  })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({
    description:
      'Contraseña del usuario (mínimo 8 caracteres, debe contener mayúscula, minúscula y número)',
    example: 'MiContraseña123!',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'La contraseña debe contener al menos una mayúscula, una minúscula y un número',
  })
  password: string;

  @ApiProperty({
    description:
      'Fecha de nacimiento en formato ISO 8601 (el usuario debe tener entre 18 y 100 años)',
    example: '1990-01-15T00:00:00Z',
    format: 'date-time',
  })
  @IsDateString({}, { message: 'Formato de fecha inválido' })
  @IsNotEmpty({ message: 'La fecha de nacimiento es requerida' })
  @Validate(IsAdultConstraint)
  dayOfBirth: string; // Formato ISO 8601 (yyyy-MM-dd) "2004-01-25T00:00:00Z"

  @ApiPropertyOptional({
    description: 'Número de teléfono del usuario',
    example: '+51987654321',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    description: 'Género del usuario',
    enum: Gender,
    example: Gender.MALE,
  })
  @IsEnum(Gender)
  gender: Gender;

  @ApiPropertyOptional({
    description: 'URL de la imagen de perfil del usuario',
    example: 'https://example.com/profile.jpg',
  })
  @IsString()
  @IsOptional()
  profileImage?: string;

  //   @IsOptional()
  //   @IsString()
  //   @IsNotEmpty()
  //   address?: string; // Si se quiere agregar un campo opcional para la dirección

  // Esto no es necesario si lo maneja en la base de datos automáticamente
}
