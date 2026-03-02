import { useState } from 'react';
import { useCRMStore } from '@/store/crmStore';
import { SalarySheet, SalaryRecord } from '@/types/crm';
import Icon from '@/components/ui/icon';

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
const inputCls = "w-full bg-[#0f1117] border border-[#252d3d] rounded-lg px-3 py-2 text-sm text-white placeholder-[#4b5568] focus:outline-none focus:border-[#3b82f6] transition-colors";
const selectCls = `${inputCls} cursor-pointer`;

const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const STATUS_LABELS: Record<SalarySheet['status'], string> = { draft: 'Черновик', approved: 'Утверждена', paid: 'Выплачена' };
const STATUS_COLORS: Record<SalarySheet['status'], string> = { draft: 'bg-[#252d3d] text-[#8892a4]', approved: 'bg-[#10b981]/20 text-[#10b981]', paid: 'bg-[#3b82f6]/20 text-[#3b82f6]' };

interface Props {
  onOpenPanel: (title: string, content: React.ReactNode) => void;
  onClosePanel: () => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs font-medium text-[#8892a4] mb-1.5">{label}</label>{children}</div>;
}

export default function Salary({ onOpenPanel, onClosePanel }: Props) {
  const { currentOfficeId, salarySheets, employees, positions, workActs, sales, addSalarySheet, updateSalarySheet, deleteSalarySheet } = useCRMStore();
  const now = new Date();

  const offSheets = salarySheets.filter((s) => s.officeId === currentOfficeId);

  const generateSheet = () => {
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const monthStr = `${year}-${month}`;

    const activeEmps = employees.filter((e) => e.status === 'active');
    const records: SalaryRecord[] = activeEmps.map((emp) => {
      const pos = positions.find((p) => p.id === emp.positionId);
      const empActs = workActs.filter((a) => a.employeeId === emp.id && a.date.startsWith(monthStr) && a.status !== 'draft');
      const empSales = sales.filter((s) => s.employeeId === emp.id && s.date.startsWith(monthStr) && s.status === 'completed');
      const actAmount = empActs.reduce((s, a) => s + a.totalAmount, 0);
      const salesAmount = empSales.reduce((s, sale) => s + sale.totalAmount, 0);
      const salesBonus = pos?.salaryType === 'kpi' ? Math.round(salesAmount * 0.05) : 0;
      const kpiBonus = pos?.kpiBonus || 0;
      const baseSalary = pos?.baseSalary || 0;
      const totalAmount = baseSalary + actAmount + salesBonus + kpiBonus;
      return {
        id: uid(), officeId: currentOfficeId, month: MONTHS[now.getMonth()], year,
        employeeId: emp.id, baseSalary, actAmount, salesBonus, kpiBonus, deductions: 0, totalAmount, status: 'draft', createdAt: new Date().toISOString(),
      };
    });

    const sheet: SalarySheet = {
      id: uid(), officeId: currentOfficeId,
      name: `Ведомость ${MONTHS[now.getMonth()]} ${year}`,
      month: MONTHS[now.getMonth()], year, records,
      totalAmount: records.reduce((s, r) => s + r.totalAmount, 0),
      status: 'draft', createdAt: new Date().toISOString(),
    };
    addSalarySheet(sheet);
  };

  const openSheet = (sheet: SalarySheet) => {
    onOpenPanel(`Ведомость: ${sheet.name}`, (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-white">{sheet.name}</div>
            <div className="text-xs text-[#4b5568]">{sheet.records.length} сотрудников</div>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[sheet.status]}`}>{STATUS_LABELS[sheet.status]}</span>
        </div>

        <div className="flex gap-2">
          {sheet.status === 'draft' && <button onClick={() => { updateSalarySheet(sheet.id, { status: 'approved' }); onClosePanel(); }} className="flex-1 py-1.5 bg-[#10b981] hover:bg-[#059669] text-white rounded-lg text-xs font-medium">Утвердить</button>}
          {sheet.status === 'approved' && <button onClick={() => { updateSalarySheet(sheet.id, { status: 'paid' }); onClosePanel(); }} className="flex-1 py-1.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-xs font-medium">Выплатить</button>}
        </div>

        <div className="space-y-2">
          {sheet.records.map((rec) => {
            const emp = employees.find((e) => e.id === rec.employeeId);
            return (
              <div key={rec.id} className="bg-[#0f1117] border border-[#252d3d] rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#3b82f6]/20 flex items-center justify-center text-xs font-semibold text-[#3b82f6]">{emp?.lastName[0] || '?'}</div>
                    <span className="text-sm font-medium text-white">{emp ? `${emp.lastName} ${emp.firstName}` : '—'}</span>
                  </div>
                  <span className="text-sm font-bold text-[#10b981]">{rec.totalAmount.toLocaleString('ru-RU')} ₽</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  {[
                    ['Оклад', rec.baseSalary],
                    ['Акты работ', rec.actAmount],
                    ['Бонус с продаж', rec.salesBonus],
                    ['КПИ бонус', rec.kpiBonus],
                    ['Вычеты', -rec.deductions],
                  ].map(([label, val]) => (
                    <div key={label as string} className="flex justify-between">
                      <span className="text-[#4b5568]">{label}:</span>
                      <span className={+val < 0 ? 'text-[#ef4444]' : 'text-[#8892a4]'}>{(+val).toLocaleString('ru-RU')} ₽</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-[#252d3d] pt-3 flex justify-between">
          <span className="text-sm font-semibold text-white">Итого к выплате</span>
          <span className="text-lg font-bold text-[#10b981]">{sheet.totalAmount.toLocaleString('ru-RU')} ₽</span>
        </div>
      </div>
    ));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Ведомостей', value: offSheets.length, color: 'text-white' },
          { label: 'К выплате', value: `${offSheets.filter((s) => s.status === 'approved').reduce((sum, s) => sum + s.totalAmount, 0).toLocaleString('ru-RU')} ₽`, color: 'text-[#f59e0b]' },
          { label: 'Выплачено', value: `${offSheets.filter((s) => s.status === 'paid').reduce((sum, s) => sum + s.totalAmount, 0).toLocaleString('ru-RU')} ₽`, color: 'text-[#10b981]' },
        ].map((s) => (
          <div key={s.label} className="bg-[#161b27] border border-[#252d3d] rounded-xl p-3">
            <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-[#4b5568] mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button onClick={generateSheet} className="flex items-center gap-2 px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-sm font-medium transition-colors">
          <Icon name="Plus" size={14} />Создать ведомость за {MONTHS[now.getMonth()]}
        </button>
      </div>

      <div className="bg-[#161b27] border border-[#252d3d] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-[#252d3d]">
            {['Ведомость', 'Период', 'Сотрудников', 'Сумма', 'Статус', ''].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#4b5568] uppercase">{h}</th>)}
          </tr></thead>
          <tbody>
            {offSheets.slice().reverse().map((sheet) => (
              <tr key={sheet.id} className="border-b border-[#252d3d] last:border-0 hover:bg-[#1e2637] cursor-pointer" onClick={() => openSheet(sheet)}>
                <td className="px-4 py-3 text-sm font-medium text-white">{sheet.name}</td>
                <td className="px-4 py-3 text-sm text-[#8892a4]">{sheet.month} {sheet.year}</td>
                <td className="px-4 py-3 text-sm text-[#8892a4]">{sheet.records.length}</td>
                <td className="px-4 py-3 text-sm font-bold text-[#10b981]">{sheet.totalAmount.toLocaleString('ru-RU')} ₽</td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[sheet.status]}`}>{STATUS_LABELS[sheet.status]}</span></td>
                <td className="px-4 py-3"><button onClick={(e) => { e.stopPropagation(); deleteSalarySheet(sheet.id); }} className="p-1.5 hover:bg-[#ef4444]/20 rounded text-[#4b5568] hover:text-[#ef4444]"><Icon name="Trash2" size={13} /></button></td>
              </tr>
            ))}
            {offSheets.length === 0 && <tr><td colSpan={6} className="py-12 text-center text-sm text-[#4b5568]">Нет ведомостей. Создайте первую!</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Info */}
      <div className="bg-[#1e2637] border border-[#252d3d] rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Icon name="Info" size={15} className="text-[#3b82f6] flex-shrink-0 mt-0.5" />
          <div className="text-xs text-[#8892a4] space-y-1">
            <div>При создании ведомости автоматически рассчитывается:</div>
            <div>• <span className="text-white">Оклад</span> — из штатного расписания</div>
            <div>• <span className="text-white">Акты работ</span> — сумма утверждённых актов за месяц</div>
            <div>• <span className="text-white">Бонус с продаж</span> — 5% для сотрудников с типом оплаты КПИ</div>
            <div>• <span className="text-white">КПИ бонус</span> — из штатного расписания</div>
          </div>
        </div>
      </div>
    </div>
  );
}
