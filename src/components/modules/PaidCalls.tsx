import { useState } from 'react';
import { useCRMStore } from '@/store/crmStore';
import { PaidCall } from '@/types/crm';
import Icon from '@/components/ui/icon';

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
const inputCls = "w-full bg-[#0f1117] border border-[#252d3d] rounded-lg px-3 py-2 text-sm text-white placeholder-[#4b5568] focus:outline-none focus:border-[#3b82f6] transition-colors";
const selectCls = `${inputCls} cursor-pointer`;
const STATUS_LABELS: Record<string, string> = { new: 'Новый', in_progress: 'В работе', done: 'Выполнен', cancelled: 'Отменён' };

interface Props {
  onOpenPanel: (title: string, content: React.ReactNode) => void;
  onClosePanel: () => void;
}

export default function PaidCalls({ onOpenPanel, onClosePanel }: Props) {
  const { currentOfficeId, paidCalls, employees, subscribers, addPaidCall, updatePaidCall, deletePaidCall } = useCRMStore();
  const [filter, setFilter] = useState<'all' | PaidCall['status']>('all');

  const offCalls = paidCalls.filter((c) => c.officeId === currentOfficeId);
  const filtered = filter === 'all' ? offCalls : offCalls.filter((c) => c.status === filter);
  const totalAmount = filtered.filter((c) => c.status === 'done').reduce((s, c) => s + c.amount, 0);

  const openForm = (call?: PaidCall) => {
    const isNew = !call;
    let form = {
      subscriberName: call?.subscriberName || '', subscriberAddress: call?.subscriberAddress || '',
      subscriberPhone: call?.subscriberPhone || '', technicianId: call?.technicianId || '',
      description: call?.description || '', amount: call?.amount || 0,
      status: call?.status || 'new' as PaidCall['status'], date: call?.date || new Date().toISOString().split('T')[0],
    };
    const save = () => {
      if (isNew) addPaidCall({ id: uid(), officeId: currentOfficeId, ...form, createdAt: new Date().toISOString(), subscriberId: undefined });
      else updatePaidCall(call!.id, form);
      onClosePanel();
    };
    onOpenPanel(isNew ? 'Новый платный вызов' : 'Редактировать вызов', <CallForm form={form} onChange={(f) => { form = f; }} employees={employees.filter((e) => e.status === 'active')} subscribers={subscribers} onSave={save} onCancel={onClosePanel} />);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Всего вызовов', value: offCalls.length, color: 'text-[#8892a4]' },
          { label: 'Выполнено', value: offCalls.filter((c) => c.status === 'done').length, color: 'text-[#10b981]' },
          { label: 'Выручка (выполн.)', value: `${totalAmount.toLocaleString('ru-RU')} ₽`, color: 'text-[#3b82f6]' },
        ].map((s) => (
          <div key={s.label} className="bg-[#161b27] border border-[#252d3d] rounded-xl p-3">
            <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-[#4b5568] mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex gap-2 flex-1">
          {(['all', 'new', 'in_progress', 'done', 'cancelled'] as const).map((f) => {
            const labels: Record<string, string> = { all: 'Все', ...STATUS_LABELS };
            return <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f ? 'bg-[#3b82f6] text-white' : 'bg-[#1e2637] text-[#8892a4] hover:text-white'}`}>{labels[f]}</button>;
          })}
        </div>
        <button onClick={() => openForm()} className="flex items-center gap-2 px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-sm font-medium transition-colors">
          <Icon name="Plus" size={14} />Добавить
        </button>
      </div>

      <div className="bg-[#161b27] border border-[#252d3d] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-[#252d3d]">
            {['Абонент', 'Адрес', 'Описание', 'Техник', 'Сумма', 'Статус', ''].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#4b5568] uppercase">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {filtered.map((call) => {
              const tech = employees.find((e) => e.id === call.technicianId);
              return (
                <tr key={call.id} className="border-b border-[#252d3d] last:border-0 hover:bg-[#1e2637] transition-colors cursor-pointer" onClick={() => openForm(call)}>
                  <td className="px-4 py-3 text-sm font-medium text-white">{call.subscriberName}</td>
                  <td className="px-4 py-3 text-sm text-[#8892a4] max-w-[150px] truncate">{call.subscriberAddress}</td>
                  <td className="px-4 py-3 text-sm text-[#8892a4] max-w-[150px] truncate">{call.description}</td>
                  <td className="px-4 py-3 text-sm text-[#8892a4]">{tech ? `${tech.lastName} ${tech.firstName[0]}.` : '—'}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-[#10b981]">{call.amount.toLocaleString('ru-RU')} ₽</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${call.status === 'done' ? 'bg-[#10b981]/20 text-[#10b981]' : call.status === 'new' ? 'bg-[#ef4444]/20 text-[#ef4444]' : call.status === 'in_progress' ? 'bg-[#3b82f6]/20 text-[#3b82f6]' : 'bg-[#252d3d] text-[#8892a4]'}`}>{STATUS_LABELS[call.status]}</span></td>
                  <td className="px-4 py-3"><button onClick={(e) => { e.stopPropagation(); deletePaidCall(call.id); }} className="p-1.5 hover:bg-[#ef4444]/20 rounded text-[#4b5568] hover:text-[#ef4444]"><Icon name="Trash2" size={13} /></button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="py-12 text-center text-[#4b5568] text-sm">Нет вызовов</div>}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs font-medium text-[#8892a4] mb-1.5">{label}</label>{children}</div>;
}

function CallForm({ form: initial, onChange, employees, subscribers, onSave, onCancel }: {
  form: { subscriberName: string; subscriberAddress: string; subscriberPhone: string; technicianId: string; description: string; amount: number; status: PaidCall['status']; date: string };
  onChange: (f: typeof initial) => void;
  employees: ReturnType<typeof useCRMStore>['employees'];
  subscribers: ReturnType<typeof useCRMStore>['subscribers'];
  onSave: () => void; onCancel: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [subSearch, setSubSearch] = useState('');
  const update = (key: string, val: string | number) => { const next = { ...form, [key]: val }; setForm(next); onChange(next); };
  const filteredSubs = subSearch.length > 1 ? subscribers.filter((s) => s.fullName.toLowerCase().includes(subSearch.toLowerCase()) || s.phone.includes(subSearch)).slice(0, 5) : [];

  return (
    <div className="space-y-4">
      <div className="relative">
        <label className="block text-xs font-medium text-[#8892a4] mb-1.5">Поиск абонента</label>
        <div className="relative">
          <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4b5568]" />
          <input value={subSearch} onChange={(e) => setSubSearch(e.target.value)} placeholder="ФИО или телефон..." className="w-full bg-[#0f1117] border border-[#252d3d] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-[#4b5568] focus:outline-none focus:border-[#3b82f6]" />
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
      <Field label="Описание работ"><textarea value={form.description} onChange={(e) => update('description', e.target.value)} className={`${inputCls} resize-none`} rows={3} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Техник">
          <select value={form.technicianId} onChange={(e) => update('technicianId', e.target.value)} className={selectCls}>
            <option value="">Выбрать</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.lastName} {e.firstName}</option>)}
          </select>
        </Field>
        <Field label="Сумма (₽)"><input type="number" value={form.amount} onChange={(e) => update('amount', +e.target.value)} className={inputCls} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Дата"><input type="date" value={form.date} onChange={(e) => update('date', e.target.value)} className={inputCls} /></Field>
        <Field label="Статус">
          <select value={form.status} onChange={(e) => update('status', e.target.value)} className={selectCls}>
            <option value="new">Новый</option>
            <option value="in_progress">В работе</option>
            <option value="done">Выполнен</option>
            <option value="cancelled">Отменён</option>
          </select>
        </Field>
      </div>
      <div className="flex gap-3 pt-4 border-t border-[#252d3d]">
        <button onClick={onSave} className="flex-1 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-sm font-medium">Сохранить</button>
        <button onClick={onCancel} className="px-4 py-2 bg-[#1e2637] hover:bg-[#252d3d] text-[#8892a4] rounded-lg text-sm">Отмена</button>
      </div>
    </div>
  );
}
