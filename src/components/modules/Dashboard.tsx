import { useCRMStore } from '@/store/crmStore';
import Icon from '@/components/ui/icon';

export default function Dashboard() {
  const { currentOfficeId, connections, serviceTickets, paidCalls, sales, workActs, employees, subscribers } = useCRMStore();

  const todayStr = new Date().toISOString().split('T')[0];
  const offConn = connections.filter((c) => c.officeId === currentOfficeId);
  const todayConn = offConn.filter((c) => c.date === todayStr);
  const openTickets = serviceTickets.filter((t) => t.officeId === currentOfficeId && (t.status === 'new' || t.status === 'in_progress'));
  const offSales = sales.filter((s) => s.officeId === currentOfficeId);
  const todaySales = offSales.filter((s) => s.date === todayStr);
  const todayRevenue = todaySales.reduce((sum, s) => sum + s.totalAmount, 0);
  const offActs = workActs.filter((a) => a.officeId === currentOfficeId);
  const activeEmployees = employees.filter((e) => e.status === 'active');

  const stats = [
    { label: 'Подключений сегодня', value: todayConn.length, icon: 'Wifi', color: 'text-[#3b82f6]', bg: 'bg-[#3b82f6]/10' },
    { label: 'Открытых заявок', value: openTickets.length, icon: 'AlertCircle', color: 'text-[#f59e0b]', bg: 'bg-[#f59e0b]/10' },
    { label: 'Выручка сегодня', value: `${todayRevenue.toLocaleString('ru-RU')} ₽`, icon: 'TrendingUp', color: 'text-[#10b981]', bg: 'bg-[#10b981]/10' },
    { label: 'Активных сотрудников', value: activeEmployees.length, icon: 'Users', color: 'text-[#8b5cf6]', bg: 'bg-[#8b5cf6]/10' },
    { label: 'Актов за месяц', value: offActs.length, icon: 'FileCheck', color: 'text-[#ec4899]', bg: 'bg-[#ec4899]/10' },
    { label: 'Абонентов', value: subscribers.length, icon: 'UserCheck', color: 'text-[#06b6d4]', bg: 'bg-[#06b6d4]/10' },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-[#161b27] border border-[#252d3d] rounded-xl p-4 hover:border-[#3b82f6]/30 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center`}>
                <Icon name={stat.icon} size={18} className={stat.color} />
              </div>
            </div>
            <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
            <div className="text-xs text-[#8892a4]">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Recent tickets */}
        <div className="bg-[#161b27] border border-[#252d3d] rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Icon name="AlertTriangle" size={15} className="text-[#f59e0b]" />
            Открытые заявки
          </h3>
          <div className="space-y-2">
            {openTickets.length === 0 && <div className="text-sm text-[#4b5568] py-4 text-center">Нет открытых заявок</div>}
            {openTickets.slice(0, 4).map((t) => (
              <div key={t.id} className="flex items-center gap-3 py-2 border-b border-[#252d3d] last:border-0">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${t.priority === 'high' ? 'bg-[#ef4444]' : t.priority === 'medium' ? 'bg-[#f59e0b]' : 'bg-[#10b981]'}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">{t.subscriberName}</div>
                  <div className="text-xs text-[#4b5568] truncate">{t.problem}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${t.status === 'new' ? 'bg-[#ef4444]/20 text-[#ef4444]' : 'bg-[#f59e0b]/20 text-[#f59e0b]'}`}>
                  {t.status === 'new' ? 'Новая' : 'В работе'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Today connections */}
        <div className="bg-[#161b27] border border-[#252d3d] rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Icon name="CalendarDays" size={15} className="text-[#3b82f6]" />
            Подключения сегодня
          </h3>
          <div className="space-y-2">
            {todayConn.length === 0 && <div className="text-sm text-[#4b5568] py-4 text-center">Нет подключений на сегодня</div>}
            {todayConn.slice(0, 4).map((c) => (
              <div key={c.id} className="flex items-center gap-3 py-2 border-b border-[#252d3d] last:border-0">
                <div className="w-8 h-8 rounded-lg bg-[#3b82f6]/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-[#3b82f6]">{c.timeSlot}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">{c.subscriberName}</div>
                  <div className="text-xs text-[#4b5568] truncate">{c.subscriberAddress}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  c.status === 'done' ? 'bg-[#10b981]/20 text-[#10b981]' :
                  c.status === 'in_progress' ? 'bg-[#3b82f6]/20 text-[#3b82f6]' :
                  'bg-[#252d3d] text-[#8892a4]'
                }`}>
                  {c.status === 'done' ? 'Выполнено' : c.status === 'in_progress' ? 'В работе' : 'Запланировано'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent sales */}
        <div className="bg-[#161b27] border border-[#252d3d] rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Icon name="ShoppingCart" size={15} className="text-[#10b981]" />
            Последние продажи
          </h3>
          <div className="space-y-2">
            {offSales.length === 0 && <div className="text-sm text-[#4b5568] py-4 text-center">Нет продаж</div>}
            {offSales.slice(-4).reverse().map((s) => (
              <div key={s.id} className="flex items-center gap-3 py-2 border-b border-[#252d3d] last:border-0">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">{s.customerName}</div>
                  <div className="text-xs text-[#4b5568]">{new Date(s.date).toLocaleDateString('ru-RU')}</div>
                </div>
                <span className="text-sm font-semibold text-[#10b981]">{s.totalAmount.toLocaleString('ru-RU')} ₽</span>
              </div>
            ))}
          </div>
        </div>

        {/* Work acts */}
        <div className="bg-[#161b27] border border-[#252d3d] rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Icon name="FileCheck" size={15} className="text-[#8b5cf6]" />
            Последние акты
          </h3>
          <div className="space-y-2">
            {offActs.length === 0 && <div className="text-sm text-[#4b5568] py-4 text-center">Нет актов</div>}
            {offActs.slice(-4).reverse().map((a) => (
              <div key={a.id} className="flex items-center gap-3 py-2 border-b border-[#252d3d] last:border-0">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">{a.number}</div>
                  <div className="text-xs text-[#4b5568]">{new Date(a.date).toLocaleDateString('ru-RU')}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${a.status === 'approved' ? 'bg-[#10b981]/20 text-[#10b981]' : a.status === 'paid' ? 'bg-[#3b82f6]/20 text-[#3b82f6]' : 'bg-[#252d3d] text-[#8892a4]'}`}>
                  {a.status === 'draft' ? 'Черновик' : a.status === 'approved' ? 'Утверждён' : 'Выплачен'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
