import { useState, useEffect, useRef } from 'react';
import { useCRMStore } from '@/store/crmStore';
import { Subscriber, CashRegister } from '@/types/crm';
import Icon from '@/components/ui/icon';
import { useLightBilling, LBSubscriber, LBSubscriberTariff, LBPaymentHistory, LBPromisedFormInfo } from '@/hooks/useLightBilling';

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
  suggestedAmount?: number;
  onSave: (cashRegisterId: string, amount: number) => Promise<boolean | undefined>;
  onCancel: () => void;
}

function TopupForm({ sub, lbId, registers, suggestedAmount, onSave, onCancel }: TopupFormProps) {
  const [cashRegisterId, setCashRegisterId] = useState(registers[0]?.id || '');
  const [amount, setAmount] = useState(suggestedAmount ? String(suggestedAmount) : '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; lbOk?: boolean; msg?: string } | null>(null);
  const presets = [100, 200, 300, 500, 1000];

  const handleSave = async () => {
    const a = parseFloat(amount);
    if (!a || a <= 0) return;
    setLoading(true);
    setResult(null);
    const lbOk = await onSave(cashRegisterId, a);
    setLoading(false);
    setResult({ ok: true, lbOk });
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
          {suggestedAmount && (
            <button onClick={() => setAmount(String(suggestedAmount))} className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-lg text-xs text-emerald-400 font-medium transition-colors">
              {suggestedAmount} ₽ (по тарифу)
            </button>
          )}
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

  const openTopup = (sub: Subscriber, lbId?: string, suggestedAmount?: number) => {
    onOpenPanel(`Пополнение: ${sub.fullName}`, (
      <TopupForm
        sub={sub}
        lbId={lbId}
        registers={offRegisters}
        suggestedAmount={suggestedAmount}
        onSave={async (cashRegisterId, amount) => {
          let lbOk: boolean | undefined;
          if (lbId) {
            const res = await lb.addPayment(
              lbId,
              amount,
              `Пополнение через CRM: ${sub.fullName}`,
              sub.contractNumber,
            );
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
          return lbOk;
        }}
        onCancel={onClosePanel}
      />
    ));
  };

  const openCard = (sub: Subscriber) => {
    const lbSub = lb.subscribers.find((s) => (s.id || s.lb_id) === sub.id);
    const lbId = lbSub?.lb_id;
    const subPayments = cashPayments.filter((p) => p.subscriberId === sub.id && p.type === 'subscriber_payment');
    onOpenPanel(sub.fullName, (
      <SubscriberCard
        sub={sub}
        lbId={lbId}
        crmPayments={subPayments}
        lb={lb}
        onCreateTicket={onCreateTicket ? () => {
          onClosePanel();
          onCreateTicket({ name: sub.fullName, address: sub.address, phone: sub.phone, lbId, contract: sub.contractNumber });
        } : undefined}
        onTopup={(suggestedAmount) => openTopup(sub, lbId, suggestedAmount)}
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

function SubscriberCard({ sub, lbId, onCreateTicket, onTopup, crmPayments, lb }: {
  sub: Subscriber;
  lbId?: string;
  onCreateTicket?: () => void;
  onTopup?: (suggestedAmount?: number) => void;
  crmPayments: import('@/types/crm').CashPayment[];
  lb: ReturnType<typeof useLightBilling>;
}) {
  const [lbTariffs, setLbTariffs] = useState<LBSubscriberTariff[]>([]);
  const [lbPayments, setLbPayments] = useState<LBPaymentHistory[]>([]);
  const [loadingTariffs, setLoadingTariffs] = useState(false);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [promisedLoading, setPromisedLoading] = useState(false);
  const [promisedForm, setPromisedForm] = useState<LBPromisedFormInfo | null>(null);
  const [promisedDays, setPromisedDays] = useState('');
  const [promisedSumm, setPromisedSumm] = useState('');
  const [promisedResult, setPromisedResult] = useState('');
  const [showPromised, setShowPromised] = useState(false);

  useEffect(() => {
    if (!lbId) return;
    setLoadingTariffs(true);
    lb.getSubscriberTariffs(lbId).then(t => { setLbTariffs(t); setLoadingTariffs(false); });
    setLoadingPayments(true);
    lb.getLBPayments(sub.contractNumber, lbId).then(p => { setLbPayments(p); setLoadingPayments(false); });
    // Загружаем форму обещанного платежа
    lb.getPromisedInfo(lbId).then(info => {
      if (info) {
        setPromisedForm(info);
        // Выбираем первый вариант по умолчанию
        if (info.days_options.length > 0) {
          const sel = info.days_options.find(o => o.selected) || info.days_options[0];
          setPromisedDays(sel.value);
        }
      }
    });
  }, [lbId]);

  const tariffSum = lbTariffs.reduce((sum, t) => {
    const price = parseFloat(t.price.replace(/[^\d.]/g, '')) || 0;
    return sum + price;
  }, 0);

  const handlePromised = async () => {
    if (!lbId) return;
    setPromisedLoading(true);
    setPromisedResult('');
    const res = await lb.makePromisedPayment(lbId, promisedDays, promisedSumm || undefined);
    setPromisedLoading(false);
    console.log('[promised]', res);
    setPromisedResult(res.success ? '✓ Обещанный платёж активирован' : 'Ошибка — проверьте LightBilling');
  };

  // Объединяем историю: LB + CRM
  const allPayments = [
    ...lbPayments.map(p => ({
      date: p.date,
      amount: p.amount,
      operator: p.operator || 'LightBilling',
      fromLB: true,
    })),
    ...crmPayments.slice().reverse().map(p => ({
      date: new Date(p.date).toLocaleDateString('ru-RU'),
      amount: String(p.amount),
      operator: 'CRM',
      fromLB: false,
    })),
  ];

  return (
    <div className="space-y-4">
      {/* Шапка */}
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

      {/* Баланс */}
      <div className={`rounded-xl p-4 text-center ${sub.balance >= 0 ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
        <div className="text-xs text-muted-foreground mb-1">Баланс</div>
        <div className={`text-3xl font-bold ${sub.balance >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
          {sub.balance >= 0 ? '+' : ''}{sub.balance.toLocaleString('ru-RU')} ₽
        </div>
        {tariffSum > 0 && (
          <div className="text-xs text-muted-foreground mt-1">Сумма тарифов: {tariffSum.toLocaleString('ru-RU')} ₽/мес</div>
        )}
        <button
          onClick={() => onTopup?.(tariffSum > 0 ? tariffSum : undefined)}
          className="mt-3 flex items-center justify-center gap-2 w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Icon name="Plus" size={14} />Пополнить баланс{tariffSum > 0 ? ` (${tariffSum} ₽)` : ''}
        </button>
      </div>

      {/* Контакты */}
      <div className="bg-muted/50 border border-border rounded-xl px-4 py-2">
        <InfoRow label="Телефон" value={sub.phone} highlight />
        {sub.email && <InfoRow label="Email" value={sub.email} />}
        <InfoRow label="Адрес" value={sub.address} highlight />
        {sub.connectDate && <InfoRow label="Дата подключения" value={new Date(sub.connectDate).toLocaleDateString('ru-RU')} />}
        {sub.ipAddress && <InfoRow label="IP-адрес" value={<span className="font-mono text-xs">{sub.ipAddress}</span>} />}
      </div>

      {/* Тарифы из LB */}
      <div>
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
          <Icon name="Zap" size={12} className="text-primary" />Тарифы LightBilling
          {loadingTariffs && <Icon name="Loader" size={11} className="animate-spin text-muted-foreground" />}
        </div>
        {!lbId ? (
          <div className="text-xs text-muted-foreground py-2">Абонент не связан с LightBilling</div>
        ) : lbTariffs.length === 0 && !loadingTariffs ? (
          <div className="text-xs text-muted-foreground py-2">Тарифы не найдены</div>
        ) : (
          <div className="bg-muted/50 border border-border rounded-xl overflow-hidden">
            {lbTariffs.map((t, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 border-b border-border last:border-0">
                <div>
                  <div className="text-xs text-foreground font-medium">{t.name}</div>
                  {t.date && <div className="text-[10px] text-muted-foreground">{t.date}</div>}
                </div>
                {t.price && <div className="text-xs font-semibold text-emerald-400">{t.price} ₽</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Обещанный платёж */}
      {lbId && (
        <div className="bg-muted/50 border border-border rounded-xl p-3">
          <button
            onClick={() => setShowPromised(v => !v)}
            className="flex items-center justify-between w-full"
          >
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Icon name="Clock" size={12} className="text-[#f59e0b]" />Обещанный платёж
              {promisedForm?.current_promised && (
                <span className="text-[10px] text-[#f59e0b] font-normal normal-case">до {promisedForm.current_promised}</span>
              )}
            </span>
            <Icon name={showPromised ? 'ChevronUp' : 'ChevronDown'} size={14} className="text-muted-foreground" />
          </button>
          {showPromised && (
            <div className="mt-3 space-y-2">
              {/* Количество дней — из опций LB или фиксированные */}
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1 block">Срок</label>
                {promisedForm && promisedForm.days_options.length > 0 ? (
                  <select value={promisedDays} onChange={e => setPromisedDays(e.target.value)} className={inputCls + ' cursor-pointer'}>
                    {promisedForm.days_options.map(o => (
                      <option key={o.value} value={o.value}>{o.label || `${o.value} дней`}</option>
                    ))}
                  </select>
                ) : (
                  <select value={promisedDays} onChange={e => setPromisedDays(e.target.value)} className={inputCls + ' cursor-pointer'}>
                    {['3','5','7','10','14','30'].map(d => <option key={d} value={d}>{d} дней</option>)}
                  </select>
                )}
              </div>
              {/* Поле суммы если LB требует */}
              {(promisedForm?.has_summ_field || promisedForm?.summ_options.length) ? (
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1 block">Сумма</label>
                  {promisedForm.summ_options.length > 0 ? (
                    <select value={promisedSumm} onChange={e => setPromisedSumm(e.target.value)} className={inputCls + ' cursor-pointer'}>
                      <option value="">— Выберите —</option>
                      {promisedForm.summ_options.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  ) : (
                    <input type="number" value={promisedSumm} onChange={e => setPromisedSumm(e.target.value)} className={inputCls} placeholder="Сумма, ₽" />
                  )}
                </div>
              ) : null}
              <button
                onClick={handlePromised}
                disabled={promisedLoading || !promisedDays}
                className="w-full py-2 bg-[#f59e0b] hover:bg-[#d97706] disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5"
              >
                {promisedLoading ? <Icon name="Loader" size={13} className="animate-spin" /> : <Icon name="Clock" size={13} />}
                Активировать обещанный платёж
              </button>
              {promisedResult && (
                <div className={`text-xs px-3 py-2 rounded-lg ${promisedResult.startsWith('✓') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                  {promisedResult}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Кнопки */}
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

      {/* История пополнений */}
      <div>
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
          История пополнений
          {loadingPayments && <Icon name="Loader" size={11} className="animate-spin text-muted-foreground" />}
        </div>
        {allPayments.length === 0 && !loadingPayments ? (
          <div className="text-center text-xs text-muted-foreground py-3">История пополнений пуста</div>
        ) : (
          <div className="bg-muted/50 border border-border rounded-xl overflow-hidden">
            {allPayments.slice(0, 30).map((p, i) => {
              const amountNum = parseFloat(p.amount.replace(',', '.').replace(/\s/g, ''));
              const isNeg = amountNum < 0;
              return (
                <div key={i} className="flex items-center justify-between px-3 py-2.5 border-b border-border last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${p.fromLB ? 'bg-[#3b82f6]/20' : 'bg-emerald-500/20'}`}>
                      <Icon name={p.fromLB ? 'Zap' : 'ArrowDownLeft'} size={11} className={p.fromLB ? 'text-[#3b82f6]' : 'text-emerald-500'} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs text-foreground">{p.date}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{p.operator}</div>
                    </div>
                  </div>
                  <div className={`text-sm font-bold flex-shrink-0 ml-2 ${isNeg ? 'text-red-400' : 'text-emerald-500'}`}>
                    {!isNeg ? '+' : ''}{p.amount} ₽
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}