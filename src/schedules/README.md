# Schedule Service - Sprint 3 Implementation

## Overview

The updated `SchedulesService` has been completely refactored to meet the requirements of **Sprint 3 — HU-020 and HU-021**. The service now implements proper soft deletion, advanced slot generation, and follows best practices for consistency, traceability, and scalability.

## Key Features

### ✅ Soft Deletion
- **Schedules** are marked as `isActive = false` instead of being physically deleted
- **Historical data** is preserved for auditability and consistency
- **Frontend** only shows active schedules (`isActive = true`)

### ✅ Advanced Slot Generation
- **Real calendar dates** are combined with weekly schedule patterns
- **DoctorUnavailability** periods are automatically excluded
- **Effective periods** (`effectiveFrom`/`effectiveTo`) are respected
- **Uniqueness** is guaranteed with `skipDuplicates: true`
- **Batch processing** for optimal performance

### ✅ Separation of Concerns
- **SchedulesService**: CRUD operations for schedules
- **SlotGeneratorService**: Pure slot generation logic
- **Reusable components** for cron jobs and manual regeneration

## Architecture

```
src/schedules/
├── schedules.service.ts      # Main schedule CRUD operations
├── schedules.module.ts       # Module configuration
├── schedule.config.ts        # Configuration settings
├── slot-generator.service.ts # Slot generation logic
└── dto/                      # Data Transfer Objects
    ├── create-schedule.dto.ts
    └── schedule-response.dto.ts
```

## Configuration

### Environment Variables
```bash
# Number of weeks ahead to generate slots (default: 4)
SLOT_GENERATION_WEEKS=4
```

### Configuration File
```typescript
// src/schedules/schedule.config.ts
export const SCHEDULE_CONFIG = {
  SLOT_GENERATION_WEEKS: 4,
  MAX_SLOT_GENERATION_WEEKS: 12,
  MIN_SLOT_GENERATION_WEEKS: 1,
  // ... more settings
};
```

## Usage Examples

### 1. Update Doctor Schedules

```typescript
// Create new schedules for a doctor
const newSchedules: CreateScheduleDto[] = [
  {
    dayOfWeek: 1, // Monday
    startTime: '08:00',
    endTime: '14:00',
    slotMinutes: 30,
    isActive: true,
    effectiveFrom: new Date('2024-01-01'),
    effectiveTo: new Date('2024-12-31'),
  },
  {
    dayOfWeek: 3, // Wednesday
    startTime: '15:00',
    endTime: '18:00',
    slotMinutes: 20,
    isActive: true,
  },
];

// Update schedules (automatically handles soft deletion and slot generation)
const updatedSchedules = await schedulesService.updateSchedules(
  doctorId,
  newSchedules
);
```

### 2. Get Doctor Schedules (Active Only)

```typescript
// Get only active schedules with their slots
const schedules = await schedulesService.getDoctorSchedules(doctorId);

// Response includes:
// - Only isActive: true schedules
// - Associated slots (past and future)
// - Proper date formatting
```

### 3. Regenerate Slots (Cron Job)

```typescript
// Useful for weekly slot regeneration
const result = await schedulesService.regenerateSlotsForDoctor(doctorId);

console.log(`Generated ${result.slotsGenerated} slots for ${result.schedulesProcessed} schedules`);
```

### 4. Get Statistics

```typescript
const stats = await schedulesService.getScheduleStatistics(doctorId);

console.log(`
  Active Schedules: ${stats.activeSchedules}
  Total Slots: ${stats.totalSlots}
  Free Slots: ${stats.freeSlots}
  Booked Slots: ${stats.bookedSlots}
`);
```

## Business Logic Flow

### Schedule Update Process

1. **Validation**
   - Doctor exists
   - At least one active schedule
   - No overlapping schedules on the same day

2. **Soft Deletion**
   - Mark existing schedules as `isActive: false`
   - Keep historical data intact

3. **Slot Cleanup**
   - Delete only future `FREE` slots from inactive schedules
   - Preserve `BOOKED` and `HELD` slots

4. **New Schedule Creation**
   - Create new active schedules
   - Set proper timestamps

5. **Slot Generation**
   - Generate slots for the next N weeks
   - Respect effective periods
   - Exclude unavailability periods
   - Ensure uniqueness

### Slot Generation Algorithm

```typescript
// For each active schedule:
1. Find all dates matching dayOfWeek in the next N weeks
2. For each date:
   - Check if within effectiveFrom/effectiveTo
   - Generate time slots based on startTime/endTime/slotMinutes
   - Filter out slots overlapping with DoctorUnavailability
   - Create slots with status: 'FREE'
3. Batch insert with skipDuplicates: true
```

## Data Models

### Schedule (Weekly Pattern)
```typescript
{
  id: string;
  dayOfWeek: number;        // 0=Sunday, 6=Saturday
  startTime: string;        // "08:00"
  endTime: string;          // "14:00"
  slotMinutes: number;      // 15, 20, 30, 45, 60
  isActive: boolean;        // true for active schedules
  effectiveFrom: Date;      // Optional start date
  effectiveTo: Date;        // Optional end date
  doctorId: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Slot (Concrete Instance)
```typescript
{
  id: string;
  scheduleId: string;
  startAt: Date;           // Real datetime (e.g., 2024-01-15 08:00:00)
  endAt: Date;             // Real datetime (e.g., 2024-01-15 08:30:00)
  status: SlotStatus;      // FREE, HELD, BOOKED, BLOCKED
  holdExpiresAt: Date;     // For HELD slots
  createdAt: Date;
}
```

## Error Handling

The service includes comprehensive error handling:

- **Validation errors**: Invalid schedules, overlapping times
- **Business logic errors**: No active schedules, doctor not found
- **Database errors**: Constraint violations, transaction failures
- **Slot generation errors**: Invalid date ranges, configuration issues

## Performance Considerations

### Batch Operations
- Slots are created in batches using `createMany`
- Parallel processing for multiple schedules
- Efficient database queries with proper indexing

### Memory Management
- Configurable weeks ahead (default: 4)
- Lazy loading of related data
- Proper cleanup of temporary data

### Database Optimization
- Proper indexing on frequently queried fields
- Transaction boundaries for consistency
- Skip duplicates to handle race conditions

## Testing

### Unit Tests
```typescript
describe('SchedulesService', () => {
  it('should soft delete existing schedules', async () => {
    // Test implementation
  });

  it('should generate slots correctly', async () => {
    // Test implementation
  });

  it('should respect doctor unavailability', async () => {
    // Test implementation
  });
});
```

### Integration Tests
```typescript
describe('Schedule Integration', () => {
  it('should handle complete schedule update flow', async () => {
    // Test implementation
  });
});
```

## Migration Notes

### Breaking Changes
- `getSchedulesWithSlots()` → `getActiveSchedulesWithSlots()`
- Physical deletion → Soft deletion
- Immediate slot generation → Configurable weeks ahead

### Backward Compatibility
- All existing DTOs remain unchanged
- Response format is maintained
- API endpoints work the same way

## Future Enhancements

### Planned Features
1. **Cron Job Integration**: Automatic weekly slot regeneration
2. **Slot Templates**: Reusable slot patterns
3. **Bulk Operations**: Update multiple doctors at once
4. **Advanced Filtering**: Date range queries for slots
5. **Performance Monitoring**: Metrics and logging

### Scalability Considerations
- **Horizontal scaling**: Service can be distributed
- **Database sharding**: By doctor or clinic
- **Caching**: Redis for frequently accessed data
- **Queue processing**: Background slot generation

## Troubleshooting

### Common Issues

1. **Slots not generated**
   - Check if schedules are active
   - Verify effective date ranges
   - Check doctor unavailability periods

2. **Overlapping schedules**
   - Validate dayOfWeek and time ranges
   - Check for time zone issues

3. **Performance issues**
   - Reduce SLOT_GENERATION_WEEKS
   - Optimize database queries
   - Consider batch processing

### Debug Mode
```typescript
// Enable detailed logging
const result = await schedulesService.updateSchedules(doctorId, schedules);
console.log('Slot generation result:', result);
```

## Support

For questions or issues:
1. Check this documentation
2. Review error messages and logs
3. Test with minimal data sets
4. Contact the development team

---

*Last updated: January 2024*
*Version: Sprint 3 - HU-020 & HU-021*
