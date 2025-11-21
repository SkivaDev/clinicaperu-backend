import { ApiProperty } from '@nestjs/swagger';

export class ActivityDto {
  @ApiProperty({ description: 'User who performed the action' })
  user: string;

  @ApiProperty({ description: 'Action description' })
  action: string;

  @ApiProperty({ description: 'Target of the action', required: false })
  target?: string;

  @ApiProperty({ description: 'Timestamp of the activity' })
  timestamp: Date;

  @ApiProperty({ description: 'User avatar URL', required: false })
  avatar?: string;

  @ApiProperty({ description: 'User initials' })
  initials: string;
}

export class RecentActivityDto {
  @ApiProperty({ description: 'List of recent activities', type: [ActivityDto] })
  activities: ActivityDto[];
}
