// import { PartialType } from '@nestjs/mapped-types';
// import { CreateSpecialtyDto } from './create-specialty.dto';

// export class UpdateSpecialtyDto extends PartialType(CreateSpecialtyDto) {}

import { PartialType } from '@nestjs/swagger';
import { CreateSpecialtyDto } from './create-specialty.dto';

export class UpdateSpecialtyDto extends PartialType(CreateSpecialtyDto) {}
