import { useState } from 'react';
import { useCRMStore } from '@/store/crmStore';
import { CRMEvent, EventType } from '@/types/crm';
import Icon from '@/components/ui/icon';
import { useLightBilling, LBTariff } from '@/hooks/useLightBilling';

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

function genTicketNum(events: CRMEvent[]): string {
  const tickets = events.filter(e => e.ticketNumber);
  const nums = tickets
    .map(e => {
      const m = e.ticketNumber?.match(/^А-(\d+)$/);
      return m ? parseInt(m[1], 10) : 0;
    })
    .filter(n => n > 0);
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `А-${String(next).padStart(3, '0')}`;
}

const inputCls = 'w-full bg-[#0f1117] border border-[#252d3d] rounded-lg px-3 py-2 text-sm text-white placeholder-[#4b5568] focus:outline-none focus:border-[#3b82f6] transition-colors';
const labelCls = 'block text-xs font-medium text-[#4b5568] mb-1 uppercase tracking-wide';

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  new:         { label: 'Новая',    color: 'text-[#f59e0b]',  bg: 'bg-[#f59e0b]/10 border-[#f59e0b]/30' },
  in_progress: { label: 'В работе', color: 'text-[#3b82f6]',  bg: 'bg-[#3b82f6]/10 border-[#3b82f6]/30' },
  done:        { label: 'Выполнена',color: 'text-[#10b981]',  bg: 'bg-[#10b981]/10 border-[#10b981]/30' },
  cancelled:   { label: 'Отменена', color: 'text-[#6b7280]',  bg: 'bg-[#252d3d] border-[#252d3d]' },
};

const TYPE_MAP: Record<EventType, { label: string; icon: string; color: string }> = {
  breakdown:  { label: 'Поломка',          icon: 'AlertTriangle', color: 'text-[#ef4444]' },
  connection: { label: 'Подключение',      icon: 'Wifi',          color: 'text-[#10b981]' },
  paid_call:  { label: 'Платный выезд',    icon: 'DollarSign',    color: 'text-[#f59e0b]' },
};

interface Props {
  onOpenPanel: (title: string, content: React.ReactNode) => void;
  onClosePanel: () => void;
}

export default function ServiceTickets({ onOpenPanel, onClosePanel }: Props) {
  const {
    currentOfficeId, events, employees, users,
    addEvent, updateEvent, deleteEvent,
  } = useCRMStore();
  const [filter, setFilter] = useState<'all' | CRMEvent['status']>('all');
  const [search, setSearch] = useState('');

  const offTickets = events.filter(e =>
    e.officeId === currentOfficeId &&
    (e.type === 'breakdown' || e.type === 'paid_call')
  );

  const filtered = offTickets.filter(t => {
    if (filter !== 'all' && t.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!`${t.subscriberName} ${t.problem} ${t.ticketNumber} ${t.subscriberAddress}`.toLowerCase().includes(q)) return false;
    }
    return true;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const counts = {
    all: offTickets.length,
    new: offTickets.filter(t => t.status === 'new').length,
    in_progress: offTickets.filter(t => t.status === 'in_progress').length,
    done: offTickets.filter(t => t.status === 'done').length,
    cancelled: offTickets.filter(t => t.status === 'cancelled').length,
  };

  const openTicketForm = (ticket?: CRMEvent) => {
    const isNew = !ticket;
    onOpenPanel(
      isNew ? 'Новая заявка' : `Заявка ${ticket?.ticketNumber || ''}`,
      <TicketForm
        ticket={ticket}
        employees={employees.filter(e => e.status === 'active')}
        users={users}
        allEvents={events}
        isNew={isNew}
        currentOfficeId={currentOfficeId}
        onSave={(data) => {
          if (isNew) addEvent(data);
          else updateEvent(ticket!.id, data);
          onClosePanel();
        }}
        onDelete={ticket ? () => { deleteEvent(ticket.id); onClosePanel(); } : undefined}
        onCancel={onClosePanel}
      />
    );
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4b5568]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по заявкам..."
            className="w-full bg-[#1e2637] border border-[#252d3d] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-[#4b5568] focus:outline-none focus:border-[#3b82f6]"
          />
        </div>
        <button
          onClick={() => openTicketForm()}
          className="flex items-center gap-2 px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
        >
          <Icon name="Plus" size={14} />Новая заявка
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'new', 'in_progress', 'done', 'cancelled'] as const).map(f => {
          const labels: Record<string, string> = { all: 'Все', new: 'Новые', in_progress: 'В работе', done: 'Выполнены', cancelled: 'Отменены' };
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${filter === f ? 'bg-[#3b82f6] text-white' : 'bg-[#1e2637] text-[#8892a4] hover:text-white'}`}
            >
              {labels[f]}
              <span className={`px-1.5 py-0.5 rounded-full text-xs ${filter === f ? 'bg-white/20' : 'bg-[#252d3d]'}`}>
                {counts[f as keyof typeof counts]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-[#252d3d]">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="bg-[#0f1117] border-b border-[#252d3d]">
              <th className="text-left px-4 py-3 text-xs font-medium text-[#4b5568] uppercase tracking-wide w-24">Номер</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#4b5568] uppercase tracking-wide w-32">Статус</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#4b5568] uppercase tracking-wide">Менеджер</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#4b5568] uppercase tracking-wide">Абонент</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#4b5568] uppercase tracking-wide">Адрес</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#4b5568] uppercase tracking-wide">Описание</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#4b5568] uppercase tracking-wide w-32">Исполнитель</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#4b5568] uppercase tracking-wide w-28">Дата</th>
              <th className="px-4 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(ticket => {
              const st = STATUS_MAP[ticket.status];
              const tech = employees.find(e => e.id === ticket.technicianId);
              const manager = employees.find(e => e.id === ticket.managerId);
              const typeInfo = TYPE_MAP[ticket.type];
              return (
                <tr
                  key={ticket.id}
                  onClick={() => openTicketForm(ticket)}
                  className="border-b border-[#252d3d] last:border-0 hover:bg-[#1e2637]/60 cursor-pointer transition-colors"
                >
                  {/* Номер */}
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-mono font-semibold text-white">{ticket.ticketNumber || '—'}</span>
                      <span className={`text-[10px] flex items-center gap-0.5 ${typeInfo.color}`}>
                        <Icon name={typeInfo.icon as 'AlertTriangle'} size={9} />
                        {typeInfo.label}
                      </span>
                    </div>
                  </td>
                  {/* Статус */}
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <select
                      value={ticket.status}
                      onChange={e => updateEvent(ticket.id, { status: e.target.value as CRMEvent['status'] })}
                      className={`text-xs px-2 py-1 rounded-md border font-medium cursor-pointer bg-transparent focus:outline-none ${st.color} ${st.bg}`}
                    >
                      <option value="new">Новая</option>
                      <option value="in_progress">В работе</option>
                      <option value="done">Выполнена</option>
                      <option value="cancelled">Отменена</option>
                    </select>
                  </td>
                  {/* Менеджер */}
                  <td className="px-4 py-3">
                    {manager ? (
                      <div>
                        <div className="text-sm text-white">{manager.lastName} {manager.firstName}</div>
                        <div className="text-[10px] text-[#4b5568]">{new Date(ticket.createdAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    ) : (
                      <div className="text-[10px] text-[#4b5568]">{new Date(ticket.createdAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>
                    )}
                  </td>
                  {/* Абонент */}
                  <td className="px-4 py-3">
                    <span className="text-sm text-white">{ticket.subscriberName || '—'}</span>
                  </td>
                  {/* Адрес */}
                  <td className="px-4 py-3 max-w-[180px]">
                    <span className="text-xs text-[#8892a4] line-clamp-2">{ticket.subscriberAddress || '—'}</span>
                  </td>
                  {/* Описание */}
                  <td className="px-4 py-3 max-w-[200px]">
                    <span className="text-xs text-[#8892a4] line-clamp-2">{ticket.problem || '—'}</span>
                  </td>
                  {/* Исполнитель */}
                  <td className="px-4 py-3">
                    {tech ? (
                      <span className="text-xs text-[#8892a4]">{tech.lastName} {tech.firstName[0]}.</span>
                    ) : <span className="text-xs text-[#4b5568]">—</span>}
                  </td>
                  {/* Желаемая дата */}
                  <td className="px-4 py-3">
                    <span className="text-xs text-[#8892a4]">
                      {ticket.date ? new Date(ticket.date).toLocaleDateString('ru-RU') : '—'}
                    </span>
                  </td>
                  {/* Удалить */}
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => deleteEvent(ticket.id)}
                      className="p-1.5 hover:bg-[#ef4444]/20 rounded text-[#4b5568] hover:text-[#ef4444] transition-colors"
                    >
                      <Icon name="Trash2" size={13} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center text-[#4b5568] text-sm py-16 bg-[#161b27]">
                  Нет заявок
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─────────────── Ticket Form ─────────────── */

interface TicketFormProps {
  ticket?: CRMEvent;
  employees: ReturnType<typeof useCRMStore>['employees'];
  users: ReturnType<typeof useCRMStore>['users'];
  allEvents: CRMEvent[];
  isNew: boolean;
  currentOfficeId: string;
  onSave: (data: CRMEvent) => void;
  onDelete?: () => void;
  onCancel: () => void;
}

function TicketForm({ ticket, employees, users, allEvents, isNew, currentOfficeId, onSave, onDelete, onCancel }: TicketFormProps) {
  const lb = useLightBilling();
  const [type, setType] = useState<EventType>(ticket?.type || 'breakdown');
  const [name, setName] = useState(ticket?.subscriberName || '');
  const [address, setAddress] = useState(ticket?.subscriberAddress || '');
  const [phone, setPhone] = useState(ticket?.subscriberPhone || '');
  const [technicianId, setTechnicianId] = useState(ticket?.technicianId || '');
  const [managerId, setManagerId] = useState(ticket?.managerId || '');
  const [status, setStatus] = useState<CRMEvent['status']>(ticket?.status || 'new');
  const [priority, setPriority] = useState<CRMEvent['priority']>(ticket?.priority || 'medium');
  const [problem, setProblem] = useState(ticket?.problem || '');
  const [notes, setNotes] = useState(ticket?.notes || '');
  const [date, setDate] = useState(ticket?.date || new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState(String(ticket?.amount || ''));

  const [newSubGroup, setNewSubGroup] = useState('Физические лица');
  const [newSubContract, setNewSubContract] = useState('');
  const [newSubLogin, setNewSubLogin] = useState('');
  const [newSubPassword, setNewSubPassword] = useState('');
  const [tariffId, setTariffId] = useState(ticket?.tariffId || '');
  const [tariffName, setTariffName] = useState(ticket?.tariffName || '');
  const [tariffs, setTariffs] = useState<LBTariff[]>([]);
  const [tariffsLoaded, setTariffsLoaded] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createResult, setCreateResult] = useState('');
  const [subLbId, setSubLbId] = useState(ticket?.subscriberLbId || '');

  useState(() => {
    lb.loadTariffs().then(list => { setTariffs(list); setTariffsLoaded(true); });
  });

  const handleTariffChange = (id: string) => {
    setTariffId(id);
    setTariffName(tariffs.find(t => t.id === id)?.name || '');
  };

  const handleCreateSubscriber = async () => {
    if (!name || !address) {
      setCreateResult('Заполните ФИО и адрес');
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
    const ticketNumber = isNew ? genTicketNum(allEvents) : (ticket?.ticketNumber || genTicketNum(allEvents));
    const data: CRMEvent = {
      id: ticket?.id || uid(),
      officeId: currentOfficeId,
      createdAt: ticket?.createdAt || new Date().toISOString(),
      type,
      status,
      priority,
      ticketNumber,
      managerId,
      subscriberName: name,
      subscriberAddress: address,
      subscriberPhone: phone,
      subscriberLbId: subLbId,
      technicianId,
      date,
      problem,
      notes,
      tariffId,
      tariffName,
      amount: amount ? parseFloat(amount) : undefined,
    };
    onSave(data);
  };

  return (
    <div className="space-y-4">
      {/* Тип заявки */}
      <div>
        <label className={labelCls}>Тип заявки *</label>
        <div className="grid grid-cols-3 gap-2">
          {(Object.entries(TYPE_MAP) as [EventType, typeof TYPE_MAP[EventType]][]).map(([k, v]) => (
            <button
              key={k}
              onClick={() => setType(k)}
              className={`flex flex-col items-center gap-1 py-2.5 rounded-lg border text-xs font-medium transition-colors ${type === k ? 'bg-[#3b82f6]/20 border-[#3b82f6] text-white' : 'bg-[#0f1117] border-[#252d3d] text-[#4b5568] hover:text-white hover:border-[#3b82f6]/40'}`}
            >
              <Icon name={v.icon as 'AlertTriangle'} size={14} className={type === k ? v.color : ''} />
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Группа (для подключения показываем) */}
      {type === 'connection' && (
        <div>
          <label className={labelCls}>Группа</label>
          <select value={newSubGroup} onChange={e => setNewSubGroup(e.target.value)} className={inputCls + ' cursor-pointer'}>
            <option value="Физические лица">Физические лица</option>
            <option value="Юридические лица">Юридические лица</option>
          </select>
        </div>
      )}

      {/* ФИО + Адрес */}
      <div>
        <label className={labelCls}>ФИО абонента *</label>
        <input value={name} onChange={e => setName(e.target.value)} className={inputCls} placeholder="Фамилия Имя Отчество" />
      </div>
      <div>
        <label className={labelCls}>Адрес</label>
        <input value={address} onChange={e => setAddress(e.target.value)} className={inputCls} placeholder="Улица, дом, кв." />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Телефон</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} className={inputCls} placeholder="+7..." />
        </div>
        <div>
          <label className={labelCls}>Желаемая дата</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
        </div>
      </div>

      {/* Дополнительные поля для подключения */}
      {type === 'connection' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Договор</label>
              <input value={newSubContract} onChange={e => setNewSubContract(e.target.value)} className={inputCls} placeholder="Номер" />
            </div>
            <div>
              <label className={labelCls}>Логин</label>
              <input value={newSubLogin} onChange={e => setNewSubLogin(e.target.value)} className={inputCls} placeholder="Авто" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Пароль</label>
              <input value={newSubPassword} onChange={e => setNewSubPassword(e.target.value)} className={inputCls} placeholder="Авто" />
            </div>
            <div>
              <label className={labelCls}>Тариф</label>
              {!tariffsLoaded ? (
                <div className="flex items-center gap-2 text-xs text-[#4b5568] py-2">
                  <Icon name="Loader" size={12} className="animate-spin" />Загрузка...
                </div>
              ) : (
                <select value={tariffId} onChange={e => handleTariffChange(e.target.value)} className={inputCls + ' cursor-pointer'}>
                  <option value="">— Выберите —</option>
                  {tariffs.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              )}
            </div>
          </div>
        </>
      )}

      {/* Создать в LB — только для подключения и только новая заявка */}
      {type === 'connection' && isNew && (
        <>
          <button
            onClick={handleCreateSubscriber}
            disabled={createLoading || !name || !address}
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

      {/* Описание */}
      <div>
        <label className={labelCls}>Описание</label>
        <textarea value={problem} onChange={e => setProblem(e.target.value)} rows={3} className={inputCls + ' resize-none'} placeholder="Опишите суть заявки..." />
      </div>

      {/* Платный выезд — сумма */}
      {type === 'paid_call' && (
        <div>
          <label className={labelCls}>Сумма (₽)</label>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className={inputCls} placeholder="0" />
        </div>
      )}

      {/* Менеджер / Исполнитель / Приоритет / Статус */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Менеджер</label>
          <select value={managerId} onChange={e => setManagerId(e.target.value)} className={inputCls + ' cursor-pointer'}>
            <option value="">— Выберите —</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.lastName} {e.firstName}</option>)}
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

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Приоритет</label>
          <select value={priority} onChange={e => setPriority(e.target.value as CRMEvent['priority'])} className={inputCls + ' cursor-pointer'}>
            <option value="low">Низкий</option>
            <option value="medium">Средний</option>
            <option value="high">Высокий</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Статус</label>
          <select value={status} onChange={e => setStatus(e.target.value as CRMEvent['status'])} className={inputCls + ' cursor-pointer'}>
            <option value="new">Новая</option>
            <option value="in_progress">В работе</option>
            <option value="done">Выполнена</option>
            <option value="cancelled">Отменена</option>
          </select>
        </div>
      </div>

      <div>
        <label className={labelCls}>Заметки</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={inputCls + ' resize-none'} />
      </div>

      {/* Buttons */}
      <div className="flex gap-2 pt-2 border-t border-[#252d3d]">
        <button
          onClick={handleSave}
          disabled={!name}
          className="flex-1 py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {isNew ? 'Создать заявку' : 'Сохранить'}
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
