/**
 * Configuration for schedule and slot generation
 */
export const SCHEDULE_CONFIG = {
  // Number of weeks ahead to generate slots
  SLOT_GENERATION_WEEKS: 4,

  // Maximum number of weeks to look ahead for slot generation
  MAX_SLOT_GENERATION_WEEKS: 12,

  // Minimum number of weeks to generate slots
  MIN_SLOT_GENERATION_WEEKS: 1,

  // Default slot duration options (in minutes)
  DEFAULT_SLOT_DURATIONS: [15, 20, 30, 45, 60],

  // Maximum number of schedules per doctor per day
  MAX_SCHEDULES_PER_DAY: 10,

  // Minimum hours before a booked appointment to allow schedule deactivation
  // If there are appointments within this window, deactivation will be blocked
  MIN_HOURS_BEFORE_DEACTIVATION_WITH_BOOKINGS: 24,

  // Timezone offset (in hours) - adjust based on your server location
  TIMEZONE_OFFSET: 0, // UTC by default

  CLINIC_OPEN_TIME: '08:00',
  CLINIC_CLOSE_TIME: '20:00',
  CLINIC_WORKING_DAYS: [1, 2, 3, 4, 5, 6] as number[],
} as const;

/**
 * Environment-based configuration
 * Allows overriding clinic hours and working days via environment variables
 */
export const getScheduleConfig = () => {
  const weeksAhead = process.env.SLOT_GENERATION_WEEKS
    ? parseInt(process.env.SLOT_GENERATION_WEEKS, 10)
    : SCHEDULE_CONFIG.SLOT_GENERATION_WEEKS;

  // Validate weeks ahead configuration
  if (weeksAhead < SCHEDULE_CONFIG.MIN_SLOT_GENERATION_WEEKS) {
    throw new Error(
      `SLOT_GENERATION_WEEKS must be at least ${SCHEDULE_CONFIG.MIN_SLOT_GENERATION_WEEKS}`,
    );
  }

  if (weeksAhead > SCHEDULE_CONFIG.MAX_SLOT_GENERATION_WEEKS) {
    throw new Error(
      `SLOT_GENERATION_WEEKS cannot exceed ${SCHEDULE_CONFIG.MAX_SLOT_GENERATION_WEEKS}`,
    );
  }

  // Allow overriding clinic hours via environment variables
  const clinicOpenTime =
    process.env.CLINIC_OPEN_TIME || SCHEDULE_CONFIG.CLINIC_OPEN_TIME;
  const clinicCloseTime =
    process.env.CLINIC_CLOSE_TIME || SCHEDULE_CONFIG.CLINIC_CLOSE_TIME;

  // Allow overriding working days via environment variable (comma-separated, e.g., "1,2,3,4,5,6")
  const clinicWorkingDays = process.env.CLINIC_WORKING_DAYS
    ? process.env.CLINIC_WORKING_DAYS.split(',').map((d) => parseInt(d.trim()))
    : SCHEDULE_CONFIG.CLINIC_WORKING_DAYS;

  // Validate time format (HH:mm)
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(clinicOpenTime)) {
    throw new Error(
      `CLINIC_OPEN_TIME must be in HH:mm format, got: ${clinicOpenTime}`,
    );
  }
  if (!timeRegex.test(clinicCloseTime)) {
    throw new Error(
      `CLINIC_CLOSE_TIME must be in HH:mm format, got: ${clinicCloseTime}`,
    );
  }

  // Validate working days (must be 0-6)
  if (
    !Array.isArray(clinicWorkingDays) ||
    clinicWorkingDays.some((d) => d < 0 || d > 6)
  ) {
    throw new Error(
      `CLINIC_WORKING_DAYS must be an array of numbers 0-6, got: ${JSON.stringify(clinicWorkingDays)}`,
    );
  }

  return {
    ...SCHEDULE_CONFIG,
    SLOT_GENERATION_WEEKS: weeksAhead,
    CLINIC_OPEN_TIME: clinicOpenTime,
    CLINIC_CLOSE_TIME: clinicCloseTime,
    CLINIC_WORKING_DAYS: clinicWorkingDays,
  };
};
