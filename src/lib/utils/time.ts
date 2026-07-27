export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function hasTimeOverlap(
  start1: string,
  end1: string | null,
  start2: string,
  end2: string | null
): boolean {
  const s1 = timeToMinutes(start1)
  const e1 = end1 ? timeToMinutes(end1) : s1 + 60
  const s2 = timeToMinutes(start2)
  const e2 = end2 ? timeToMinutes(end2) : s2 + 60

  return s1 < e2 && s2 < e1
}

export function checkCollision(
  dayOfWeek: number,
  startTime: string,
  endTime: string | null,
  existingClasses: Array<{ dayOfWeek: number; startTime: string; endTime: string | null; id?: string }>,
  excludeId?: string
): { hasCollision: boolean; conflictingClass?: string } {
  const sameDay = existingClasses.filter(
    (c) => c.dayOfWeek === dayOfWeek && c.id !== excludeId
  )

  for (const cls of sameDay) {
    if (hasTimeOverlap(startTime, endTime, cls.startTime, cls.endTime)) {
      return { hasCollision: true, conflictingClass: cls.id }
    }
  }

  return { hasCollision: false }
}
