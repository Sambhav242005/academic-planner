export interface IndianHoliday {
  name: string
  month: number
  day: number
  fixed: boolean
}

export const INDIAN_NATIONAL_HOLIDAYS: IndianHoliday[] = [
  { name: 'Republic Day', month: 0, day: 26, fixed: true },
  { name: 'Maha Shivaratri', month: 2, day: -1, fixed: false },
  { name: 'Holi', month: 2, day: -1, fixed: false },
  { name: 'Id-ul-Fitr', month: 3, day: -1, fixed: false },
  { name: 'Dr. Ambedkar Jayanti', month: 3, day: 14, fixed: true },
  { name: 'Good Friday', month: 3, day: -1, fixed: false },
  { name: 'Buddha Purnima', month: 4, day: -1, fixed: false },
  { name: 'Independence Day', month: 7, day: 15, fixed: true },
  { name: 'Id-ul-Zuha', month: 7, day: -1, fixed: false },
  { name: 'Janmashtami', month: 7, day: -1, fixed: false },
  { name: 'Mahatma Gandhi Jayanti', month: 9, day: 2, fixed: true },
  { name: 'Dussehra', month: 9, day: -1, fixed: false },
  { name: 'Diwali', month: 10, day: -1, fixed: false },
  { name: 'Milad-un-Nabi', month: 10, day: -1, fixed: false },
  { name: 'Guru Nanak Jayanti', month: 10, day: -1, fixed: false },
  { name: 'Christmas Day', month: 11, day: 25, fixed: true },
]

export function getFixedHolidaysForYear(year: number): Array<{ name: string; date: string }> {
  return INDIAN_NATIONAL_HOLIDAYS
    .filter((h) => h.fixed)
    .map((h) => ({
      name: h.name,
      date: `${year}-${String(h.month + 1).padStart(2, '0')}-${String(h.day).padStart(2, '0')}`,
    }))
}

export function isIndianHoliday(date: string): IndianHoliday | null {
  const d = new Date(date)
  const month = d.getMonth()
  const day = d.getDate()

  for (const holiday of INDIAN_NATIONAL_HOLIDAYS) {
    if (holiday.fixed && holiday.month === month && holiday.day === day) {
      return holiday
    }
  }
  return null
}
