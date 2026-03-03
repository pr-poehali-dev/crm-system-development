import { useState } from 'react';
import { useCRMStore } from '@/store/crmStore';
import { WorkAct, WorkActItem, WorkActMember, WorkType } from '@/types/crm';
import Icon from '@/components/ui/icon';

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
const inputCls = "w-full bg-[#0f1117] border border-[#252d3d] rounded-lg px-3 py-2 text-sm text-white placeholder-[#4b5568] focus:outline-none focus:border-[#3b82f6] transition-colors";
const selectCls = `${inputCls} cursor-pointer`;

const STATUS_LABELS: Record<WorkAct['status'], string> = { draft: 'Черновик', approved: 'Утверждён', paid: 'Выплачен' };
const STATUS_COLORS: Record<WorkAct['status'], string> = {
  draft: 'bg-[#252d3d] text-[#8892a4]',
  approved: 'bg-[#10b981]/20 text-[#10b981]',
  paid: 'bg-[#3b82f6]/20 text-[#3b82f6]',
};

interface Props {
  onOpenPanel: (title: string, content: React.ReactNode) => void;
  onClosePanel: () => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs font-medium text-[#8892a4] mb-1.5 uppercase tracking-wide">{label}</label>{children}</div>;
}

/* ─── Форма акта ─── */
interface ActFormProps {
  act?: WorkAct;
  actNumber: string;
  employees: ReturnType<typeof useCRMStore>['employees'];
  workTypes: WorkType[];
  onSave: (data: Omit<WorkAct, 'id' | 'officeId' | 'createdAt'>) => void;
  onCancel: () => void;
}

function ActForm({ act, actNumber, employees, workTypes, onSave, onCancel }: ActFormProps) {
  const [number] = useState(act?.number || actNumber);
  const [date, setDate] = useState(act?.date || new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<WorkAct['status']>(act?.status || 'draft');
  const [object, setObject] = useState(act?.object || '');
  const [notes, setNotes] = useState(act?.notes || '');
  const [items, setItems] = useState<WorkActItem[]>(
    act?.items?.length ? act.items : [{ description: '', quantity: 1, price: 0, amount: 0 }]
  );
  const [members, setMembers] = useState<WorkActMember[]>(
    act?.members?.length
      ? act.members
      : (act?.employeeId ? [{ employeeId: act.employeeId, ktu: 1 }] : [])
  );
  const [ktuError, setKtuError] = useState('');

  const total = items.reduce((s, i) => s + i.amount, 0);

  /* ── Работы ── */
  const updateItem = (idx: number, field: keyof WorkActItem, val: string | number) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: val };
      if (field === 'quantity' || field === 'price') {
        updated.amount = +updated.quantity * +updated.price;
      }
      return updated;
    }));
  };

  const selectWorkType = (idx: number, wtId: string) => {
    const wt = workTypes.find(w => w.id === wtId);
    if (!wt) return;
    setItems(prev => prev.map((item, i) => i !== idx ? item : {
      ...item,
      workTypeId: wt.id,
      description: wt.name,
      price: wt.price,
      amount: item.quantity * wt.price,
    }));
  };

  const addItem = () => setItems(prev => [...prev, { description: '', quantity: 1, price: 0, amount: 0 }]);
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  /* ── Монтажники ── */
  const redistributeKtu = (newMembers: WorkActMember[]) => {
    const n = newMembers.length;
    if (n === 0) return newMembers;
    const ktu = Math.round((1 / n) * 100) / 100;
    return newMembers.map((m, i) => ({ ...m, ktu: i === n - 1 ? Math.round((1 - ktu * (n - 1)) * 100) / 100 : ktu }));
  };

  const addMember = () => {
    const available = employees.filter(e => !members.find(m => m.employeeId === e.id));
    if (available.length === 0) return;
    const newMembers = [...members, { employeeId: available[0].id, ktu: 0 }];
    setMembers(redistributeKtu(newMembers));
  };

  const removeMember = (idx: number) => {
    const newMembers = members.filter((_, i) => i !== idx);
    setMembers(redistributeKtu(newMembers));
  };

  const updateMemberEmployee = (idx: number, empId: string) => {
    setMembers(prev => prev.map((m, i) => i !== idx ? m : { ...m, employeeId: empId }));
  };

  const updateMemberKtu = (idx: number, val: number) => {
    setMembers(prev => prev.map((m, i) => i !== idx ? m : { ...m, ktu: val }));
    setKtuError('');
  };

  /* ── Сохранение ── */
  const handleSave = () => {
    const ktuSum = members.reduce((s, m) => s + m.ktu, 0);
    if (members.length > 0 && Math.abs(ktuSum - 1) > 0.01) {
      setKtuError(`Сумма КТУ должна равняться 1. Сейчас: ${ktuSum.toFixed(2)}`);
      return;
    }
    onSave({
      number,
      date,
      status,
      object,
      notes,
      items,
      totalAmount: total,
      employeeId: members[0]?.employeeId || '',
      members: members.length > 0 ? members : undefined,
    });
  };

  return (
    <div className="space-y-5">
      {/* Номер + дата + статус */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Номер акта">
          <input value={number} readOnly className={inputCls + ' opacity-50 cursor-not-allowed'} />
        </Field>
        <Field label="Дата акта">
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
        </Field>
      </div>

      <Field label="Статус">
        <select value={status} onChange={e => setStatus(e.target.value as WorkAct['status'])} className={selectCls}>
          <option value="draft">Черновик</option>
          <option value="approved">Утверждён</option>
          <option value="paid">Выплачен</option>
        </select>
      </Field>

      <Field label="Объект">
        <input value={object} onChange={e => setObject(e.target.value)} className={inputCls} placeholder="Адрес или описание объекта" />
      </Field>

      {/* Работы */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-[#8892a4] uppercase tracking-wide">Работы</label>
          <button onClick={addItem} className="flex items-center gap-1 text-xs text-[#3b82f6] hover:text-white transition-colors">
            <Icon name="Plus" size={12} />Добавить
          </button>
        </div>
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={idx} className="bg-[#0f1117] border border-[#252d3d] rounded-xl p-3 space-y-2">
              {/* Вид работы из справочника */}
              {workTypes.length > 0 && (
                <select
                  value={item.workTypeId || ''}
                  onChange={e => selectWorkType(idx, e.target.value)}
                  className={selectCls}
                >
                  <option value="">— Выбрать из справочника —</option>
                  {workTypes.map(wt => <option key={wt.id} value={wt.id}>{wt.name} · {wt.price.toLocaleString('ru-RU')} ₽</option>)}
                </select>
              )}
              <div className="grid grid-cols-[1fr_70px_90px_80px_24px] gap-2 items-center">
                <input
                  value={item.description}
                  onChange={e => updateItem(idx, 'description', e.target.value)}
                  placeholder="Описание работы"
                  className={inputCls}
                />
                <input
                  type="number"
                  value={item.quantity}
                  onChange={e => updateItem(idx, 'quantity', +e.target.value)}
                  placeholder="Кол-во"
                  className={inputCls}
                  min={1}
                />
                <input
                  type="number"
                  value={item.price}
                  onChange={e => updateItem(idx, 'price', +e.target.value)}
                  placeholder="Цена"
                  className={inputCls}
                />
                <div className="text-sm font-semibold text-[#10b981] text-right pr-1">
                  {item.amount.toLocaleString('ru-RU')} ₽
                </div>
                <button onClick={() => removeItem(idx)} className="p-1 hover:bg-[#ef4444]/20 rounded text-[#4b5568] hover:text-[#ef4444]">
                  <Icon name="X" size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between items-center mt-3 pt-3 border-t border-[#252d3d]">
          <span className="text-sm font-semibold text-white">Итого</span>
          <span className="text-xl font-bold text-[#10b981]">{total.toLocaleString('ru-RU')} ₽</span>
        </div>
      </div>

      {/* Монтажники с КТУ */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-[#8892a4] uppercase tracking-wide">Монтажники</label>
          <button onClick={addMember} className="flex items-center gap-1 text-xs text-[#3b82f6] hover:text-white transition-colors">
            <Icon name="UserPlus" size={12} />Добавить
          </button>
        </div>
        <div className="space-y-2">
          {members.map((m, idx) => {
            const emp = employees.find(e => e.id === m.employeeId);
            const salary = total * m.ktu;
            return (
              <div key={idx} className="grid grid-cols-[1fr_80px_24px] gap-2 items-center">
                <select
                  value={m.employeeId}
                  onChange={e => updateMemberEmployee(idx, e.target.value)}
                  className={selectCls}
                >
                  {employees.map(e => <option key={e.id} value={e.id}>{e.lastName} {e.firstName}</option>)}
                </select>
                <div>
                  <label className="text-[10px] text-[#4b5568] block mb-1">КТУ</label>
                  <input
                    type="number"
                    step={0.01}
                    min={0}
                    max={1}
                    value={m.ktu}
                    onChange={e => updateMemberKtu(idx, parseFloat(e.target.value) || 0)}
                    className={inputCls}
                  />
                </div>
                <button onClick={() => removeMember(idx)} className="mt-4 p-1 hover:bg-[#ef4444]/20 rounded text-[#4b5568] hover:text-[#ef4444]">
                  <Icon name="X" size={12} />
                </button>
                <div className="col-span-2 text-xs text-[#4b5568] -mt-1">
                  {emp ? `${emp.lastName} ${emp.firstName[0]}.` : '—'} · сумма по акту: <span className="text-[#10b981] font-semibold">{salary.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽</span>
                </div>
              </div>
            );
          })}
          {members.length === 0 && (
            <div className="text-sm text-[#4b5568] text-center py-3 border border-dashed border-[#252d3d] rounded-xl">
              Нажмите «Добавить» чтобы указать монтажников
            </div>
          )}
        </div>

        {/* Ошибка КТУ */}
        {ktuError && (
          <div className="mt-2 flex items-start gap-2 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-xl px-3 py-2">
            <Icon name="AlertCircle" size={14} className="text-[#ef4444] mt-0.5 flex-shrink-0" />
            <span className="text-xs text-[#ef4444]">{ktuError}</span>
          </div>
        )}

        {/* Превью зарплаты */}
        {members.length > 0 && total > 0 && (
          <div className="mt-3 bg-[#0f1117] border border-[#252d3d] rounded-xl p-3">
            <div className="text-xs font-semibold text-[#8892a4] uppercase mb-2">Превью зарплаты</div>
            <div className="space-y-1.5">
              {members.map((m, i) => {
                const emp = employees.find(e => e.id === m.employeeId);
                const salary = total * m.ktu;
                return (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#3b82f6]/20 flex items-center justify-center text-[10px] font-bold text-[#3b82f6]">
                        {emp ? emp.lastName[0] : '?'}
                      </div>
                      <span className="text-sm text-white">{emp ? `${emp.lastName} ${emp.firstName}` : '—'}</span>
                      <span className="text-xs text-[#4b5568]">КТУ {m.ktu}</span>
                    </div>
                    <span className="text-sm font-bold text-[#10b981]">
                      {salary.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <Field label="Примечания">
        <textarea value={notes} onChange={e => setNotes(e.target.value)} className={`${inputCls} resize-none`} rows={2} />
      </Field>

      <div className="flex gap-3 pt-4 border-t border-[#252d3d]">
        <button onClick={handleSave} className="flex-1 py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-sm font-medium">
          {act ? 'Сохранить' : 'Создать акт'}
        </button>
        <button onClick={onCancel} className="px-4 py-2.5 bg-[#1e2637] text-[#8892a4] rounded-lg text-sm">Отмена</button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   ГЛАВНЫЙ КОМПОНЕНТ
══════════════════════════════════════════ */
export default function WorkActs({ onOpenPanel, onClosePanel }: Props) {
  const { currentOfficeId, workActs, employees, workTypes, addWorkAct, updateWorkAct, deleteWorkAct } = useCRMStore();
  const [filter, setFilter] = useState<'all' | WorkAct['status']>('all');

  const offActs = workActs.filter(a => a.officeId === currentOfficeId);
  const filtered = filter === 'all' ? offActs : offActs.filter(a => a.status === filter);
  const totalAmount = offActs.filter(a => a.status !== 'draft').reduce((s, a) => s + a.totalAmount, 0);

  const nextNumber = () => `АКТ-${new Date().getFullYear()}-${String(offActs.length + 1).padStart(3, '0')}`;

  const openActForm = (act?: WorkAct) => {
    onOpenPanel(act ? `Акт ${act.number}` : 'Новый акт работ', (
      <ActForm
        act={act}
        actNumber={nextNumber()}
        employees={employees.filter(e => e.status === 'active')}
        workTypes={workTypes || []}
        onSave={(data) => {
          if (act) updateWorkAct(act.id, data);
          else addWorkAct({ id: uid(), officeId: currentOfficeId, ...data, createdAt: new Date().toISOString() });
          onClosePanel();
        }}
        onCancel={onClosePanel}
      />
    ));
  };

  return (
    <div className="space-y-4">
      {/* Статистика */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Всего актов', value: offActs.length, color: 'text-white', icon: 'FileText', bg: 'bg-[#3b82f6]/10', ic: 'text-[#3b82f6]' },
          { label: 'Черновики', value: offActs.filter(a => a.status === 'draft').length, color: 'text-[#8892a4]', icon: 'FilePen', bg: 'bg-[#8892a4]/10', ic: 'text-[#8892a4]' },
          { label: 'Утверждено', value: offActs.filter(a => a.status === 'approved').length, color: 'text-[#10b981]', icon: 'CheckCircle2', bg: 'bg-[#10b981]/10', ic: 'text-[#10b981]' },
          { label: 'Сумма (утв.)', value: `${totalAmount.toLocaleString('ru-RU')} ₽`, color: 'text-[#3b82f6]', icon: 'CircleDollarSign', bg: 'bg-[#3b82f6]/10', ic: 'text-[#3b82f6]' },
        ].map(s => (
          <div key={s.label} className="bg-[#161b27] border border-[#252d3d] rounded-xl p-4">
            <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center mb-2`}>
              <Icon name={s.icon} size={15} className={s.ic} />
            </div>
            <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-[#4b5568] mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 bg-[#161b27] border border-[#252d3d] rounded-xl p-1">
          {(['all', 'draft', 'approved', 'paid'] as const).map(f => {
            const labels: Record<string, string> = { all: 'Все', ...STATUS_LABELS };
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f ? 'bg-[#3b82f6] text-white' : 'text-[#8892a4] hover:text-white'}`}
              >
                {labels[f]}
              </button>
            );
          })}
        </div>
        <button onClick={() => openActForm()} className="ml-auto flex items-center gap-2 px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-sm font-medium transition-colors">
          <Icon name="Plus" size={14} />Новый акт
        </button>
      </div>

      <div className="bg-[#161b27] border border-[#252d3d] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#252d3d]">
              {['Номер', 'Дата', 'Объект', 'Монтажники', 'Позиций', 'Сумма', 'Статус', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#4b5568] uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.slice().reverse().map(act => {
              const memberEmps = act.members?.length
                ? act.members.map(m => employees.find(e => e.id === m.employeeId))
                : [employees.find(e => e.id === act.employeeId)];
              const empNames = memberEmps.filter(Boolean).map(e => `${e!.lastName} ${e!.firstName[0]}.`).join(', ');
              return (
                <tr
                  key={act.id}
                  className="border-b border-[#252d3d] last:border-0 hover:bg-[#1e2637] cursor-pointer transition-colors"
                  onClick={() => openActForm(act)}
                >
                  <td className="px-4 py-3 text-sm font-medium text-white">{act.number}</td>
                  <td className="px-4 py-3 text-sm text-[#8892a4]">{new Date(act.date).toLocaleDateString('ru-RU')}</td>
                  <td className="px-4 py-3 text-sm text-[#8892a4] max-w-[140px] truncate">{act.object || '—'}</td>
                  <td className="px-4 py-3 text-xs text-[#8892a4] max-w-[160px] truncate">{empNames || '—'}</td>
                  <td className="px-4 py-3 text-sm text-[#8892a4]">{act.items.length}</td>
                  <td className="px-4 py-3 text-sm font-bold text-[#10b981]">{act.totalAmount.toLocaleString('ru-RU')} ₽</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[act.status]}`}>{STATUS_LABELS[act.status]}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={e => { e.stopPropagation(); deleteWorkAct(act.id); }}
                      className="p-1.5 hover:bg-[#ef4444]/20 rounded text-[#4b5568] hover:text-[#ef4444]"
                    >
                      <Icon name="Trash2" size={13} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="py-12 text-center text-sm text-[#4b5568]">Нет актов</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
