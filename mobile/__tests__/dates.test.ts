import {
  formatTime,
  getDayName,
  getDayShort,
  isSameDay,
  addDays,
  getMonthDays,
  getWeekNumber,
} from '../src/utils/dates';

describe('Date Utilities', () => {
  describe('formatTime', () => {
    it('formats 24h time to 12h with AM/PM', () => {
      expect(formatTime('09:30')).toBe('9:30 AM');
      expect(formatTime('14:15')).toBe('2:15 PM');
      expect(formatTime('00:00')).toBe('12:00 AM');
      expect(formatTime('12:00')).toBe('12:00 PM');
    });

    it('handles midnight', () => {
      expect(formatTime('00:00')).toBe('12:00 AM');
    });

    it('handles noon', () => {
      expect(formatTime('12:00')).toBe('12:00 PM');
    });

    it('handles 11:59 PM', () => {
      expect(formatTime('23:59')).toBe('11:59 PM');
    });
  });

  describe('getDayName', () => {
    it('returns full day name', () => {
      expect(getDayName(0)).toBe('Sunday');
      expect(getDayName(1)).toBe('Monday');
      expect(getDayName(2)).toBe('Tuesday');
      expect(getDayName(3)).toBe('Wednesday');
      expect(getDayName(4)).toBe('Thursday');
      expect(getDayName(5)).toBe('Friday');
      expect(getDayName(6)).toBe('Saturday');
    });
  });

  describe('getDayShort', () => {
    it('returns abbreviated day name', () => {
      expect(getDayShort(0)).toBe('Sun');
      expect(getDayShort(1)).toBe('Mon');
      expect(getDayShort(2)).toBe('Tue');
      expect(getDayShort(3)).toBe('Wed');
      expect(getDayShort(4)).toBe('Thu');
      expect(getDayShort(5)).toBe('Fri');
      expect(getDayShort(6)).toBe('Sat');
    });
  });

  describe('isSameDay', () => {
    it('returns true for same dates', () => {
      expect(isSameDay('2026-07-30', '2026-07-30')).toBe(true);
    });

    it('returns false for different dates', () => {
      expect(isSameDay('2026-07-30', '2026-07-31')).toBe(false);
    });

    it('returns false for different months', () => {
      expect(isSameDay('2026-07-30', '2026-08-30')).toBe(false);
    });
  });

  describe('addDays', () => {
    it('adds days to date', () => {
      const date = new Date(2026, 0, 1);
      const result = addDays(date, 5);
      expect(result.getDate()).toBe(6);
    });

    it('handles month boundaries', () => {
      const date = new Date(2026, 0, 29);
      const result = addDays(date, 5);
      expect(result.getMonth()).toBe(1);
      expect(result.getDate()).toBe(3);
    });

    it('handles adding 0 days', () => {
      const date = new Date(2026, 0, 15);
      const result = addDays(date, 0);
      expect(result.getDate()).toBe(15);
    });

    it('handles negative days', () => {
      const date = new Date(2026, 0, 15);
      const result = addDays(date, -5);
      expect(result.getDate()).toBe(10);
    });
  });

  describe('getMonthDays', () => {
    it('returns all days in month', () => {
      const days = getMonthDays(2026, 1);
      expect(days.length).toBe(28);
    });

    it('handles leap years', () => {
      const days = getMonthDays(2024, 1);
      expect(days.length).toBe(29);
    });

    it('returns 31 days for January', () => {
      const days = getMonthDays(2026, 0);
      expect(days.length).toBe(31);
    });

    it('all days have correct month', () => {
      const days = getMonthDays(2026, 2);
      days.forEach((d) => {
        expect(d.getMonth()).toBe(2);
      });
    });
  });

  describe('getWeekNumber', () => {
    it('returns valid week number', () => {
      const date = new Date(2026, 0, 5);
      const week = getWeekNumber(date);
      expect(week).toBeGreaterThan(0);
      expect(week).toBeLessThanOrEqual(53);
    });

    it('week 1 of year', () => {
      const date = new Date(2026, 0, 1);
      const week = getWeekNumber(date);
      expect(week).toBeGreaterThanOrEqual(1);
      expect(week).toBeLessThanOrEqual(2);
    });
  });
});
