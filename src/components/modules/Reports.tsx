import { useState } from 'react';
import { useCRMStore } from '@/store/crmStore';
import Icon from '@/components/ui/icon';

export default function Reports() {
  const { currentOfficeId, sales, workActs, employees, paidCalls } = useCRMStore();
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [type, setType] = useState<'sales' | 'acts' | 'calls'>('sales');

  const now = new Date();
  const getPeriodStart = () => {
    const d = new Date(now);
    if (period === 'week') d.setDate(d.getDate() - 7);
    else if (period === 'month') d.setMonth(d.getMonth() - 1);
    else if (period === 'quarter') d.setMonth(d.getMonth() - 3);
    else d.setFullYear(d.getFullYear() - 1);
    return d;
  };
  const start = getPeriodStart();

  const offSales = sales.filter((s) => s.officeId === currentOfficeId && new Date(s.date) >= start && s.status === 'completed');
  const offActs = workActs.filter((a) => a.officeId === currentOfficeId && new Date(a.date) >= start && a.status !== 'draft');
  const offCalls = paidCalls.filter((c) => c.officeId === currentOfficeId && new Date(c.date) >= start && c.status === 'done');

  const salesTotal = offSales.reduce((s, sale) => s + sale.totalAmount, 0);
  const actsTotal = offActs.reduce((s, a) => s + a.totalAmount, 0);
  const callsTotal = offCalls.reduce((s, c) => s + c.amount, 0);

  // Group by employee for acts
  const actsByEmployee = employees.map((emp) => {
    const empActs = offActs.filter((a) => a.employeeId === emp.id);
    return { emp, acts: empActs.length, total: empActs.reduce((s, a) => s + a.totalAmount, 0) };
  }).filter((r) => r.acts > 0).sort((a, b) => b.total - a.total);

  // Group by employee for sales
  const salesByEmployee = employees.map((emp) => {
    const empSales = offSales.filter((s) => s.employeeId === emp.id);
    return { emp, sales: empSales.length, total: empSales.reduce((s, sale) => s + sale.totalAmount, 0) };
  }).filter((r) => r.sales > 0).sort((a, b) => b.total - a.total);

  // Group sales by date for chart
  const salesByDate: Record<string, number> = {};
  offSales.forEach((s) => {
    const d = s.date.slice(0, 7);
    salesByDate[d] = (salesByDate[d] || 0) + s.totalAmount;
  });

  const PERIOD_LABELS = { week: 'Неделя', month: 'Месяц', quarter: 'Квартал', year: 'Год' };

  const maxBarValue = Math.max(...Object.values(salesByDate), 1);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex gap-2">
          {(['week', 'month', 'quarter', 'year'] as const).map((p) => (
            <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${period === p ? 'bg-[#3b82f6] text-white' : 'bg-[#1e2637] text-[#8892a4] hover:text-white'}`}>{PERIOD_LABELS[p]}</button>
          ))}
        </div>
        <div className="flex gap-2 ml-auto">
          {(['sales', 'acts', 'calls'] as const).map((t) => {
            const labels = { sales: 'Продажи', acts: 'Акты', calls: 'Вызовы' };
            return <button key={t} onClick={() => setType(t)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${type === t ? 'bg-[#3b82f6] text-white' : 'bg-[#1e2637] text-[#8892a4] hover:text-white'}`}>{labels[t]}</button>;
          })}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#161b27] border border-[#252d3d] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3"><Icon name="ShoppingCart" size={15} className="text-[#10b981]" /><span className="text-xs text-[#4b5568] font-semibold uppercase">Продажи</span></div>
          <div className="text-2xl font-bold text-white">{salesTotal.toLocaleString('ru-RU')} ₽</div>
          <div className="text-xs text-[#4b5568] mt-1">{offSales.length} транзакций</div>
        </div>
        <div className="bg-[#161b27] border border-[#252d3d] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3"><Icon name="FileCheck" size={15} className="text-[#8b5cf6]" /><span className="text-xs text-[#4b5568] font-semibold uppercase">Акты работ</span></div>
          <div className="text-2xl font-bold text-white">{actsTotal.toLocaleString('ru-RU')} ₽</div>
          <div className="text-xs text-[#4b5568] mt-1">{offActs.length} актов</div>
        </div>
        <div className="bg-[#161b27] border border-[#252d3d] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3"><Icon name="PhoneCall" size={15} className="text-[#f59e0b]" /><span className="text-xs text-[#4b5568] font-semibold uppercase">Платные вызовы</span></div>
          <div className="text-2xl font-bold text-white">{callsTotal.toLocaleString('ru-RU')} ₽</div>
          <div className="text-xs text-[#4b5568] mt-1">{offCalls.length} вызовов</div>
        </div>
      </div>

      {/* Chart */}
      {Object.keys(salesByDate).length > 0 && (
        <div className="bg-[#161b27] border border-[#252d3d] rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-4">Динамика продаж</h3>
          <div className="flex items-end gap-3 h-32">
            {Object.entries(salesByDate).map(([date, value]) => (
              <div key={date} className="flex-1 flex flex-col items-center gap-1">
                <div className="text-xs text-[#10b981] font-medium">{Math.round(value / 1000)}к</div>
                <div className="w-full bg-[#3b82f6] rounded-t transition-all" style={{ height: `${(value / maxBarValue) * 100}%`, minHeight: 4 }} />
                <div className="text-xs text-[#4b5568] whitespace-nowrap">{date.slice(5)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tables */}
      {type === 'acts' && (
        <div className="bg-[#161b27] border border-[#252d3d] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#252d3d]">
            <h3 className="text-sm font-semibold text-white">Акты по монтажникам</h3>
          </div>
          <table className="w-full">
            <thead><tr className="border-b border-[#252d3d]">
              {['Сотрудник', 'Актов', 'Сумма актов'].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#4b5568] uppercase">{h}</th>)}
            </tr></thead>
            <tbody>
              {actsByEmployee.map(({ emp, acts, total }) => (
                <tr key={emp.id} className="border-b border-[#252d3d] last:border-0 hover:bg-[#1e2637]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#8b5cf6]/20 flex items-center justify-center text-xs font-semibold text-[#8b5cf6]">{emp.lastName[0]}</div>
                      <span className="text-sm text-white">{emp.lastName} {emp.firstName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-[#8892a4]">{acts}</td>
                  <td className="px-4 py-3 text-sm font-bold text-[#10b981]">{total.toLocaleString('ru-RU')} ₽</td>
                </tr>
              ))}
              {actsByEmployee.length === 0 && <tr><td colSpan={3} className="py-8 text-center text-sm text-[#4b5568]">Нет данных за период</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {type === 'sales' && (
        <div className="bg-[#161b27] border border-[#252d3d] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#252d3d]">
            <h3 className="text-sm font-semibold text-white">Продажи по сотрудникам</h3>
          </div>
          <table className="w-full">
            <thead><tr className="border-b border-[#252d3d]">
              {['Сотрудник', 'Продаж', 'Сумма'].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#4b5568] uppercase">{h}</th>)}
            </tr></thead>
            <tbody>
              {salesByEmployee.map(({ emp, sales: cnt, total }) => (
                <tr key={emp.id} className="border-b border-[#252d3d] last:border-0 hover:bg-[#1e2637]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#3b82f6]/20 flex items-center justify-center text-xs font-semibold text-[#3b82f6]">{emp.lastName[0]}</div>
                      <span className="text-sm text-white">{emp.lastName} {emp.firstName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-[#8892a4]">{cnt}</td>
                  <td className="px-4 py-3 text-sm font-bold text-[#10b981]">{total.toLocaleString('ru-RU')} ₽</td>
                </tr>
              ))}
              {salesByEmployee.length === 0 && <tr><td colSpan={3} className="py-8 text-center text-sm text-[#4b5568]">Нет данных за период</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {type === 'calls' && (
        <div className="bg-[#161b27] border border-[#252d3d] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#252d3d]">
            <h3 className="text-sm font-semibold text-white">Платные вызовы за период</h3>
          </div>
          <table className="w-full">
            <thead><tr className="border-b border-[#252d3d]">
              {['Дата', 'Абонент', 'Техник', 'Описание', 'Сумма'].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#4b5568] uppercase">{h}</th>)}
            </tr></thead>
            <tbody>
              {offCalls.map((call) => {
                const tech = employees.find((e) => e.id === call.technicianId);
                return (
                  <tr key={call.id} className="border-b border-[#252d3d] last:border-0 hover:bg-[#1e2637]">
                    <td className="px-4 py-3 text-xs text-[#4b5568]">{new Date(call.date).toLocaleDateString('ru-RU')}</td>
                    <td className="px-4 py-3 text-sm text-white">{call.subscriberName}</td>
                    <td className="px-4 py-3 text-sm text-[#8892a4]">{tech ? `${tech.lastName} ${tech.firstName[0]}.` : '—'}</td>
                    <td className="px-4 py-3 text-sm text-[#8892a4]">{call.description}</td>
                    <td className="px-4 py-3 text-sm font-bold text-[#10b981]">{call.amount.toLocaleString('ru-RU')} ₽</td>
                  </tr>
                );
              })}
              {offCalls.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-sm text-[#4b5568]">Нет данных за период</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
