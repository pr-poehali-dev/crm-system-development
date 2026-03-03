import { useState } from 'react';
import { CalendarSlotSettings as CalendarSlotSettingsType, TimeSlot, SpecialDate } from '@/types/crm';
import Icon from '@/components/ui/icon';
import { uid, inputCls, labelCls } from './CalendarConstants';

interface SlotSettingsProps {
  settings: CalendarSlotSettingsType;
  tab: 'weekday' | 'weekend' | 'special';
  onTabChange: (t: 'weekday' | 'weekend' | 'special') => void;
  onSave: (s: CalendarSlotSettingsType) => void;
}

export default function SlotSettings({ settings, tab, onTabChange, onSave }: SlotSettingsProps) {
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
