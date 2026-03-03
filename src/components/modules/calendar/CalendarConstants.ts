import { CalendarSlotSettings, TimeSlot } from '@/types/crm';

export function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

export const STATUS_MAP = {
  new:         { label: 'Запланировано', color: 'text-[#8892a4]', bg: 'bg-[#252d3d]' },
  in_progress: { label: 'В работе',      color: 'text-[#3b82f6]', bg: 'bg-[#3b82f6]/20' },
  done:        { label: 'Выполнено',     color: 'text-[#10b981]', bg: 'bg-[#10b981]/20' },
  cancelled:   { label: 'Отменено',     color: 'text-[#ef4444]', bg: 'bg-[#ef4444]/20' },
} as const;

export const inputCls = 'w-full bg-[#0f1117] border border-[#252d3d] rounded-lg px-3 py-2 text-sm text-white placeholder-[#4b5568] focus:outline-none focus:border-[#3b82f6] transition-colors';
export const labelCls = 'block text-xs font-medium text-[#4b5568] mb-1 uppercase tracking-wide';

export const DAY_NAMES = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
export const MONTH_NAMES = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

export function isWeekend(day: Date): boolean {
  const d = day.getDay();
  return d === 0 || d === 6;
}

export function dateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

export function getSlotsForDate(settings: CalendarSlotSettings, day: Date): TimeSlot[] {
  const ds = dateStr(day);
  const special = settings.specialDates?.find(sd => sd.date === ds);
  if (special) return special.slots;
  return isWeekend(day) ? (settings.weekendSlots || []) : (settings.weekdaySlots || []);
}
