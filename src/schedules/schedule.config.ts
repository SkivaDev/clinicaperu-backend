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
} as const;

/**
 * Environment-based configuration
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

  return {
    ...SCHEDULE_CONFIG,
    SLOT_GENERATION_WEEKS: weeksAhead,
  };
};
