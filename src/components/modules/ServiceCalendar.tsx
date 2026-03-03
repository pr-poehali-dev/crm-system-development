import { useState, useCallback } from 'react';
import { useCRMStore } from '@/store/crmStore';
import { CRMEvent, TimeSlot, CalendarSlotSettings } from '@/types/crm';
import Icon from '@/components/ui/icon';
import { DAY_NAMES, MONTH_NAMES, isWeekend, dateStr, getSlotsForDate, STATUS_MAP, uid } from './calendar/CalendarConstants';
import SlotSettings from './calendar/CalendarSlotSettings';
import ConnectionForm from './calendar/CalendarConnectionForm';

interface Props {
  onOpenPanel: (title: string, content: React.ReactNode) => void;
  onClosePanel: () => void;
}

export default function ServiceCalendar({ onOpenPanel, onClosePanel }: Props) {
  const {
    currentOfficeId, events, employees, calendarSettings,
    addEvent, updateEvent, deleteEvent, updateCalendarSettings,
  } = useCRMStore();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'weekday' | 'weekend' | 'special'>('weekday');

  const settings: CalendarSlotSettings = calendarSettings.find(s => s.officeId === currentOfficeId)
    || { officeId: currentOfficeId, weekdaySlots: [], weekendSlots: [], specialDates: [] };

  const getDaysInWeek = (date: Date) => {
    const start = new Date(date);
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + diff);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  };

  const weekDays = getDaysInWeek(currentDate);
  const prevWeek = () => { const d = new Date(currentDate); d.setDate(d.getDate() - 7); setCurrentDate(d); };
  const nextWeek = () => { const d = new Date(currentDate); d.setDate(d.getDate() + 7); setCurrentDate(d); };

  const allSlotTimes = Array.from(new Set(
    weekDays.flatMap(day => getSlotsForDate(settings, day).map(s => s.time))
  )).sort();

  const openConnectionForm = useCallback((date: string, slot: TimeSlot, conn?: CRMEvent) => {
    onOpenPanel(
      conn ? 'Редактировать подключение' : `Новое подключение — ${date} ${slot.time}`,
      <ConnectionForm
        date={date}
        slot={slot}
        event={conn}
        employees={employees.filter(e => e.status === 'active')}
        onSave={(data) => {
          if (conn) updateEvent(conn.id, data);
          else addEvent({ id: uid(), officeId: currentOfficeId, createdAt: new Date().toISOString(), ...data } as CRMEvent);
          onClosePanel();
        }}
        onDelete={conn ? () => { deleteEvent(conn.id); onClosePanel(); } : undefined}
        onCancel={onClosePanel}
      />
    );
  }, [employees, currentOfficeId, onOpenPanel, onClosePanel, addEvent, updateEvent, deleteEvent]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button onClick={prevWeek} className="p-2 hover:bg-[#1e2637] rounded-lg text-[#8892a4] hover:text-white transition-colors">
            <Icon name="ChevronLeft" size={16} />
          </button>
          <span className="text-sm font-semibold text-white">
            {MONTH_NAMES[weekDays[0].getMonth()]} {weekDays[0].getDate()} — {weekDays[6].getDate()}, {weekDays[0].getFullYear()}
          </span>
          <button onClick={nextWeek} className="p-2 hover:bg-[#1e2637] rounded-lg text-[#8892a4] hover:text-white transition-colors">
            <Icon name="ChevronRight" size={16} />
          </button>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 text-sm bg-[#1e2637] hover:bg-[#252d3d] text-[#8892a4] hover:text-white rounded-lg transition-colors">
            Сегодня
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${showSettings ? 'bg-[#3b82f6] text-white' : 'bg-[#1e2637] text-[#8892a4] hover:text-white'}`}
          >
            <Icon name="Settings2" size={14} />Тайм-слоты
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <SlotSettings
          settings={settings}
          tab={settingsTab}
          onTabChange={setSettingsTab}
          onSave={(s) => updateCalendarSettings(s)}
        />
      )}

      {/* Calendar Grid */}
      <div className="border border-[#252d3d] rounded-xl overflow-x-auto bg-[#161b27]">
        <div className="min-w-[700px]">
          {/* Header row */}
          <div className="grid border-b border-[#252d3d]" style={{ gridTemplateColumns: '72px repeat(7, 1fr)' }}>
            <div className="px-3 py-3 text-xs text-[#4b5568] font-semibold uppercase bg-[#0f1117] rounded-tl-xl">Время</div>
            {weekDays.map((day) => {
              const isToday = day.toDateString() === new Date().toDateString();
              const isWE = isWeekend(day);
              const ds = dateStr(day);
              const special = settings.specialDates?.find(sd => sd.date === ds);
              return (
                <div key={day.toISOString()} className={`px-2 py-3 text-center border-l border-[#252d3d] last:rounded-tr-xl ${isWE ? 'bg-[#0f1117]' : 'bg-[#161b27]'}`}>
                  <div className={`text-xs font-semibold uppercase ${isWE ? 'text-[#4b5568]' : 'text-[#8892a4]'}`}>
                    {DAY_NAMES[day.getDay()]}
                  </div>
                  <div className={`text-sm font-bold mt-0.5 ${isToday ? 'text-[#3b82f6]' : 'text-white'}`}>
                    {day.getDate()}
                  </div>
                  {special && (
                    <div className="text-[10px] text-[#f59e0b] mt-0.5 truncate">{special.label || 'Особый день'}</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Slot rows */}
          {allSlotTimes.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#4b5568]">
              Нет тайм-слотов. Нажмите «Тайм-слоты» чтобы настроить.
            </div>
          ) : (
            allSlotTimes.map((slotTime) => (
              <div key={slotTime} className="grid border-b border-[#252d3d] last:border-0" style={{ gridTemplateColumns: '72px repeat(7, 1fr)' }}>
                <div className="px-3 py-2 flex items-start pt-3 bg-[#0f1117] border-r border-[#252d3d]">
                  <span className="text-xs text-[#4b5568] font-medium">{slotTime}</span>
                </div>
                {weekDays.map((day) => {
                  const ds = dateStr(day);
                  const daySlots = getSlotsForDate(settings, day);
                  const slotDef = daySlots.find(s => s.time === slotTime);
                  const isWE = isWeekend(day);

                  if (!slotDef) {
                    return (
                      <div key={day.toISOString()} className={`border-l border-[#252d3d] h-[88px] overflow-hidden ${isWE ? 'bg-[#0f1117]' : 'bg-[#161b27]'}`}>
                        <div className="h-full flex items-center justify-center">
                          <span className="text-[10px] text-[#252d3d]">—</span>
                        </div>
                      </div>
                    );
                  }

                  const brigades = slotDef.brigades || 1;
                  const slotEvents = events.filter(e =>
                    e.officeId === currentOfficeId &&
                    e.type === 'connection' &&
                    e.date === ds &&
                    e.timeSlot === slotTime
                  );

                  return (
                    <div key={day.toISOString()} className={`border-l border-[#252d3d] p-1 min-h-[88px] ${isWE ? 'bg-[#0f1117]' : 'bg-[#161b27]'}`}>
                      <div className="flex flex-col gap-1 h-full">
                        {Array.from({ length: brigades }, (_, bi) => {
                          const conn = slotEvents[bi];
                          if (conn) {
                            const st = STATUS_MAP[conn.status];
                            return (
                              <button
                                key={bi}
                                onClick={() => openConnectionForm(ds, slotDef, conn)}
                                className={`w-full text-left px-1.5 py-1 rounded-md text-[10px] leading-tight ${st.bg} border border-white/5 hover:border-white/20 transition-all flex-1`}
                              >
                                <div className={`font-semibold truncate ${st.color}`}>{conn.subscriberName || '—'}</div>
                                <div className="text-[#4b5568] truncate mt-0.5">{conn.subscriberAddress || ''}</div>
                              </button>
                            );
                          }
                          return (
                            <button
                              key={bi}
                              onClick={() => openConnectionForm(ds, slotDef)}
                              className="w-full flex-1 rounded-md border border-dashed border-[#252d3d] hover:border-[#3b82f6] hover:bg-[#3b82f6]/5 transition-all flex items-center justify-center min-h-[32px]"
                            >
                              <Icon name="Plus" size={10} className="text-[#252d3d] group-hover:text-[#3b82f6]" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(STATUS_MAP).map(([, v]) => (
          <div key={v.label} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${v.bg}`} />
            <span className="text-xs text-[#4b5568]">{v.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
