import { useState, useEffect, useRef, useCallback } from 'react';
import { useCRMStore } from '@/store/crmStore';
import { CRMEvent, EventType, EventStatus } from '@/types/crm';
import Icon from '@/components/ui/icon';
import { useLightBilling, LBSubscriber, LBTariff } from '@/hooks/useLightBilling';

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

const TYPE_CONFIG: Record<EventType, { label: string; icon: string; color: string; bg: string }> = {
  breakdown: { label: 'Поломка', icon: 'Wrench', color: 'text-[#ef4444]', bg: 'bg-[#ef4444]/20' },
  connection: { label: 'Подключение', icon: 'Wifi', color: 'text-[#10b981]', bg: 'bg-[#10b981]/20' },
  paid_call: { label: 'Платный вызов', icon: 'DollarSign', color: 'text-[#f59e0b]', bg: 'bg-[#f59e0b]/20' },
};

const STATUS_CONFIG: Record<EventStatus, { label: string; color: string }> = {
  new: { label: 'Новая', color: 'bg-[#3b82f6]/20 text-[#3b82f6]' },
  in_progress: { label: 'В работе', color: 'bg-[#f59e0b]/20 text-[#f59e0b]' },
  done: { label: 'Выполнена', color: 'bg-[#10b981]/20 text-[#10b981]' },
  cancelled: { label: 'Отменена', color: 'bg-[#4b5568]/20 text-[#4b5568]' },
};

const PRIORITY_CONFIG = {
  low: { label: 'Низкий', color: 'text-[#4b5568]' },
  medium: { label: 'Средний', color: 'text-[#f59e0b]' },
  high: { label: 'Высокий', color: 'text-[#ef4444]' },
};

const inputCls = 'w-full bg-[#0f1117] border border-[#252d3d] rounded-lg px-3 py-2 text-sm text-white placeholder-[#4b5568] focus:outline-none focus:border-[#3b82f6] transition-colors';
const selectCls = `${inputCls} cursor-pointer`;
const labelCls = 'block text-xs font-medium text-[#4b5568] mb-1.5 uppercase tracking-wide';

interface Props {
  onOpenPanel: (title: string, content: React.ReactNode) => void;
  onClosePanel: () => void;
  prefilledSubscriber?: { name: string; address: string; phone: string; lbId?: string; contract?: string };
}

export default function Events({ onOpenPanel, onClosePanel, prefilledSubscriber }: Props) {
  const { currentOfficeId, events, employees, addEvent, updateEvent, deleteEvent } = useCRMStore();
  const [typeFilter, setTypeFilter] = useState<'all' | EventType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | EventStatus>('all');
  const [search, setSearch] = useState('');

  const offEvents = events.filter((e) => e.officeId === currentOfficeId);

  const filtered = offEvents.filter((e) => {
    if (typeFilter !== 'all' && e.type !== typeFilter) return false;
    if (statusFilter !== 'all' && e.status !== statusFilter) return false;
    if (search && !`${e.subscriberName} ${e.problem || ''} ${e.subscriberAddress}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openEventForm = useCallback((event?: CRMEvent, prefill?: Props['prefilledSubscriber']) => {
    onOpenPanel(
      event ? 'Редактировать заявку' : 'Новая заявка',
      <EventForm
        event={event}
        prefill={prefill}
        employees={employees.filter((e) => e.status === 'active')}
        onSave={(data) => {
          if (event) updateEvent(event.id, data);
          else addEvent({ id: uid(), officeId: currentOfficeId, ...data, createdAt: new Date().toISOString() } as CRMEvent);
          onClosePanel();
        }}
        onCancel={onClosePanel}
        onDelete={event ? () => { deleteEvent(event.id); onClosePanel(); } : undefined}
      />
    );
  }, [employees, currentOfficeId, onOpenPanel, onClosePanel, addEvent, updateEvent, deleteEvent]);

  useEffect(() => {
    if (prefilledSubscriber) {
      openEventForm(undefined, prefilledSubscriber);
    }
  }, []);

  const counts = {
    all: offEvents.length,
    breakdown: offEvents.filter((e) => e.type === 'breakdown').length,
    connection: offEvents.filter((e) => e.type === 'connection').length,
    paid_call: offEvents.filter((e) => e.type === 'paid_call').length,
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4b5568]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по заявкам..." className="w-full bg-[#1e2637] border border-[#252d3d] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-[#4b5568] focus:outline-none focus:border-[#3b82f6]" />
        </div>
        <button onClick={() => openEventForm()} className="flex items-center gap-2 px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-sm font-medium transition-colors">
          <Icon name="Plus" size={14} />Новая заявка
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {(['all', 'breakdown', 'connection', 'paid_call'] as const).map((t) => {
          const cfg = t === 'all' ? null : TYPE_CONFIG[t];
          return (
            <button key={t} onClick={() => setTypeFilter(t)} className={`bg-[#161b27] border rounded-xl p-3 text-left transition-colors ${typeFilter === t ? 'border-[#3b82f6]/50' : 'border-[#252d3d] hover:border-[#252d3d]'}`}>
              <div className="flex items-center gap-2 mb-1">
                {cfg && <Icon name={cfg.icon} size={14} className={cfg.color} />}
                <span className={`text-xl font-bold ${cfg ? cfg.color : 'text-white'}`}>{counts[t]}</span>
              </div>
              <div className="text-xs text-[#4b5568]">{t === 'all' ? 'Всего заявок' : cfg!.label}</div>
            </button>
          );
        })}
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'new', 'in_progress', 'done', 'cancelled'] as const).map((s) => {
          const cnt = s === 'all' ? offEvents.length : offEvents.filter((e) => e.status === s).length;
          const cfg = s === 'all' ? null : STATUS_CONFIG[s];
          return (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${statusFilter === s ? 'bg-[#3b82f6] text-white' : 'bg-[#1e2637] text-[#8892a4] hover:text-white'}`}>
              {s === 'all' ? 'Все' : cfg!.label}
              <span className={`px-1.5 py-0.5 rounded-full text-xs ${statusFilter === s ? 'bg-white/20' : 'bg-[#252d3d]'}`}>{cnt}</span>
            </button>
          );
        })}
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <Icon name="ClipboardList" size={32} className="text-[#252d3d] mx-auto mb-3" />
            <div className="text-sm text-[#4b5568]">Заявок нет</div>
          </div>
        )}
        {filtered.map((event) => {
          const tech = employees.find((e) => e.id === event.technicianId);
          const cfg = TYPE_CONFIG[event.type];
          const sCfg = STATUS_CONFIG[event.status];
          return (
            <div
              key={event.id}
              className="bg-[#161b27] border border-[#252d3d] rounded-xl p-4 hover:border-[#3b82f6]/30 transition-colors cursor-pointer"
              onClick={() => openEventForm(event)}
            >
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon name={cfg.icon} size={16} className={cfg.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-semibold text-white truncate">{event.subscriberName}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${sCfg.color}`}>{sCfg.label}</span>
                    <span className={`text-xs font-medium ${PRIORITY_CONFIG[event.priority].color}`}>● {PRIORITY_CONFIG[event.priority].label}</span>
                  </div>
                  <div className="text-xs text-[#4b5568] mb-1">{event.subscriberAddress}</div>
                  {event.problem && <div className="text-xs text-[#8892a4]">{event.problem}</div>}
                  {event.type === 'connection' && event.tariffName && (
                    <div className="text-xs text-[#10b981]">Тариф: {event.tariffName}</div>
                  )}
                  {event.type === 'paid_call' && event.amount && (
                    <div className="text-xs text-[#f59e0b]">{event.amount.toLocaleString('ru-RU')} ₽</div>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs text-[#4b5568]">{event.date}</div>
                  {event.timeSlot && <div className="text-xs text-[#8892a4]">{event.timeSlot}</div>}
                  {tech && <div className="text-xs text-[#4b5568] mt-1">{tech.lastName} {tech.firstName[0]}.</div>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface EventFormProps {
  event?: CRMEvent;
  prefill?: Props['prefilledSubscriber'];
  employees: ReturnType<typeof useCRMStore>['employees'];
  onSave: (data: Omit<CRMEvent, 'id' | 'officeId' | 'createdAt'>) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

function EventForm({ event, prefill, employees, onSave, onCancel, onDelete }: EventFormProps) {
  const lb = useLightBilling();
  const [type, setType] = useState<EventType>(event?.type || 'breakdown');
  const [status, setStatus] = useState<EventStatus>(event?.status || 'new');
  const [priority, setPriority] = useState<CRMEvent['priority']>(event?.priority || 'medium');
  const [technicianId, setTechnicianId] = useState(event?.technicianId || '');
  const [date, setDate] = useState(event?.date || new Date().toISOString().split('T')[0]);
  const [timeSlot, setTimeSlot] = useState(event?.timeSlot || '');
  const [problem, setProblem] = useState(event?.problem || '');
  const [amount, setAmount] = useState(String(event?.amount || ''));
  const [notes, setNotes] = useState(event?.notes || '');
  const [tariffId, setTariffId] = useState(event?.tariffId || '');
  const [tariffName, setTariffName] = useState(event?.tariffName || '');

  // Абонент
  const [subSearch, setSubSearch] = useState(event?.subscriberName || prefill?.name || '');
  const [subName, setSubName] = useState(event?.subscriberName || prefill?.name || '');
  const [subAddress, setSubAddress] = useState(event?.subscriberAddress || prefill?.address || '');
  const [subPhone, setSubPhone] = useState(event?.subscriberPhone || prefill?.phone || '');
  const [subLbId, setSubLbId] = useState(event?.subscriberLbId || prefill?.lbId || '');
  const [subContract, setSubContract] = useState(event?.subscriberContract || prefill?.contract || '');
  const [subResults, setSubResults] = useState<LBSubscriber[]>([]);
  const [subLoading, setSubLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  // Тарифы (для подключения)
  const [tariffs, setTariffs] = useState<LBTariff[]>([]);
  const [tariffsLoaded, setTariffsLoaded] = useState(false);

  // Новый абонент (подключение)
  const [newSubName, setNewSubName] = useState('');
  const [newSubAddress, setNewSubAddress] = useState('');
  const [newSubPhone, setNewSubPhone] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createResult, setCreateResult] = useState<string>('');

  useEffect(() => {
    if (type === 'connection' && !tariffsLoaded) {
      lb.loadTariffs().then((list) => {
        setTariffs(list);
        setTariffsLoaded(true);
      });
    }
  }, [type]);

  const handleSubSearch = (q: string) => {
    setSubSearch(q);
    setSubName(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!q.trim() || type === 'connection') return;
    setSubLoading(true);
    searchTimer.current = setTimeout(async () => {
      const params = new URLSearchParams({ action: 'subscribers', search: q, limit: '10' });
      try {
        const res = await fetch(`https://functions.poehali.dev/4e05c064-e352-437c-b112-35fb77291a1a?${params}`);
        const data = await res.json();
        setSubResults(data.subscribers || []);
        setShowSuggestions(true);
      } catch (e) {
        console.error(e);
      }
      setSubLoading(false);
    }, 350);
  };

  const selectSub = (sub: LBSubscriber) => {
    setSubName(sub.fullName);
    setSubSearch(sub.fullName);
    setSubAddress(sub.address);
    setSubPhone(sub.phone);
    setSubLbId(sub.lb_id);
    setSubContract(sub.contractNumber);
    setSubResults([]);
    setShowSuggestions(false);
  };

  const handleTariffChange = (id: string) => {
    setTariffId(id);
    const t = tariffs.find((t) => t.id === id);
    setTariffName(t?.name || '');
  };

  const handleCreateSubscriber = async () => {
    if (!newSubName || !newSubAddress || !tariffId) {
      setCreateResult('Заполните ФИО, адрес и тариф');
      return;
    }
    setCreateLoading(true);
    setCreateResult('');
    const result = await lb.createSubscriber({
      fullName: newSubName,
      address: newSubAddress,
      phone: newSubPhone,
      tariffId,
    });
    setCreateLoading(false);
    if (result.success) {
      setSubName(newSubName);
      setSubSearch(newSubName);
      setSubAddress(newSubAddress);
      setSubPhone(newSubPhone);
      setSubLbId(result.lb_id);
      setCreateResult(`✓ Абонент создан в LightBilling${result.lb_id ? ` (ID: ${result.lb_id})` : ''}`);
    } else {
      setCreateResult(`Ошибка: ${result.message}`);
    }
  };

  const handleSave = () => {
    const name = type === 'connection' ? newSubName || subName : subName;
    if (!name) return;
    onSave({
      type, status, priority, technicianId, date, timeSlot,
      subscriberName: name,
      subscriberAddress: type === 'connection' ? newSubAddress || subAddress : subAddress,
      subscriberPhone: type === 'connection' ? newSubPhone || subPhone : subPhone,
      subscriberLbId: subLbId,
      subscriberContract: subContract,
      problem: type !== 'connection' ? problem : undefined,
      amount: type === 'paid_call' ? Number(amount) : undefined,
      tariffId: type === 'connection' ? tariffId : undefined,
      tariffName: type === 'connection' ? tariffName : undefined,
      notes,
    });
  };

  return (
    <div className="space-y-5">
      {/* Тип заявки */}
      <div>
        <label className={labelCls}>Тип заявки</label>
        <div className="grid grid-cols-3 gap-2">
          {(Object.entries(TYPE_CONFIG) as [EventType, typeof TYPE_CONFIG[EventType]][]).map(([t, cfg]) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all ${type === t ? `border-[#3b82f6] ${cfg.bg}` : 'border-[#252d3d] bg-[#0f1117] hover:border-[#3b82f6]/30'}`}
            >
              <Icon name={cfg.icon} size={18} className={type === t ? cfg.color : 'text-[#4b5568]'} />
              <span className={`text-xs font-medium ${type === t ? cfg.color : 'text-[#4b5568]'}`}>{cfg.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Абонент — поломка / платный вызов: поиск в LB */}
      {type !== 'connection' && (
        <div>
          <label className={labelCls}>Абонент (поиск в LightBilling)</label>
          <div className="relative">
            <div className="relative">
              <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4b5568]" />
              <input
                value={subSearch}
                onChange={(e) => handleSubSearch(e.target.value)}
                onFocus={() => subResults.length > 0 && setShowSuggestions(true)}
                placeholder="ФИО, договор, адрес..."
                className={`${inputCls} pl-9`}
              />
              {subLoading && <Icon name="Loader" size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4b5568] animate-spin" />}
            </div>
            {showSuggestions && subResults.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-[#1e2637] border border-[#252d3d] rounded-xl overflow-hidden shadow-xl">
                {subResults.map((sub) => (
                  <button
                    key={sub.lb_id}
                    onClick={() => selectSub(sub)}
                    className="w-full px-4 py-2.5 text-left hover:bg-[#252d3d] transition-colors border-b border-[#252d3d] last:border-0"
                  >
                    <div className="text-sm font-medium text-white">{sub.fullName}</div>
                    <div className="text-xs text-[#4b5568]">{sub.contractNumber} · {sub.address}</div>
                    <div className={`text-xs ${sub.balance >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                      Баланс: {sub.balance >= 0 ? '+' : ''}{sub.balance.toFixed(2)} ₽
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          {subLbId && (
            <div className="mt-2 flex items-center gap-2 text-xs text-[#10b981]">
              <Icon name="CheckCircle" size={12} />
              Абонент из LightBilling · {subContract && `Договор: ${subContract}`}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className={labelCls}>Адрес</label>
              <input value={subAddress} onChange={(e) => setSubAddress(e.target.value)} className={inputCls} placeholder="Адрес" />
            </div>
            <div>
              <label className={labelCls}>Телефон</label>
              <input value={subPhone} onChange={(e) => setSubPhone(e.target.value)} className={inputCls} placeholder="Телефон" />
            </div>
          </div>
        </div>
      )}

      {/* Подключение — новый абонент */}
      {type === 'connection' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#10b981] uppercase tracking-wide">
            <Icon name="UserPlus" size={14} />
            Новый абонент — будет создан в LightBilling
          </div>
          <div>
            <label className={labelCls}>ФИО</label>
            <input value={newSubName} onChange={(e) => setNewSubName(e.target.value)} className={inputCls} placeholder="Фамилия Имя Отчество" />
          </div>
          <div>
            <label className={labelCls}>Адрес подключения</label>
            <input value={newSubAddress} onChange={(e) => setNewSubAddress(e.target.value)} className={inputCls} placeholder="Улица, дом, квартира" />
          </div>
          <div>
            <label className={labelCls}>Телефон</label>
            <input value={newSubPhone} onChange={(e) => setNewSubPhone(e.target.value)} className={inputCls} placeholder="+7..." />
          </div>
          <div>
            <label className={labelCls}>Тариф</label>
            {!tariffsLoaded ? (
              <div className="flex items-center gap-2 text-xs text-[#4b5568] py-2">
                <Icon name="Loader" size={12} className="animate-spin" />Загрузка тарифов...
              </div>
            ) : (
              <select value={tariffId} onChange={(e) => handleTariffChange(e.target.value)} className={selectCls}>
                <option value="">— Выберите тариф —</option>
                {tariffs.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            )}
          </div>
          <button
            onClick={handleCreateSubscriber}
            disabled={createLoading || !newSubName || !tariffId}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#10b981] hover:bg-[#059669] disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {createLoading
              ? <><Icon name="Loader" size={14} className="animate-spin" />Создание в LightBilling...</>
              : <><Icon name="UserPlus" size={14} />Создать абонента в LightBilling</>
            }
          </button>
          {createResult && (
            <div className={`text-xs px-3 py-2 rounded-lg ${createResult.startsWith('✓') ? 'bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20' : 'bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20'}`}>
              {createResult}
            </div>
          )}
        </div>
      )}

      {/* Поломка — описание */}
      {type === 'breakdown' && (
        <div>
          <label className={labelCls}>Описание проблемы</label>
          <textarea value={problem} onChange={(e) => setProblem(e.target.value)} rows={3} placeholder="Опишите проблему..." className={inputCls} />
        </div>
      )}

      {/* Платный вызов — сумма */}
      {type === 'paid_call' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Описание работ</label>
            <input value={problem} onChange={(e) => setProblem(e.target.value)} className={inputCls} placeholder="Что делали..." />
          </div>
          <div>
            <label className={labelCls}>Сумма (₽)</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} placeholder="0" />
          </div>
        </div>
      )}

      {/* Дата / время / техник */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Дата</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Время</label>
          <input type="time" value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)} className={inputCls} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Исполнитель</label>
          <select value={technicianId} onChange={(e) => setTechnicianId(e.target.value)} className={selectCls}>
            <option value="">— Выберите —</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.lastName} {e.firstName}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Приоритет</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value as CRMEvent['priority'])} className={selectCls}>
            {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className={labelCls}>Статус</label>
        <div className="grid grid-cols-4 gap-2">
          {(Object.entries(STATUS_CONFIG) as [EventStatus, typeof STATUS_CONFIG[EventStatus]][]).map(([s, cfg]) => (
            <button key={s} onClick={() => setStatus(s)} className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${status === s ? cfg.color : 'bg-[#0f1117] text-[#4b5568] hover:text-white border border-[#252d3d]'}`}>
              {cfg.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={labelCls}>Примечание</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Дополнительная информация..." className={inputCls} />
      </div>

      {/* Кнопки */}
      <div className="flex gap-3 pt-2">
        <button onClick={handleSave} className="flex-1 py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-sm font-medium transition-colors">
          {event ? 'Сохранить' : 'Создать заявку'}
        </button>
        <button onClick={onCancel} className="px-4 py-2.5 bg-[#1e2637] hover:bg-[#252d3d] text-[#8892a4] hover:text-white rounded-lg text-sm transition-colors">
          Отмена
        </button>
        {onDelete && (
          <button onClick={onDelete} className="px-4 py-2.5 bg-[#ef4444]/10 hover:bg-[#ef4444]/20 text-[#ef4444] rounded-lg text-sm transition-colors">
            <Icon name="Trash2" size={14} />
          </button>
        )}
      </div>
    </div>
  );
}