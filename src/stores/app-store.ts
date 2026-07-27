import { create } from 'zustand'
import { getLocalDateKey } from '@/lib/utils/dates'

interface CalendarView {
  year: number
  month: number
  view: 'month' | 'week' | 'day'
  selectedDate: string
}

interface AppState {
  calendar: CalendarView
  sidebarOpen: boolean
  setCalendarView: (view: CalendarView['view']) => void
  setCalendarDate: (year: number, month: number) => void
  setSelectedDate: (date: string) => void
  toggleSidebar: () => void
}

export const useAppStore = create<AppState>((set) => ({
  calendar: {
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
    view: 'month',
    selectedDate: getLocalDateKey(),
  },
  sidebarOpen: true,
  setCalendarView: (view) =>
    set((s) => ({ calendar: { ...s.calendar, view } })),
  setCalendarDate: (year, month) =>
    set((s) => ({ calendar: { ...s.calendar, year, month } })),
  setSelectedDate: (selectedDate) =>
    set((s) => ({ calendar: { ...s.calendar, selectedDate } })),
  toggleSidebar: () =>
    set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}))
