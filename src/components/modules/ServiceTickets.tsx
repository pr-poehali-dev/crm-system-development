import { useState } from 'react';
import { useCRMStore } from '@/store/crmStore';
import { ServiceTicket } from '@/types/crm';
import Icon from '@/components/ui/icon';

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

const inputCls = "w-full bg-[#0f1117] border border-[#252d3d] rounded-lg px-3 py-2 text-sm text-white placeholder-[#4b5568] focus:outline-none focus:border-[#3b82f6] transition-colors";
const selectCls = `${inputCls} cursor-pointer`;

const STATUS_LABELS: Record<string, string> = { new: 'Новая', in_progress: 'В работе', done: 'Выполнена', cancelled: 'Отменена' };
const PRIORITY_LABELS: Record<string, string> = { low: 'Низкий', medium: 'Средний', high: 'Высокий' };

interface Props {
  onOpenPanel: (title: string, content: React.ReactNode) => void;
  onClosePanel: () => void;
}

export default function ServiceTickets({ onOpenPanel, onClosePanel }: Props) {
  const { currentOfficeId, serviceTickets, employees, subscribers, addServiceTicket, updateServiceTicket, deleteServiceTicket } = useCRMStore();
  const [filter, setFilter] = useState<'all' | ServiceTicket['status']>('all');
  const [search, setSearch] = useState('');

  const offTickets = serviceTickets.filter((t) => t.officeId === currentOfficeId);
  const filtered = offTickets.filter((t) => {
    if (filter !== 'all' && t.status !== filter) return false;
    if (search && !`${t.subscriberName} ${t.problem}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openTicketForm = (ticket?: ServiceTicket) => {
    const isNew = !ticket;
    let form = {
      subscriberName: ticket?.subscriberName || '', subscriberAddress: ticket?.subscriberAddress || '',
      subscriberPhone: ticket?.subscriberPhone || '', technicianId: ticket?.technicianId || '',
      problem: ticket?.problem || '', status: ticket?.status || 'new' as ServiceTicket['status'],
      priority: ticket?.priority || 'medium' as ServiceTicket['priority'], notes: ticket?.notes || '',
    };
    const save = () => {
      if (isNew) addServiceTicket({ id: uid(), officeId: currentOfficeId, ...form, createdAt: new Date().toISOString(), subscriberId: undefined });
      else updateServiceTicket(ticket!.id, form);
      onClosePanel();
    };
    onOpenPanel(isNew ? 'Новая заявка' : 'Редактировать заявку', <TicketForm form={form} onChange={(f) => { form = f; }} employees={employees.filter((e) => e.status === 'active')} subscribers={subscribers} onSave={save} onCancel={onClosePanel} />);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4b5568]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по заявкам..." className="w-full bg-[#1e2637] border border-[#252d3d] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-[#4b5568] focus:outline-none focus:border-[#3b82f6]" />
        </div>
        <button onClick={() => openTicketForm()} className="flex items-center gap-2 px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-sm font-medium transition-colors">
          <Icon name="Plus" size={14} />Новая заявка
        </button>
      </div>

      <div className="flex gap-2">
        {(['all', 'new', 'in_progress', 'done', 'cancelled'] as const).map((f) => {
          const counts: Record<string, number> = {
            all: offTickets.length,
            new: offTickets.filter((t) => t.status === 'new').length,
            in_progress: offTickets.filter((t) => t.status === 'in_progress').length,
            done: offTickets.filter((t) => t.status === 'done').length,
            cancelled: offTickets.filter((t) => t.status === 'cancelled').length,
          };
          const labels: Record<string, string> = { all: 'Все', ...STATUS_LABELS };
          return (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${filter === f ? 'bg-[#3b82f6] text-white' : 'bg-[#1e2637] text-[#8892a4] hover:text-white'}`}>
              {labels[f]} <span className={`px-1.5 py-0.5 rounded-full text-xs ${filter === f ? 'bg-white/20' : 'bg-[#252d3d]'}`}>{counts[f]}</span>
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        {filtered.map((ticket) => {
          const tech = employees.find((e) => e.id === ticket.technicianId);
          return (
            <div key={ticket.id} className="bg-[#161b27] border border-[#252d3d] rounded-xl p-4 hover:border-[#3b82f6]/30 transition-colors cursor-pointer" onClick={() => openTicketForm(ticket)}>
              <div className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${ticket.priority === 'high' ? 'bg-[#ef4444]' : ticket.priority === 'medium' ? 'bg-[#f59e0b]' : 'bg-[#10b981]'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-white">{ticket.subscriberName}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      ticket.status === 'new' ? 'bg-[#ef4444]/20 text-[#ef4444]' :
                      ticket.status === 'in_progress' ? 'bg-[#3b82f6]/20 text-[#3b82f6]' :
                      ticket.status === 'done' ? 'bg-[#10b981]/20 text-[#10b981]' :
                      'bg-[#252d3d] text-[#8892a4]'
                    }`}>{STATUS_LABELS[ticket.status]}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      ticket.priority === 'high' ? 'bg-[#ef4444]/10 text-[#ef4444]' :
                      ticket.priority === 'medium' ? 'bg-[#f59e0b]/10 text-[#f59e0b]' :
                      'bg-[#10b981]/10 text-[#10b981]'
                    }`}>{PRIORITY_LABELS[ticket.priority]}</span>
                  </div>
                  <div className="text-sm text-[#8892a4] mb-2 line-clamp-2">{ticket.problem}</div>
                  <div className="flex items-center gap-4 text-xs text-[#4b5568]">
                    <span className="flex items-center gap-1"><Icon name="MapPin" size={11} />{ticket.subscriberAddress}</span>
                    {tech && <span className="flex items-center gap-1"><Icon name="User" size={11} />{tech.lastName} {tech.firstName}</span>}
                    <span className="flex items-center gap-1"><Icon name="Clock" size={11} />{new Date(ticket.createdAt).toLocaleDateString('ru-RU')}</span>
                  </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); deleteServiceTicket(ticket.id); }} className="p-1.5 hover:bg-[#ef4444]/20 rounded text-[#4b5568] hover:text-[#ef4444] transition-colors flex-shrink-0">
                  <Icon name="Trash2" size={13} />
                </button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <div className="text-center text-[#4b5568] text-sm py-16">Нет заявок</div>}
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

function TicketForm({ form: initial, onChange, employees, subscribers, onSave, onCancel }: {
  form: { subscriberName: string; subscriberAddress: string; subscriberPhone: string; technicianId: string; problem: string; status: ServiceTicket['status']; priority: ServiceTicket['priority']; notes: string };
  onChange: (f: typeof initial) => void;
  employees: ReturnType<typeof useCRMStore>['employees'];
  subscribers: ReturnType<typeof useCRMStore>['subscribers'];
  onSave: () => void; onCancel: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [subSearch, setSubSearch] = useState('');
  const update = (key: string, val: string) => { const next = { ...form, [key]: val }; setForm(next); onChange(next); };

  const filteredSubs = subSearch.length > 1 ? subscribers.filter((s) =>
    s.fullName.toLowerCase().includes(subSearch.toLowerCase()) || s.contractNumber.includes(subSearch) || s.phone.includes(subSearch)
  ).slice(0, 5) : [];

  return (
    <div className="space-y-4">
      <div className="relative">
        <label className="block text-xs font-medium text-[#8892a4] mb-1.5">Поиск абонента</label>
        <div className="relative">
          <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4b5568]" />
          <input value={subSearch} onChange={(e) => setSubSearch(e.target.value)} placeholder="ФИО, договор, телефон..." className="w-full bg-[#0f1117] border border-[#252d3d] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-[#4b5568] focus:outline-none focus:border-[#3b82f6]" />
        </div>
        {filteredSubs.length > 0 && (
          <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-[#1e2637] border border-[#252d3d] rounded-lg shadow-xl">
            {filteredSubs.map((s) => (
              <button key={s.id} onClick={() => { update('subscriberName', s.fullName); update('subscriberAddress', s.address); update('subscriberPhone', s.phone); setSubSearch(''); }} className="w-full px-3 py-2.5 text-left hover:bg-[#252d3d] border-b border-[#252d3d] last:border-0">
                <div className="text-sm text-white">{s.fullName}</div>
                <div className="text-xs text-[#4b5568]">{s.contractNumber} • {s.phone}</div>
              </button>
            ))}
          </div>
        )}
      </div>
      <Field label="ФИО абонента"><input value={form.subscriberName} onChange={(e) => update('subscriberName', e.target.value)} className={inputCls} /></Field>
      <Field label="Адрес"><input value={form.subscriberAddress} onChange={(e) => update('subscriberAddress', e.target.value)} className={inputCls} /></Field>
      <Field label="Телефон"><input value={form.subscriberPhone} onChange={(e) => update('subscriberPhone', e.target.value)} className={inputCls} /></Field>
      <Field label="Описание проблемы"><textarea value={form.problem} onChange={(e) => update('problem', e.target.value)} className={`${inputCls} resize-none`} rows={3} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Техник">
          <select value={form.technicianId} onChange={(e) => update('technicianId', e.target.value)} className={selectCls}>
            <option value="">Выбрать</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.lastName} {e.firstName}</option>)}
          </select>
        </Field>
        <Field label="Приоритет">
          <select value={form.priority} onChange={(e) => update('priority', e.target.value)} className={selectCls}>
            <option value="low">Низкий</option>
            <option value="medium">Средний</option>
            <option value="high">Высокий</option>
          </select>
        </Field>
      </div>
      <Field label="Статус">
        <select value={form.status} onChange={(e) => update('status', e.target.value)} className={selectCls}>
          <option value="new">Новая</option>
          <option value="in_progress">В работе</option>
          <option value="done">Выполнена</option>
          <option value="cancelled">Отменена</option>
        </select>
      </Field>
      <Field label="Примечания"><textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} className={`${inputCls} resize-none`} rows={2} /></Field>
      <div className="flex gap-3 pt-4 border-t border-[#252d3d]">
        <button onClick={onSave} className="flex-1 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-sm font-medium">Сохранить</button>
        <button onClick={onCancel} className="px-4 py-2 bg-[#1e2637] hover:bg-[#252d3d] text-[#8892a4] hover:text-white rounded-lg text-sm">Отмена</button>
      </div>
    </div>
  );
}
