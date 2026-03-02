import { useState } from 'react';
import { useCRMStore } from '@/store/crmStore';
import { WorkAct, WorkActItem } from '@/types/crm';
import Icon from '@/components/ui/icon';

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
const inputCls = "w-full bg-[#0f1117] border border-[#252d3d] rounded-lg px-3 py-2 text-sm text-white placeholder-[#4b5568] focus:outline-none focus:border-[#3b82f6] transition-colors";
const selectCls = `${inputCls} cursor-pointer`;

const STATUS_LABELS: Record<WorkAct['status'], string> = { draft: 'Черновик', approved: 'Утверждён', paid: 'Выплачен' };
const STATUS_COLORS: Record<WorkAct['status'], string> = { draft: 'bg-[#252d3d] text-[#8892a4]', approved: 'bg-[#10b981]/20 text-[#10b981]', paid: 'bg-[#3b82f6]/20 text-[#3b82f6]' };

interface Props {
  onOpenPanel: (title: string, content: React.ReactNode) => void;
  onClosePanel: () => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs font-medium text-[#8892a4] mb-1.5">{label}</label>{children}</div>;
}

export default function WorkActs({ onOpenPanel, onClosePanel }: Props) {
  const { currentOfficeId, workActs, employees, addWorkAct, updateWorkAct, deleteWorkAct } = useCRMStore();
  const [filter, setFilter] = useState<'all' | WorkAct['status']>('all');

  const offActs = workActs.filter((a) => a.officeId === currentOfficeId);
  const filtered = filter === 'all' ? offActs : offActs.filter((a) => a.status === filter);
  const totalAmount = offActs.filter((a) => a.status !== 'draft').reduce((s, a) => s + a.totalAmount, 0);

  const openActForm = (act?: WorkAct) => {
    const isNew = !act;
    const initItems: WorkActItem[] = act?.items ? [...act.items] : [{ description: '', quantity: 1, price: 0, amount: 0 }];
    let form = {
      number: act?.number || `АКТ-${new Date().getFullYear()}-${String(offActs.length + 1).padStart(3, '0')}`,
      employeeId: act?.employeeId || '',
      date: act?.date || new Date().toISOString().split('T')[0],
      status: act?.status || 'draft' as WorkAct['status'],
      notes: act?.notes || '',
    };

    const renderForm = (items: WorkActItem[]) => {
      const total = items.reduce((s, i) => s + i.amount, 0);
      onOpenPanel(isNew ? 'Новый акт работ' : `Акт ${form.number}`, (
        <ActForm
          form={form}
          items={items}
          employees={employees.filter((e) => e.status === 'active')}
          onChange={(f) => { form = f; }}
          onItemsChange={(newItems) => renderForm(newItems)}
          total={total}
          onSave={() => {
            if (isNew) addWorkAct({ id: uid(), officeId: currentOfficeId, ...form, items, totalAmount: total, createdAt: new Date().toISOString() });
            else updateWorkAct(act!.id, { ...form, items, totalAmount: total });
            onClosePanel();
          }}
          onCancel={onClosePanel}
        />
      ));
    };
    renderForm(initItems);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Всего актов', value: offActs.length, color: 'text-white' },
          { label: 'Черновики', value: offActs.filter((a) => a.status === 'draft').length, color: 'text-[#8892a4]' },
          { label: 'Утверждено', value: offActs.filter((a) => a.status === 'approved').length, color: 'text-[#10b981]' },
          { label: 'Сумма (утв.)', value: `${totalAmount.toLocaleString('ru-RU')} ₽`, color: 'text-[#3b82f6]' },
        ].map((s) => (
          <div key={s.label} className="bg-[#161b27] border border-[#252d3d] rounded-xl p-3">
            <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-[#4b5568] mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex gap-2">
          {(['all', 'draft', 'approved', 'paid'] as const).map((f) => {
            const labels: Record<string, string> = { all: 'Все', ...STATUS_LABELS };
            return <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f ? 'bg-[#3b82f6] text-white' : 'bg-[#1e2637] text-[#8892a4] hover:text-white'}`}>{labels[f]}</button>;
          })}
        </div>
        <button onClick={() => openActForm()} className="ml-auto flex items-center gap-2 px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-sm font-medium transition-colors">
          <Icon name="Plus" size={14} />Новый акт
        </button>
      </div>

      <div className="bg-[#161b27] border border-[#252d3d] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-[#252d3d]">
            {['Номер', 'Монтажник', 'Дата', 'Позиций', 'Сумма', 'Статус', ''].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#4b5568] uppercase">{h}</th>)}
          </tr></thead>
          <tbody>
            {filtered.slice().reverse().map((act) => {
              const emp = employees.find((e) => e.id === act.employeeId);
              return (
                <tr key={act.id} className="border-b border-[#252d3d] last:border-0 hover:bg-[#1e2637] cursor-pointer" onClick={() => openActForm(act)}>
                  <td className="px-4 py-3 text-sm font-medium text-white">{act.number}</td>
                  <td className="px-4 py-3 text-sm text-[#8892a4]">{emp ? `${emp.lastName} ${emp.firstName}` : '—'}</td>
                  <td className="px-4 py-3 text-sm text-[#8892a4]">{new Date(act.date).toLocaleDateString('ru-RU')}</td>
                  <td className="px-4 py-3 text-sm text-[#8892a4]">{act.items.length}</td>
                  <td className="px-4 py-3 text-sm font-bold text-[#10b981]">{act.totalAmount.toLocaleString('ru-RU')} ₽</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[act.status]}`}>{STATUS_LABELS[act.status]}</span></td>
                  <td className="px-4 py-3"><button onClick={(e) => { e.stopPropagation(); deleteWorkAct(act.id); }} className="p-1.5 hover:bg-[#ef4444]/20 rounded text-[#4b5568] hover:text-[#ef4444]"><Icon name="Trash2" size={13} /></button></td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={7} className="py-12 text-center text-sm text-[#4b5568]">Нет актов</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ActForm({ form: initial, items, employees, onChange, onItemsChange, total, onSave, onCancel }: {
  form: { number: string; employeeId: string; date: string; status: WorkAct['status']; notes: string };
  items: WorkActItem[];
  employees: ReturnType<typeof useCRMStore>['employees'];
  onChange: (f: typeof initial) => void;
  onItemsChange: (items: WorkActItem[]) => void;
  total: number;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [localItems, setLocalItems] = useState<WorkActItem[]>(items);
  const update = (key: string, val: string) => { const next = { ...form, [key]: val }; setForm(next); onChange(next); };

  const updateItem = (idx: number, key: keyof WorkActItem, val: string | number) => {
    const newItems = localItems.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [key]: val };
      if (key === 'quantity' || key === 'price') updated.amount = +updated.quantity * +updated.price;
      return updated;
    });
    setLocalItems(newItems);
    onItemsChange(newItems);
  };

  const addItem = () => {
    const newItems = [...localItems, { description: '', quantity: 1, price: 0, amount: 0 }];
    setLocalItems(newItems);
    onItemsChange(newItems);
  };

  const removeItem = (idx: number) => {
    const newItems = localItems.filter((_, i) => i !== idx);
    setLocalItems(newItems);
    onItemsChange(newItems);
  };

  const localTotal = localItems.reduce((s, i) => s + i.amount, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Номер акта"><input value={form.number} onChange={(e) => update('number', e.target.value)} className={inputCls} /></Field>
        <Field label="Дата"><input type="date" value={form.date} onChange={(e) => update('date', e.target.value)} className={inputCls} /></Field>
      </div>
      <Field label="Монтажник">
        <select value={form.employeeId} onChange={(e) => update('employeeId', e.target.value)} className={selectCls}>
          <option value="">Выбрать сотрудника</option>
          {employees.map((e) => <option key={e.id} value={e.id}>{e.lastName} {e.firstName}</option>)}
        </select>
      </Field>
      <Field label="Статус">
        <select value={form.status} onChange={(e) => update('status', e.target.value)} className={selectCls}>
          <option value="draft">Черновик</option>
          <option value="approved">Утверждён</option>
          <option value="paid">Выплачен</option>
        </select>
      </Field>

      {/* Items */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-[#8892a4]">Работы</label>
          <button onClick={addItem} className="flex items-center gap-1 text-xs text-[#3b82f6] hover:text-white transition-colors"><Icon name="Plus" size={12} />Добавить строку</button>
        </div>
        <div className="space-y-2">
          {localItems.map((item, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_60px_80px_80px_24px] gap-2 items-center">
              <input value={item.description} onChange={(e) => updateItem(idx, 'description', e.target.value)} placeholder="Описание работы" className={inputCls} />
              <input type="number" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', +e.target.value)} placeholder="Кол-во" className={inputCls} min={1} />
              <input type="number" value={item.price} onChange={(e) => updateItem(idx, 'price', +e.target.value)} placeholder="Цена" className={inputCls} />
              <div className="text-sm font-semibold text-[#10b981] text-right">{item.amount.toLocaleString('ru-RU')} ₽</div>
              <button onClick={() => removeItem(idx)} className="p-1 hover:bg-[#ef4444]/20 rounded text-[#4b5568] hover:text-[#ef4444]"><Icon name="X" size={12} /></button>
            </div>
          ))}
        </div>
        <div className="flex justify-between items-center mt-3 pt-3 border-t border-[#252d3d]">
          <span className="text-sm font-semibold text-white">Итого</span>
          <span className="text-xl font-bold text-[#10b981]">{localTotal.toLocaleString('ru-RU')} ₽</span>
        </div>
      </div>

      <Field label="Примечания"><textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} className={`${inputCls} resize-none`} rows={2} /></Field>
      <div className="flex gap-3 pt-4 border-t border-[#252d3d]">
        <button onClick={onSave} className="flex-1 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-sm font-medium">Сохранить</button>
        <button onClick={onCancel} className="px-4 py-2 bg-[#1e2637] text-[#8892a4] rounded-lg text-sm">Отмена</button>
      </div>
    </div>
  );
}
