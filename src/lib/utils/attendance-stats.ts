import type { AttendanceRecord, AttendanceStats } from '@/types'

export function calculateStats(records: Pick<AttendanceRecord, 'status'>[]): AttendanceStats {
  const total = records.length
  const present = records.filter(r => r.status === 'present').length
  const absent = records.filter(r => r.status === 'absent').length
  const cancelled = records.filter(r => r.status === 'cancelled').length
  const holiday = records.filter(r => r.status === 'holiday').length
  const effectiveTotal = present + absent
  const percentage = effectiveTotal > 0 ? Math.round((present / effectiveTotal) * 100) : 0

  return { total, present, absent, cancelled, holiday, percentage }
}

export function calculateSafeToMiss(
  total: number,
  present: number,
  targetPercent: number
): { safeToMiss: number; classesNeeded: number; currentPercent: number } {
  const effectiveTotal = present + (total - present)
  const currentPercent = effectiveTotal > 0 ? (present / effectiveTotal) * 100 : 0

  if (currentPercent >= targetPercent) {
    const safeToMiss = Math.floor(
      (present - targetPercent / 100 * effectiveTotal) / (targetPercent / 100)
    )
    return { safeToMiss: Math.max(0, safeToMiss), classesNeeded: 0, currentPercent }
  }

  const classesNeeded = Math.ceil(
    (targetPercent / 100 * effectiveTotal - present) / (1 - targetPercent / 100)
  )
  return { safeToMiss: 0, classesNeeded: Math.max(0, classesNeeded), currentPercent }
}
