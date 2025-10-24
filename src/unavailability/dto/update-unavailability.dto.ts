import { PartialType } from '@nestjs/swagger';
import { CreateUnavailabilityDto } from './create-unavailability.dto';

export class UpdateUnavailabilityDto extends PartialType(
  CreateUnavailabilityDto,
) {}
