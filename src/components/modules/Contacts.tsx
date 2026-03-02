import { useState, useEffect, useRef } from 'react';
import { useCRMStore } from '@/store/crmStore';
import { Subscriber, CashRegister } from '@/types/crm';
import Icon from '@/components/ui/icon';
import { useLightBilling, LBSubscriber } from '@/hooks/useLightBilling';

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
const inputCls = "w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors";
const selectCls = `${inputCls} cursor-pointer`;

const STATUS_LABELS: Record<Subscriber['status'], string> = { active: 'Активен', suspended: 'Приостановлен', terminated: 'Отключён' };
const STATUS_COLORS: Record<Subscriber['status'], string> = { active: 'bg-[#10b981]/20 text-[#10b981]', suspended: 'bg-[#f59e0b]/20 text-[#f59e0b]', terminated: 'bg-[#ef4444]/20 text-[#ef4444]' };

interface Props {
  onOpenPanel: (title: string, content: React.ReactNode) => void;
  onClosePanel: () => void;
  onCreateTicket?: (sub: { name: string; address: string; phone: string; lbId?: string; contract?: string }) => void;
}

interface TopupFormProps {
  sub: Subscriber;
  lbId?: string;
  registers: CashRegister[];
  onSave: (cashRegisterId: string, amount: number) => Promise<void>;
  onCancel: () => void;
}

function TopupForm({ sub, lbId, registers, onSave, onCancel }: TopupFormProps) {
  const [cashRegisterId, setCashRegisterId] = useState(registers[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; lbOk?: boolean; msg?: string } | null>(null);
  const presets = [100, 200, 300, 500, 1000];

  const handleSave = async () => {
    const a = parseFloat(amount);
    if (!a || a <= 0) return;
    setLoading(true);
    setResult(null);
    await onSave(cashRegisterId, a);
    setLoading(false);
  };

  if (result?.ok) {
    return (
      <div className="space-y-4 text-center py-6">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
          <Icon name="CheckCircle2" size={32} className="text-emerald-500" />
        </div>
        <div>
          <div className="text-base font-bold text-foreground">Баланс пополнен!</div>
          <div className="text-sm text-muted-foreground mt-1">+{parseFloat(amount).toLocaleString('ru-RU')} ₽</div>
          {result.lbOk && <div className="text-xs text-emerald-500 mt-1 flex items-center justify-center gap-1"><Icon name="Zap" size={12} />Платёж прошёл в LightBilling</div>}
          {result.lbOk === false && <div className="text-xs text-amber-500 mt-1 flex items-center justify-center gap-1"><Icon name="AlertTriangle" size={12} />Только в CRM (LB недоступен)</div>}
        </div>
        <button onClick={onCancel} className="w-full py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium">Закрыть</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className={`rounded-xl p-3 text-center ${sub.balance >= 0 ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
        <div className="text-xs text-muted-foreground mb-1">Текущий баланс</div>
        <div className={`text-2xl font-bold ${sub.balance >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
          {sub.balance >= 0 ? '+' : ''}{sub.balance.toLocaleString('ru-RU')} ₽
        </div>
      </div>
      {lbId && (
        <div className="flex items-center gap-2 text-xs text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
          <Icon name="Zap" size={12} />Платёж уйдёт в LightBilling (ID: {lbId})
        </div>
      )}
      {!lbId && (
        <div className="flex items-center gap-2 text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
          <Icon name="AlertTriangle" size={12} />Абонент не связан с LB — платёж только в CRM
        </div>
      )}
      <div><label className="block text-xs font-medium text-muted-foreground mb-1.5">Касса</label>
        <select value={cashRegisterId} onChange={(e) => setCashRegisterId(e.target.value)} className={selectCls}>
          {registers.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>
      <div><label className="block text-xs font-medium text-muted-foreground mb-1.5">Сумма пополнения, ₽</label>
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} placeholder="0" min="0" />
        <div className="flex gap-2 mt-2 flex-wrap">
          {presets.map((p) => (
            <button key={p} onClick={() => setAmount(String(p))} className="px-3 py-1 bg-muted hover:bg-accent rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors">{p} ₽</button>
          ))}
        </div>
      </div>
      {amount && parseFloat(amount) > 0 && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
          <div className="text-xs text-muted-foreground">Баланс после пополнения</div>
          <div className="text-xl font-bold text-emerald-500">+{(sub.balance + parseFloat(amount)).toLocaleString('ru-RU')} ₽</div>
        </div>
      )}
      <div className="flex gap-3 pt-4 border-t border-border">
        <button
          onClick={handleSave}
          disabled={!amount || parseFloat(amount) <= 0 || loading}
          className="flex-1 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading && <Icon name="Loader" size={14} className="animate-spin" />}
          {loading ? 'Проводим...' : 'Пополнить баланс'}
        </button>
        <button onClick={onCancel} disabled={loading} className="px-4 py-2 bg-muted text-muted-foreground rounded-lg text-sm">Отмена</button>
      </div>
    </div>
  );
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
  const { subscribers: localSubs, cashRegisters, cashPayments, currentOfficeId, addCashPayment, updateSubscriber } = useCRMStore();
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

  const offRegisters = cashRegisters.filter((r) => r.officeId === currentOfficeId);
  const todayStr = new Date().toISOString().split('T')[0];

  const openTopup = (sub: Subscriber, lbId?: string) => {
    onOpenPanel(`Пополнение: ${sub.fullName}`, (
      <TopupForm
        sub={sub}
        lbId={lbId}
        registers={offRegisters}
        onSave={async (cashRegisterId, amount) => {
          let lbOk: boolean | undefined;
          if (lbId) {
            const res = await lb.addPayment(lbId, amount, `Пополнение через CRM: ${sub.fullName} (${sub.contractNumber})`);
            lbOk = res.success;
          }
          addCashPayment({
            id: uid(),
            officeId: currentOfficeId,
            cashRegisterId,
            type: 'subscriber_payment',
            amount,
            direction: 'in',
            description: `Пополнение баланса: ${sub.fullName} (${sub.contractNumber})`,
            subscriberId: sub.id,
            subscriberName: sub.fullName,
            comment: lbId ? `LB ID: ${lbId}` : undefined,
            date: todayStr,
            createdAt: new Date().toISOString(),
          });
          updateSubscriber(sub.id, { balance: sub.balance + amount });
          void lbOk;
        }}
        onCancel={onClosePanel}
      />
    ));
  };

  const openCard = (sub: Subscriber) => {
    const lbSub = lb.subscribers.find((s) => (s.id || s.lb_id) === sub.id);
    const subPayments = cashPayments.filter((p) => p.subscriberId === sub.id && p.type === 'subscriber_payment');
    onOpenPanel(sub.fullName, (
      <SubscriberCard
        sub={sub}
        lbId={lbSub?.lb_id}
        payments={subPayments}
        onCreateTicket={onCreateTicket ? () => {
          onClosePanel();
          onCreateTicket({ name: sub.fullName, address: sub.address, phone: sub.phone, lbId: lbSub?.lb_id, contract: sub.contractNumber });
        } : undefined}
        onTopup={() => openTopup(sub, lbSub?.lb_id)}
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
    <div className="flex items-start justify-between py-2.5 border-b border-border last:border-0">
      <span className="text-xs text-muted-foreground flex-shrink-0 w-36">{label}</span>
      <span className={`text-sm text-right ${highlight ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>{value}</span>
    </div>
  );
}

function SubscriberCard({ sub, lbId, onCreateTicket, onTopup, payments }: { sub: Subscriber; lbId?: string; onCreateTicket?: () => void; onTopup?: () => void; payments: import('@/types/crm').CashPayment[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 pb-4 border-b border-border">
        <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-xl font-bold text-primary">
          {sub.fullName.split(' ').map((n) => n[0]).slice(0, 2).join('')}
        </div>
        <div>
          <h2 className="text-base font-bold text-foreground">{sub.fullName}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[sub.status]}`}>{STATUS_LABELS[sub.status]}</span>
            <span className="text-xs text-muted-foreground">{sub.contractNumber}</span>
          </div>
        </div>
      </div>

      <div className={`rounded-xl p-4 text-center ${sub.balance >= 0 ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
        <div className="text-xs text-muted-foreground mb-1">Баланс</div>
        <div className={`text-3xl font-bold ${sub.balance >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
          {sub.balance >= 0 ? '+' : ''}{sub.balance.toLocaleString('ru-RU')} ₽
        </div>
        <button
          onClick={onTopup}
          className="mt-3 flex items-center justify-center gap-2 w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Icon name="Plus" size={14} />Пополнить баланс
        </button>
      </div>

      <div className="bg-muted/50 border border-border rounded-xl px-4 py-2">
        <InfoRow label="Телефон" value={sub.phone} highlight />
        {sub.email && <InfoRow label="Email" value={sub.email} />}
        <InfoRow label="Адрес" value={sub.address} highlight />
        {sub.tariff && <InfoRow label="Тариф" value={sub.tariff} />}
        {sub.connectDate && <InfoRow label="Дата подключения" value={new Date(sub.connectDate).toLocaleDateString('ru-RU')} />}
        {sub.ipAddress && <InfoRow label="IP-адрес" value={<span className="font-mono text-xs">{sub.ipAddress}</span>} />}
      </div>

      {lbId && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted border border-border rounded-xl px-3 py-2">
          <Icon name="Zap" size={12} className="text-primary" />
          <span>LightBilling · ID: <span className="text-foreground font-mono">{lbId}</span></span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button className="flex items-center justify-center gap-2 py-2 bg-muted hover:bg-accent text-muted-foreground hover:text-foreground rounded-lg text-xs transition-colors">
          <Icon name="Phone" size={13} />Позвонить
        </button>
        <button
          onClick={onCreateTicket}
          className="flex items-center justify-center gap-2 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs transition-colors border border-primary/20"
        >
          <Icon name="FileText" size={13} />Создать заявку
        </button>
        {lbId && (
          <button
            onClick={() => window.open(`https://api.lightbilling.cloud/manager/?page=users/view&id=${lbId}`, '_blank')}
            className="col-span-2 flex items-center justify-center gap-2 py-2 bg-muted hover:bg-accent text-muted-foreground hover:text-foreground rounded-lg text-xs transition-colors"
          >
            <Icon name="ExternalLink" size={13} />Открыть в LightBilling
          </button>
        )}
      </div>

      {payments.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">История пополнений</div>
          <div className="bg-muted/50 border border-border rounded-xl overflow-hidden">
            {payments.slice().reverse().map((p) => (
              <div key={p.id} className="flex items-center justify-between px-3 py-2.5 border-b border-border last:border-0">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <Icon name="ArrowDownLeft" size={11} className="text-emerald-500" />
                  </div>
                  <div>
                    <div className="text-xs text-foreground">{new Date(p.date).toLocaleDateString('ru-RU')}</div>
                    {p.comment && <div className="text-xs text-muted-foreground">{p.comment}</div>}
                  </div>
                </div>
                <div className="text-sm font-bold text-emerald-500">+{p.amount.toLocaleString('ru-RU')} ₽</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {payments.length === 0 && (
        <div className="text-center text-xs text-muted-foreground py-3">История пополнений пуста</div>
      )}
    </div>
  );
}