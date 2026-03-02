import { useState, useCallback } from 'react';
import { useCRMStore } from '@/store/crmStore';
import { CRMEvent, TimeSlot, CalendarSlotSettings, SpecialDate } from '@/types/crm';
import Icon from '@/components/ui/icon';
import { useLightBilling, LBTariff } from '@/hooks/useLightBilling';

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

const STATUS_MAP: Record<CRMEvent['status'], { label: string; color: string; bg: string }> = {
  new:         { label: 'Запланировано', color: 'text-[#8892a4]', bg: 'bg-[#252d3d]' },
  in_progress: { label: 'В работе',      color: 'text-[#3b82f6]', bg: 'bg-[#3b82f6]/20' },
  done:        { label: 'Выполнено',     color: 'text-[#10b981]', bg: 'bg-[#10b981]/20' },
  cancelled:   { label: 'Отменено',     color: 'text-[#ef4444]', bg: 'bg-[#ef4444]/20' },
};

const inputCls = 'w-full bg-[#0f1117] border border-[#252d3d] rounded-lg px-3 py-2 text-sm text-white placeholder-[#4b5568] focus:outline-none focus:border-[#3b82f6] transition-colors';
const labelCls = 'block text-xs font-medium text-[#4b5568] mb-1 uppercase tracking-wide';

const DAY_NAMES = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const MONTH_NAMES = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

interface Props {
  onOpenPanel: (title: string, content: React.ReactNode) => void;
  onClosePanel: () => void;
}

function isWeekend(day: Date): boolean {
  const d = day.getDay();
  return d === 0 || d === 6;
}

function dateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

function getSlotsForDate(settings: CalendarSlotSettings, day: Date): TimeSlot[] {
  const ds = dateStr(day);
  const special = settings.specialDates?.find(sd => sd.date === ds);
  if (special) return special.slots;
  return isWeekend(day) ? (settings.weekendSlots || []) : (settings.weekdaySlots || []);
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

  const offConns = events.filter(e => e.officeId === currentOfficeId && e.type === 'connection');

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

  // Собираем все уникальные слоты для текущей недели (для строк таблицы)
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
          {/* Header row: Время + дни */}
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
                {/* Time label */}
                <div className="px-3 py-2 flex items-start pt-3 bg-[#0f1117] border-r border-[#252d3d]">
                  <span className="text-xs text-[#4b5568] font-medium">{slotTime}</span>
                </div>
                {/* Day cells */}
                {weekDays.map((day) => {
                  const ds = dateStr(day);
                  const daySlots = getSlotsForDate(settings, day);
                  const slotDef = daySlots.find(s => s.time === slotTime);
                  const isWE = isWeekend(day);

                  if (!slotDef) {
                    return (
                      <div key={day.toISOString()} className={`border-l border-[#252d3d] min-h-[72px] ${isWE ? 'bg-[#0f1117]' : 'bg-[#161b27]'}`} />
                    );
                  }

                  const connsHere = offConns.filter(c => c.date === ds && c.timeSlot === slotTime);
                  const freeSlots = slotDef.brigades - connsHere.length;

                  return (
                    <div key={day.toISOString()} className={`border-l border-[#252d3d] p-1.5 min-h-[72px] ${isWE ? 'bg-[#0f1117]' : 'bg-[#161b27] hover:bg-[#1e2637]'} transition-colors`}>
                      {/* Brigades capacity */}
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[10px] font-medium ${freeSlots > 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                          {freeSlots > 0 ? `${freeSlots} св.` : 'Занято'}
                        </span>
                        {freeSlots > 0 && (
                          <button
                            onClick={() => openConnectionForm(ds, slotDef)}
                            className="w-5 h-5 rounded flex items-center justify-center bg-[#3b82f6]/20 hover:bg-[#3b82f6] text-[#3b82f6] hover:text-white transition-colors"
                            title="Добавить подключение"
                          >
                            <Icon name="Plus" size={10} />
                          </button>
                        )}
                      </div>
                      {/* Connections */}
                      {connsHere.map((conn) => {
                        const st = STATUS_MAP[conn.status];
                        return (
                          <div
                            key={conn.id}
                            onClick={() => openConnectionForm(ds, slotDef, conn)}
                            className={`${st.bg} rounded p-1.5 mb-1 cursor-pointer hover:opacity-80 transition-opacity overflow-hidden`}
                          >
                            <div className={`text-xs font-medium ${st.color} truncate leading-tight w-full`}>{conn.subscriberName}</div>
                            {conn.subscriberAddress && (
                              <div className="text-[10px] text-[#4b5568] truncate w-full">{conn.subscriberAddress}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────── Slot Settings Panel ─────────────── */

interface SlotSettingsProps {
  settings: CalendarSlotSettings;
  tab: 'weekday' | 'weekend' | 'special';
  onTabChange: (t: 'weekday' | 'weekend' | 'special') => void;
  onSave: (s: CalendarSlotSettings) => void;
}

function SlotSettings({ settings, tab, onTabChange, onSave }: SlotSettingsProps) {
  const [weekdaySlots, setWeekdaySlots] = useState<TimeSlot[]>(settings.weekdaySlots || []);
  const [weekendSlots, setWeekendSlots] = useState<TimeSlot[]>(settings.weekendSlots || []);
  const [specialDates, setSpecialDates] = useState<SpecialDate[]>(settings.specialDates || []);
  const [newSpecialDate, setNewSpecialDate] = useState('');
  const [newSpecialLabel, setNewSpecialLabel] = useState('');

  const addSlot = (kind: 'weekday' | 'weekend') => {
    const newSlot: TimeSlot = { id: uid(), time: '09:00', brigades: 1 };
    if (kind === 'weekday') setWeekdaySlots(prev => [...prev, newSlot]);
    else setWeekendSlots(prev => [...prev, newSlot]);
  };

  const removeSlot = (kind: 'weekday' | 'weekend', id: string) => {
    if (kind === 'weekday') setWeekdaySlots(prev => prev.filter(s => s.id !== id));
    else setWeekendSlots(prev => prev.filter(s => s.id !== id));
  };

  const updateSlot = (kind: 'weekday' | 'weekend', id: string, field: keyof TimeSlot, val: string | number) => {
    const upd = (arr: TimeSlot[]) => arr.map(s => s.id === id ? { ...s, [field]: val } : s);
    if (kind === 'weekday') setWeekdaySlots(upd);
    else setWeekendSlots(upd);
  };

  const addSpecialDate = () => {
    if (!newSpecialDate) return;
    const exists = specialDates.find(sd => sd.date === newSpecialDate);
    if (exists) return;
    setSpecialDates(prev => [...prev, { date: newSpecialDate, label: newSpecialLabel, slots: [] }]);
    setNewSpecialDate('');
    setNewSpecialLabel('');
  };

  const removeSpecialDate = (date: string) => setSpecialDates(prev => prev.filter(sd => sd.date !== date));

  const addSpecialSlot = (date: string) => {
    setSpecialDates(prev => prev.map(sd =>
      sd.date === date ? { ...sd, slots: [...sd.slots, { id: uid(), time: '09:00', brigades: 1 }] } : sd
    ));
  };

  const updateSpecialSlot = (date: string, id: string, field: keyof TimeSlot, val: string | number) => {
    setSpecialDates(prev => prev.map(sd =>
      sd.date === date
        ? { ...sd, slots: sd.slots.map(s => s.id === id ? { ...s, [field]: val } : s) }
        : sd
    ));
  };

  const removeSpecialSlot = (date: string, id: string) => {
    setSpecialDates(prev => prev.map(sd =>
      sd.date === date ? { ...sd, slots: sd.slots.filter(s => s.id !== id) } : sd
    ));
  };

  const handleSave = () => {
    onSave({ ...settings, weekdaySlots, weekendSlots, specialDates });
  };

  const SlotList = ({ slots, kind }: { slots: TimeSlot[]; kind: 'weekday' | 'weekend' }) => (
    <div className="space-y-2">
      {slots.length === 0 && (
        <div className="text-sm text-[#4b5568] text-center py-4">Слоты не добавлены</div>
      )}
      {slots.map((s) => (
        <div key={s.id} className="flex items-center gap-2 bg-[#0f1117] rounded-lg p-2">
          <div className="flex-1">
            <label className="text-[10px] text-[#4b5568] mb-1 block">Время</label>
            <input
              type="time"
              value={s.time}
              onChange={e => updateSlot(kind, s.id, 'time', e.target.value)}
              className={inputCls}
            />
          </div>
          <div className="w-28">
            <label className="text-[10px] text-[#4b5568] mb-1 block">Бригад</label>
            <input
              type="number"
              min={1}
              max={20}
              value={s.brigades}
              onChange={e => updateSlot(kind, s.id, 'brigades', Math.max(1, +e.target.value))}
              className={inputCls}
            />
          </div>
          <button
            onClick={() => removeSlot(kind, s.id)}
            className="mt-4 p-1.5 text-[#ef4444] hover:bg-[#ef4444]/10 rounded transition-colors"
          >
            <Icon name="Trash2" size={14} />
          </button>
        </div>
      ))}
      <button
        onClick={() => addSlot(kind)}
        className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-[#252d3d] rounded-lg text-sm text-[#4b5568] hover:text-white hover:border-[#3b82f6] transition-colors"
      >
        <Icon name="Plus" size={14} />Добавить слот
      </button>
    </div>
  );

  return (
    <div className="bg-[#161b27] border border-[#252d3d] rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Настройка тайм-слотов</h3>
        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-xs font-medium transition-colors"
        >
          <Icon name="Save" size={12} />Сохранить
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#0f1117] rounded-lg p-1">
        {(['weekday', 'weekend', 'special'] as const).map(t => (
          <button
            key={t}
            onClick={() => onTabChange(t)}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${tab === t ? 'bg-[#1e2637] text-white' : 'text-[#4b5568] hover:text-white'}`}
          >
            {t === 'weekday' ? 'Пн–Пт' : t === 'weekend' ? 'Сб–Вс' : 'Особые даты'}
          </button>
        ))}
      </div>

      {tab === 'weekday' && <SlotList slots={weekdaySlots} kind="weekday" />}
      {tab === 'weekend' && <SlotList slots={weekendSlots} kind="weekend" />}

      {tab === 'special' && (
        <div className="space-y-3">
          {/* Add special date */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className={labelCls}>Дата</label>
              <input type="date" value={newSpecialDate} onChange={e => setNewSpecialDate(e.target.value)} className={inputCls} />
            </div>
            <div className="flex-1">
              <label className={labelCls}>Название (необяз.)</label>
              <input placeholder="8 Марта" value={newSpecialLabel} onChange={e => setNewSpecialLabel(e.target.value)} className={inputCls} />
            </div>
            <button
              onClick={addSpecialDate}
              className="mt-5 px-3 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-sm transition-colors"
            >
              <Icon name="Plus" size={14} />
            </button>
          </div>

          {specialDates.length === 0 && (
            <div className="text-sm text-[#4b5568] text-center py-4">Особых дат нет</div>
          )}

          {specialDates.map(sd => (
            <div key={sd.date} className="bg-[#0f1117] border border-[#252d3d] rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-semibold text-[#f59e0b]">{sd.date}</span>
                  {sd.label && <span className="ml-2 text-xs text-[#8892a4]">{sd.label}</span>}
                </div>
                <button onClick={() => removeSpecialDate(sd.date)} className="p-1 text-[#ef4444] hover:bg-[#ef4444]/10 rounded transition-colors">
                  <Icon name="Trash2" size={14} />
                </button>
              </div>
              {sd.slots.map(s => (
                <div key={s.id} className="flex items-center gap-2">
                  <input
                    type="time"
                    value={s.time}
                    onChange={e => updateSpecialSlot(sd.date, s.id, 'time', e.target.value)}
                    className={`${inputCls} flex-1`}
                  />
                  <input
                    type="number"
                    min={1} max={20}
                    value={s.brigades}
                    onChange={e => updateSpecialSlot(sd.date, s.id, 'brigades', Math.max(1, +e.target.value))}
                    className={`${inputCls} w-24`}
                    placeholder="Бригад"
                  />
                  <button onClick={() => removeSpecialSlot(sd.date, s.id)} className="p-1.5 text-[#ef4444] hover:bg-[#ef4444]/10 rounded transition-colors">
                    <Icon name="X" size={12} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => addSpecialSlot(sd.date)}
                className="w-full py-1.5 text-xs text-[#4b5568] hover:text-white border border-dashed border-[#252d3d] rounded-lg hover:border-[#3b82f6] transition-colors"
              >
                + слот
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────── Connection Form ─────────────── */

interface ConnectionFormProps {
  date: string;
  slot: TimeSlot;
  event?: CRMEvent;
  employees: ReturnType<typeof useCRMStore>['employees'];
  onSave: (data: Omit<CRMEvent, 'id' | 'officeId' | 'createdAt'>) => void;
  onDelete?: () => void;
  onCancel: () => void;
}

function ConnectionForm({ date, slot, event, employees, onSave, onDelete, onCancel }: ConnectionFormProps) {
  const lb = useLightBilling();
  const [name, setName] = useState(event?.subscriberName || '');
  const [address, setAddress] = useState(event?.subscriberAddress || '');
  const [phone, setPhone] = useState(event?.subscriberPhone || '');
  const [technicianId, setTechnicianId] = useState(event?.technicianId || '');
  const [status, setStatus] = useState<CRMEvent['status']>(event?.status || 'new');
  const [notes, setNotes] = useState(event?.notes || '');
  const [tariffId, setTariffId] = useState(event?.tariffId || '');
  const [tariffName, setTariffName] = useState(event?.tariffName || '');
  const [tariffs, setTariffs] = useState<LBTariff[]>([]);
  const [tariffsLoaded, setTariffsLoaded] = useState(false);
  const [newSubGroup, setNewSubGroup] = useState('Физические лица');
  const [newSubContract, setNewSubContract] = useState('');
  const [newSubLogin, setNewSubLogin] = useState('');
  const [newSubPassword, setNewSubPassword] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createResult, setCreateResult] = useState('');
  const [subLbId, setSubLbId] = useState(event?.subscriberLbId || '');

  useState(() => {
    lb.loadTariffs().then(list => { setTariffs(list); setTariffsLoaded(true); });
  });

  const handleTariffChange = (id: string) => {
    setTariffId(id);
    setTariffName(tariffs.find(t => t.id === id)?.name || '');
  };

  const handleCreateSubscriber = async () => {
    if (!name || !address || !tariffId) {
      setCreateResult('Заполните ФИО, адрес и тариф');
      return;
    }
    setCreateLoading(true);
    setCreateResult('');
    const result = await lb.createSubscriber({
      fullName: name, address, phone, tariffId,
      contractNumber: newSubContract,
      login: newSubLogin,
      password: newSubPassword,
      group: newSubGroup,
    });
    setCreateLoading(false);
    if (result.success) {
      setSubLbId(result.lb_id || '');
      setCreateResult(`✓ Создан в LightBilling${result.lb_id ? ` (ID: ${result.lb_id})` : ''}`);
    } else {
      setCreateResult(`Ошибка: ${result.message}`);
    }
  };

  const handleSave = () => {
    if (!name) return;
    onSave({
      type: 'connection',
      status,
      priority: 'medium',
      subscriberName: name,
      subscriberAddress: address,
      subscriberPhone: phone,
      subscriberLbId: subLbId,
      technicianId,
      date,
      timeSlot: slot.time,
      tariffId,
      tariffName,
      notes,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs font-medium text-[#10b981] bg-[#10b981]/10 border border-[#10b981]/20 rounded-lg px-3 py-2">
        <Icon name="Wifi" size={13} />
        Подключение · {date} · {slot.time}
      </div>

      {/* Группа */}
      <div>
        <label className={labelCls}>Группа *</label>
        <select value={newSubGroup} onChange={e => setNewSubGroup(e.target.value)} className={inputCls + ' cursor-pointer'}>
          <option value="Физические лица">Физические лица</option>
          <option value="Юридические лица">Юридические лица</option>
        </select>
      </div>

      {/* ФИО */}
      <div>
        <label className={labelCls}>ФИО *</label>
        <input value={name} onChange={e => setName(e.target.value)} className={inputCls} placeholder="Фамилия Имя Отчество" />
      </div>

      {/* Адрес */}
      <div>
        <label className={labelCls}>Адрес *</label>
        <input value={address} onChange={e => setAddress(e.target.value)} className={inputCls} placeholder="Улица, дом, квартира" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Телефон</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} className={inputCls} placeholder="+7..." />
        </div>
        <div>
          <label className={labelCls}>Договор</label>
          <input value={newSubContract} onChange={e => setNewSubContract(e.target.value)} className={inputCls} placeholder="Номер" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Логин</label>
          <input value={newSubLogin} onChange={e => setNewSubLogin(e.target.value)} className={inputCls} placeholder="Авто" />
        </div>
        <div>
          <label className={labelCls}>Пароль</label>
          <input value={newSubPassword} onChange={e => setNewSubPassword(e.target.value)} className={inputCls} placeholder="Авто" />
        </div>
      </div>

      {/* Тариф */}
      <div>
        <label className={labelCls}>Тариф *</label>
        {!tariffsLoaded ? (
          <div className="flex items-center gap-2 text-xs text-[#4b5568] py-2">
            <Icon name="Loader" size={12} className="animate-spin" />Загрузка тарифов...
          </div>
        ) : (
          <select value={tariffId} onChange={e => handleTariffChange(e.target.value)} className={inputCls + ' cursor-pointer'}>
            <option value="">— Выберите тариф —</option>
            {tariffs.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}
      </div>

      {/* Создать в LB */}
      {!event && (
        <>
          <button
            onClick={handleCreateSubscriber}
            disabled={createLoading || !name || !address || !tariffId}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#10b981] hover:bg-[#059669] disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {createLoading
              ? <><Icon name="Loader" size={14} className="animate-spin" />Создание в LightBilling...</>
              : <><Icon name="UserPlus" size={14} />Создать абонента в LightBilling</>}
          </button>
          {createResult && (
            <div className={`text-xs px-3 py-2 rounded-lg ${createResult.startsWith('✓') ? 'bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20' : 'bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20'}`}>
              {createResult}
            </div>
          )}
        </>
      )}

      {/* Статус / Техник */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Статус</label>
          <select value={status} onChange={e => setStatus(e.target.value as CRMEvent['status'])} className={inputCls + ' cursor-pointer'}>
            {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Исполнитель</label>
          <select value={technicianId} onChange={e => setTechnicianId(e.target.value)} className={inputCls + ' cursor-pointer'}>
            <option value="">— Выберите —</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.lastName} {e.firstName}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className={labelCls}>Заметки</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={inputCls} />
      </div>

      {/* Buttons */}
      <div className="flex gap-2 pt-2">
        <button onClick={handleSave} disabled={!name} className="flex-1 py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
          {event ? 'Сохранить' : 'Создать подключение'}
        </button>
        <button onClick={onCancel} className="px-4 py-2.5 bg-[#1e2637] hover:bg-[#252d3d] text-[#8892a4] hover:text-white rounded-lg text-sm transition-colors">
          Отмена
        </button>
        {onDelete && (
          <button onClick={onDelete} className="px-3 py-2.5 bg-[#ef4444]/10 hover:bg-[#ef4444]/20 text-[#ef4444] rounded-lg text-sm transition-colors">
            <Icon name="Trash2" size={14} />
          </button>
        )}
      </div>
    </div>
  );
}