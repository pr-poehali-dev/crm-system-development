import { useState } from 'react';
import { useCRMStore } from '@/store/crmStore';
import { Connection } from '@/types/crm';
import Icon from '@/components/ui/icon';

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

const STATUS_MAP: Record<Connection['status'], { label: string; color: string; bg: string }> = {
  scheduled: { label: 'Запланировано', color: 'text-[#8892a4]', bg: 'bg-[#252d3d]' },
  in_progress: { label: 'В работе', color: 'text-[#3b82f6]', bg: 'bg-[#3b82f6]/20' },
  done: { label: 'Выполнено', color: 'text-[#10b981]', bg: 'bg-[#10b981]/20' },
  cancelled: { label: 'Отменено', color: 'text-[#ef4444]', bg: 'bg-[#ef4444]/20' },
};

const inputCls = "w-full bg-[#0f1117] border border-[#252d3d] rounded-lg px-3 py-2 text-sm text-white placeholder-[#4b5568] focus:outline-none focus:border-[#3b82f6] transition-colors";

interface Props {
  onOpenPanel: (title: string, content: React.ReactNode) => void;
  onClosePanel: () => void;
}

export default function ServiceCalendar({ onOpenPanel, onClosePanel }: Props) {
  const { currentOfficeId, connections, employees, subscribers, calendarSettings, addConnection, updateConnection, deleteConnection, updateCalendarSettings } = useCRMStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showSettings, setShowSettings] = useState(false);

  const offConns = connections.filter((c) => c.officeId === currentOfficeId);
  const settings = calendarSettings.find((s) => s.officeId === currentOfficeId) || { officeId: currentOfficeId, slotsPerDay: 6, workDays: [1, 2, 3, 4, 5], startTime: '09:00', endTime: '18:00' };

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

  const generateSlots = () => {
    const slots: string[] = [];
    const [sh, sm] = settings.startTime.split(':').map(Number);
    const [eh, em] = settings.endTime.split(':').map(Number);
    const totalMin = (eh * 60 + em) - (sh * 60 + sm);
    const interval = Math.floor(totalMin / settings.slotsPerDay);
    for (let i = 0; i < settings.slotsPerDay; i++) {
      const total = sh * 60 + sm + i * interval;
      const h = Math.floor(total / 60).toString().padStart(2, '0');
      const m = (total % 60).toString().padStart(2, '0');
      slots.push(`${h}:${m}`);
    }
    return slots;
  };
  const slots = generateSlots();

  const openConnectionForm = (date: string, slot: string, conn?: Connection) => {
    const isNew = !conn;
    let form = {
      subscriberName: conn?.subscriberName || '',
      subscriberAddress: conn?.subscriberAddress || '',
      subscriberPhone: conn?.subscriberPhone || '',
      technicianId: conn?.technicianId || '',
      status: conn?.status || 'scheduled' as Connection['status'],
      notes: conn?.notes || '',
      subscriberSearch: '',
    };

    const save = () => {
      if (isNew) {
        addConnection({ id: uid(), officeId: currentOfficeId, date, timeSlot: slot, ...form, createdAt: new Date().toISOString(), subscriberId: undefined });
      } else {
        updateConnection(conn!.id, { ...form });
      }
      onClosePanel();
    };

    onOpenPanel(isNew ? `Новое подключение — ${date} ${slot}` : 'Редактировать подключение', (
      <ConnectionForm form={form} onChange={(f) => { form = f; }} employees={employees} subscribers={subscribers} onSave={save} onCancel={onClosePanel} date={date} slot={slot} />
    ));
  };

  const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={prevWeek} className="p-2 hover:bg-[#1e2637] rounded-lg text-[#8892a4] hover:text-white transition-colors"><Icon name="ChevronLeft" size={16} /></button>
          <span className="text-sm font-semibold text-white">{monthNames[weekDays[0].getMonth()]} — {monthNames[weekDays[6].getMonth()]} {weekDays[0].getFullYear()}</span>
          <button onClick={nextWeek} className="p-2 hover:bg-[#1e2637] rounded-lg text-[#8892a4] hover:text-white transition-colors"><Icon name="ChevronRight" size={16} /></button>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 text-sm bg-[#1e2637] hover:bg-[#252d3d] text-[#8892a4] hover:text-white rounded-lg transition-colors">Сегодня</button>
          <button onClick={() => setShowSettings(!showSettings)} className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${showSettings ? 'bg-[#3b82f6] text-white' : 'bg-[#1e2637] text-[#8892a4] hover:text-white'}`}>
            <Icon name="Settings2" size={14} />Слоты
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="bg-[#161b27] border border-[#252d3d] rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3">Настройки слотов</h3>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-[#8892a4] mb-1">Слотов в день</label>
              <input type="number" value={settings.slotsPerDay} onChange={(e) => updateCalendarSettings({ ...settings, slotsPerDay: +e.target.value })} className={inputCls} min={1} max={20} />
            </div>
            <div>
              <label className="block text-xs text-[#8892a4] mb-1">Начало</label>
              <input type="time" value={settings.startTime} onChange={(e) => updateCalendarSettings({ ...settings, startTime: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-[#8892a4] mb-1">Конец</label>
              <input type="time" value={settings.endTime} onChange={(e) => updateCalendarSettings({ ...settings, endTime: e.target.value })} className={inputCls} />
            </div>
          </div>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="bg-[#161b27] border border-[#252d3d] rounded-xl overflow-hidden">
        <div className="grid grid-cols-8 border-b border-[#252d3d]">
          <div className="px-3 py-3 text-xs text-[#4b5568] font-semibold uppercase">Время</div>
          {weekDays.map((day) => {
            const isToday = day.toDateString() === new Date().toDateString();
            const isWorkDay = settings.workDays.includes(day.getDay() === 0 ? 7 : day.getDay());
            return (
              <div key={day.toISOString()} className={`px-3 py-3 text-center ${!isWorkDay ? 'bg-[#0f1117]' : ''}`}>
                <div className="text-xs text-[#4b5568] font-semibold uppercase">{dayNames[day.getDay()]}</div>
                <div className={`text-sm font-bold mt-0.5 ${isToday ? 'text-[#3b82f6]' : 'text-white'}`}>{day.getDate()}</div>
              </div>
            );
          })}
        </div>
        <div className="divide-y divide-[#252d3d]">
          {slots.map((slot) => (
            <div key={slot} className="grid grid-cols-8 min-h-[64px]">
              <div className="px-3 py-2 flex items-start">
                <span className="text-xs text-[#4b5568] font-medium">{slot}</span>
              </div>
              {weekDays.map((day) => {
                const dateStr = day.toISOString().split('T')[0];
                const isWorkDay = settings.workDays.includes(day.getDay() === 0 ? 7 : day.getDay());
                const dayConns = offConns.filter((c) => c.date === dateStr && c.timeSlot === slot);
                return (
                  <div key={day.toISOString()} className={`p-1 border-l border-[#252d3d] ${!isWorkDay ? 'bg-[#0f1117]' : 'hover:bg-[#1e2637] transition-colors'}`}>
                    {dayConns.map((conn) => {
                      const st = STATUS_MAP[conn.status];
                      return (
                        <div key={conn.id} onClick={() => openConnectionForm(dateStr, slot, conn)} className={`${st.bg} rounded p-1.5 mb-1 cursor-pointer hover:opacity-80 transition-opacity`}>
                          <div className={`text-xs font-medium ${st.color} truncate`}>{conn.subscriberName}</div>
                          <div className="text-xs text-[#4b5568] truncate">{conn.subscriberAddress}</div>
                        </div>
                      );
                    })}
                    {isWorkDay && (
                      <button onClick={() => openConnectionForm(dateStr, slot)} className="w-full h-8 rounded border border-dashed border-[#252d3d] hover:border-[#3b82f6] flex items-center justify-center text-[#4b5568] hover:text-[#3b82f6] transition-colors mt-0.5 opacity-0 hover:opacity-100 group-hover:opacity-100">
                        <Icon name="Plus" size={12} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#8892a4] mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const selectCls = "w-full bg-[#0f1117] border border-[#252d3d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3b82f6] transition-colors cursor-pointer";

function ConnectionForm({ form: initial, onChange, employees, subscribers, onSave, onCancel, date, slot }: {
  form: { subscriberName: string; subscriberAddress: string; subscriberPhone: string; technicianId: string; status: Connection['status']; notes: string; subscriberSearch: string };
  onChange: (f: typeof initial) => void;
  employees: ReturnType<typeof useCRMStore>['employees'];
  subscribers: ReturnType<typeof useCRMStore>['subscribers'];
  onSave: () => void; onCancel: () => void;
  date: string; slot: string;
}) {
  const [form, setForm] = useState(initial);
  const [subSearch, setSubSearch] = useState('');
  const update = (key: string, val: string) => { const next = { ...form, [key]: val }; setForm(next); onChange(next); };

  const filteredSubs = subSearch.length > 1 ? subscribers.filter((s) =>
    s.fullName.toLowerCase().includes(subSearch.toLowerCase()) ||
    s.contractNumber.toLowerCase().includes(subSearch.toLowerCase()) ||
    s.phone.includes(subSearch)
  ).slice(0, 5) : [];

  const selectSub = (sub: typeof subscribers[0]) => {
    const next = { ...form, subscriberName: sub.fullName, subscriberAddress: sub.address, subscriberPhone: sub.phone };
    setForm(next); onChange(next); setSubSearch('');
  };

  const techs = employees.filter((e) => e.status === 'active');

  return (
    <div className="space-y-4">
      <div className="flex gap-2 text-xs text-[#4b5568] bg-[#1e2637] rounded-lg px-3 py-2">
        <Icon name="CalendarDays" size={13} className="text-[#3b82f6]" />
        {new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })} • {slot}
      </div>

      {/* Subscriber search */}
      <div className="relative">
        <label className="block text-xs font-medium text-[#8892a4] mb-1.5">Поиск абонента (LightBilling)</label>
        <div className="relative">
          <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4b5568]" />
          <input value={subSearch} onChange={(e) => setSubSearch(e.target.value)} placeholder="ФИО, договор, телефон..." className="w-full bg-[#0f1117] border border-[#252d3d] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-[#4b5568] focus:outline-none focus:border-[#3b82f6]" />
        </div>
        {filteredSubs.length > 0 && (
          <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-[#1e2637] border border-[#252d3d] rounded-lg shadow-xl overflow-hidden">
            {filteredSubs.map((s) => (
              <button key={s.id} onClick={() => selectSub(s)} className="w-full px-3 py-2.5 text-left hover:bg-[#252d3d] transition-colors border-b border-[#252d3d] last:border-0">
                <div className="text-sm text-white">{s.fullName}</div>
                <div className="text-xs text-[#4b5568]">{s.contractNumber} • {s.phone}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <Field label="ФИО абонента"><input value={form.subscriberName} onChange={(e) => update('subscriberName', e.target.value)} className={inputCls} placeholder="Иванов Иван Иванович" /></Field>
      <Field label="Адрес"><input value={form.subscriberAddress} onChange={(e) => update('subscriberAddress', e.target.value)} className={inputCls} placeholder="ул. Пушкина, д. 1, кв. 5" /></Field>
      <Field label="Телефон"><input value={form.subscriberPhone} onChange={(e) => update('subscriberPhone', e.target.value)} className={inputCls} placeholder="+7 (999) 000-00-00" /></Field>
      <Field label="Техник">
        <select value={form.technicianId} onChange={(e) => update('technicianId', e.target.value)} className={selectCls}>
          <option value="">Выбрать техника</option>
          {techs.map((e) => <option key={e.id} value={e.id}>{e.lastName} {e.firstName}</option>)}
        </select>
      </Field>
      <Field label="Статус">
        <select value={form.status} onChange={(e) => update('status', e.target.value)} className={selectCls}>
          <option value="scheduled">Запланировано</option>
          <option value="in_progress">В работе</option>
          <option value="done">Выполнено</option>
          <option value="cancelled">Отменено</option>
        </select>
      </Field>
      <Field label="Примечания"><textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} className={`${inputCls} resize-none`} rows={3} placeholder="Дополнительная информация..." /></Field>
      <div className="flex gap-3 pt-4 border-t border-[#252d3d] mt-6">
        <button onClick={onSave} className="flex-1 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-sm font-medium transition-colors">Сохранить</button>
        <button onClick={onCancel} className="px-4 py-2 bg-[#1e2637] hover:bg-[#252d3d] text-[#8892a4] hover:text-white rounded-lg text-sm transition-colors">Отмена</button>
      </div>
    </div>
  );
}
