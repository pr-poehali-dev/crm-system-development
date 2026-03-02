import { useState, useEffect, useRef } from 'react';
import { useCRMStore } from '@/store/crmStore';
import { Subscriber } from '@/types/crm';
import Icon from '@/components/ui/icon';
import { useLightBilling, LBSubscriber } from '@/hooks/useLightBilling';

const STATUS_LABELS: Record<Subscriber['status'], string> = { active: 'Активен', suspended: 'Приостановлен', terminated: 'Отключён' };
const STATUS_COLORS: Record<Subscriber['status'], string> = { active: 'bg-[#10b981]/20 text-[#10b981]', suspended: 'bg-[#f59e0b]/20 text-[#f59e0b]', terminated: 'bg-[#ef4444]/20 text-[#ef4444]' };

interface Props {
  onOpenPanel: (title: string, content: React.ReactNode) => void;
  onClosePanel: () => void;
  onCreateTicket?: (sub: { name: string; address: string; phone: string; lbId?: string; contract?: string }) => void;
}

function lbToSubscriber(lb: LBSubscriber): Subscriber {
  return {
    id: lb.id || lb.lb_id,
    fullName: lb.fullName,
    address: lb.address,
    phone: lb.phone,
    email: '',
    contractNumber: lb.contractNumber,
    tariff: lb.tariff,
    balance: lb.balance,
    status: lb.status,
    connectDate: lb.connectDate || new Date().toISOString().split('T')[0],
    ipAddress: lb.ipAddress,
  };
}

export default function Contacts({ onOpenPanel, onClosePanel, onCreateTicket }: Props) {
  const { subscribers: localSubs } = useCRMStore();
  const lb = useLightBilling();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | Subscriber['status']>('all');
  const [source, setSource] = useState<'local' | 'lb'>('lb');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (source === 'lb') {
      lb.loadSubscribers(601);
    }
  }, [source]);

  useEffect(() => {
    if (source !== 'lb') return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      lb.searchSubscribers(search, 601);
    }, 400);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search, source]);

  const displaySubs: Subscriber[] = source === 'lb'
    ? lb.subscribers.map(lbToSubscriber)
    : localSubs;

  const filtered = displaySubs.filter((s) => {
    if (filter !== 'all' && s.status !== filter) return false;
    if (source === 'local' && search && !`${s.fullName} ${s.contractNumber} ${s.phone} ${s.address}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openCard = (sub: Subscriber) => {
    const lbSub = lb.subscribers.find((s) => (s.id || s.lb_id) === sub.id);
    onOpenPanel(sub.fullName, (
      <SubscriberCard
        sub={sub}
        lbId={lbSub?.lb_id}
        onCreateTicket={onCreateTicket ? () => {
          onClosePanel();
          onCreateTicket({ name: sub.fullName, address: sub.address, phone: sub.phone, lbId: lbSub?.lb_id, contract: sub.contractNumber });
        } : undefined}
      />
    ));
  };

  return (
    <div className="space-y-4">
      {/* Source toggle + sync */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSource('lb')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${source === 'lb' ? 'bg-[#3b82f6] text-white' : 'bg-[#1e2637] text-[#8892a4] hover:text-white'}`}
          >
            <Icon name="Zap" size={12} />
            LightBilling
          </button>
          <button
            onClick={() => setSource('local')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${source === 'local' ? 'bg-[#3b82f6] text-white' : 'bg-[#1e2637] text-[#8892a4] hover:text-white'}`}
          >
            <Icon name="Database" size={12} />
            Локальные
          </button>
        </div>

        {source === 'lb' && (
          <button
            onClick={() => lb.loadSubscribers(601)}
            disabled={lb.loading}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#1e2637] hover:bg-[#252d3d] text-[#8892a4] hover:text-white rounded-lg text-xs transition-colors disabled:opacity-50"
          >
            <Icon name={lb.loading ? 'Loader' : 'RefreshCw'} size={12} className={lb.loading ? 'animate-spin' : ''} />
            {lb.loading ? 'Загрузка...' : 'Обновить'}
          </button>
        )}
      </div>

      {/* Error */}
      {lb.error && source === 'lb' && (
        <div className="flex items-start gap-3 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-xl p-3">
          <Icon name="AlertCircle" size={16} className="text-[#ef4444] flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-medium text-[#ef4444]">Ошибка LightBilling</div>
            <div className="text-xs text-[#8892a4] mt-0.5">{lb.error}</div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Всего абонентов', value: filtered.length, color: 'text-white', icon: 'Users' },
          { label: 'Активных', value: filtered.filter((s) => s.status === 'active').length, color: 'text-[#10b981]', icon: 'UserCheck' },
          { label: 'Приостановлено', value: filtered.filter((s) => s.status === 'suspended').length, color: 'text-[#f59e0b]', icon: 'UserMinus' },
          { label: 'Отключённых', value: filtered.filter((s) => s.status === 'terminated').length, color: 'text-[#ef4444]', icon: 'UserX' },
        ].map((s) => (
          <div key={s.label} className="bg-[#161b27] border border-[#252d3d] rounded-xl p-3">
            <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-[#4b5568] mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4b5568]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={source === 'lb' ? 'Поиск в LightBilling — ФИО, договор, адрес...' : 'ФИО, договор, телефон, адрес...'}
            className="w-full bg-[#1e2637] border border-[#252d3d] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-[#4b5568] focus:outline-none focus:border-[#3b82f6]"
          />
          {lb.loading && source === 'lb' && (
            <Icon name="Loader" size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4b5568] animate-spin" />
          )}
        </div>
        <div className="flex gap-2">
          {(['all', 'active', 'suspended', 'terminated'] as const).map((f) => {
            const labels: Record<string, string> = { all: 'Все', ...STATUS_LABELS };
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f ? 'bg-[#3b82f6] text-white' : 'bg-[#1e2637] text-[#8892a4] hover:text-white'}`}
              >
                {labels[f]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-[#161b27] border border-[#252d3d] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#252d3d]">
              {['Абонент', 'Договор', 'Тариф', 'Адрес', 'Баланс', 'Статус'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#4b5568] uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((sub) => (
              <tr key={sub.id} className="border-b border-[#252d3d] last:border-0 hover:bg-[#1e2637] transition-colors cursor-pointer" onClick={() => openCard(sub)}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#3b82f6]/20 flex items-center justify-center text-xs font-semibold text-[#3b82f6] flex-shrink-0">
                      {sub.fullName.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">{sub.fullName}</div>
                      <div className="text-xs text-[#4b5568]">{sub.phone}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-[#8892a4] font-mono">{sub.contractNumber}</td>
                <td className="px-4 py-3 text-sm text-[#8892a4]">{sub.tariff}</td>
                <td className="px-4 py-3 text-sm text-[#8892a4] max-w-[180px] truncate">{sub.address}</td>
                <td className="px-4 py-3">
                  <span className={`text-sm font-semibold ${sub.balance >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                    {sub.balance >= 0 ? '+' : ''}{sub.balance.toLocaleString('ru-RU')} ₽
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[sub.status]}`}>{STATUS_LABELS[sub.status]}</span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && !lb.loading && (
              <tr><td colSpan={6} className="py-12 text-center text-sm text-[#4b5568]">
                {source === 'lb' ? 'Абоненты не найдены в LightBilling' : 'Абоненты не найдены'}
              </td></tr>
            )}
            {lb.loading && filtered.length === 0 && (
              <tr><td colSpan={6} className="py-12 text-center">
                <div className="flex items-center justify-center gap-2 text-sm text-[#4b5568]">
                  <Icon name="Loader" size={16} className="animate-spin" />
                  Загрузка из LightBilling...
                </div>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {source === 'lb' && lb.total > 0 && (
        <div className="flex items-center justify-center gap-2 text-xs text-[#4b5568]">
          <Icon name="Zap" size={12} className="text-[#3b82f6]" />
          Данные из LightBilling · {lb.total} абонентов загружено
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, highlight }: { label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-[#252d3d] last:border-0">
      <span className="text-xs text-[#4b5568] flex-shrink-0 w-36">{label}</span>
      <span className={`text-sm text-right ${highlight ? 'font-semibold text-white' : 'text-[#8892a4]'}`}>{value}</span>
    </div>
  );
}

function SubscriberCard({ sub, lbId, onCreateTicket }: { sub: Subscriber; lbId?: string; onCreateTicket?: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 pb-4 border-b border-[#252d3d]">
        <div className="w-14 h-14 rounded-full bg-[#3b82f6]/20 flex items-center justify-center text-xl font-bold text-[#3b82f6]">
          {sub.fullName.split(' ').map((n) => n[0]).slice(0, 2).join('')}
        </div>
        <div>
          <h2 className="text-base font-bold text-white">{sub.fullName}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              sub.status === 'active' ? 'bg-[#10b981]/20 text-[#10b981]' :
              sub.status === 'suspended' ? 'bg-[#f59e0b]/20 text-[#f59e0b]' :
              'bg-[#ef4444]/20 text-[#ef4444]'
            }`}>{STATUS_LABELS[sub.status]}</span>
            <span className="text-xs text-[#4b5568]">{sub.contractNumber}</span>
          </div>
        </div>
      </div>

      <div className={`rounded-xl p-4 text-center ${sub.balance >= 0 ? 'bg-[#10b981]/10 border border-[#10b981]/20' : 'bg-[#ef4444]/10 border border-[#ef4444]/20'}`}>
        <div className="text-xs text-[#4b5568] mb-1">Баланс</div>
        <div className={`text-3xl font-bold ${sub.balance >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
          {sub.balance >= 0 ? '+' : ''}{sub.balance.toLocaleString('ru-RU')} ₽
        </div>
      </div>

      <div className="bg-[#0f1117] border border-[#252d3d] rounded-xl px-4 py-2">
        <InfoRow label="Телефон" value={sub.phone} highlight />
        {sub.email && <InfoRow label="Email" value={sub.email} />}
        <InfoRow label="Адрес" value={sub.address} highlight />
        {sub.tariff && <InfoRow label="Тариф" value={sub.tariff} />}
        {sub.connectDate && <InfoRow label="Дата подключения" value={new Date(sub.connectDate).toLocaleDateString('ru-RU')} />}
        {sub.ipAddress && <InfoRow label="IP-адрес" value={<span className="font-mono text-xs">{sub.ipAddress}</span>} />}
      </div>

      {lbId && (
        <div className="flex items-center gap-2 text-xs text-[#4b5568] bg-[#1e2637] border border-[#252d3d] rounded-xl px-3 py-2">
          <Icon name="Zap" size={12} className="text-[#3b82f6]" />
          <span>LightBilling · ID: <span className="text-white font-mono">{lbId}</span></span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button className="flex items-center justify-center gap-2 py-2 bg-[#1e2637] hover:bg-[#252d3d] text-[#8892a4] hover:text-white rounded-lg text-xs transition-colors">
          <Icon name="Phone" size={13} />Позвонить
        </button>
        <button
          onClick={onCreateTicket}
          className="flex items-center justify-center gap-2 py-2 bg-[#3b82f6]/10 hover:bg-[#3b82f6]/20 text-[#3b82f6] rounded-lg text-xs transition-colors border border-[#3b82f6]/20"
        >
          <Icon name="FileText" size={13} />Создать заявку
        </button>
        {lbId && (
          <button
            onClick={() => window.open(`https://api.lightbilling.cloud/manager/?page=users/view&id=${lbId}`, '_blank')}
            className="col-span-2 flex items-center justify-center gap-2 py-2 bg-[#1e2637] hover:bg-[#252d3d] text-[#8892a4] hover:text-white rounded-lg text-xs transition-colors"
          >
            <Icon name="ExternalLink" size={13} />Открыть в LightBilling
          </button>
        )}
      </div>
    </div>
  );
}