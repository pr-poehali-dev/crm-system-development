import { useState } from 'react';
import { useCRMStore } from '@/store/crmStore';
import { CashRegister, Sale, SaleItem, CashPayment } from '@/types/crm';
import Icon from '@/components/ui/icon';

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

const inputCls = "w-full bg-[#0f1117] border border-[#252d3d] rounded-lg px-3 py-2 text-sm text-white placeholder-[#4b5568] focus:outline-none focus:border-[#3b82f6] transition-colors";
const selectCls = `${inputCls} cursor-pointer`;

interface Props {
  onOpenPanel: (title: string, content: React.ReactNode) => void;
  onClosePanel: () => void;
}

const PAY_LABELS: Record<Sale['paymentMethod'], string> = { cash: 'Наличные', card: 'Карта', transfer: 'Перевод' };
const PAY_ICONS: Record<Sale['paymentMethod'], string> = { cash: 'Banknote', card: 'CreditCard', transfer: 'ArrowLeftRight' };

const PAYMENT_TYPE_LABELS: Record<CashPayment['type'], string> = {
  subscriber_payment: 'Пополнение',
  sale: 'Продажа',
  collection: 'Инкассация',
  expense: 'Выплата',
  refund: 'Возврат',
};
const PAYMENT_TYPE_COLORS: Record<CashPayment['type'], string> = {
  subscriber_payment: 'bg-[#3b82f6]/20 text-[#3b82f6]',
  sale: 'bg-[#10b981]/20 text-[#10b981]',
  collection: 'bg-[#8b5cf6]/20 text-[#8b5cf6]',
  expense: 'bg-[#ef4444]/20 text-[#ef4444]',
  refund: 'bg-[#f59e0b]/20 text-[#f59e0b]',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs font-medium text-[#8892a4] mb-1.5 uppercase tracking-wide">{label}</label>{children}</div>;
}

/* ─── Панель деталей платежа ─── */
function PaymentDetailPanel({ row, sale, registers, employees, onClose }: {
  row: { id: string; type: CashPayment['type']; date: string; amount: number; direction: 'in' | 'out'; description: string; customer: string; cashRegisterId: string; payMethod: string; status: string };
  sale?: Sale;
  registers: CashRegister[];
  employees: ReturnType<typeof useCRMStore>['employees'];
  onClose: () => void;
}) {
  const reg = registers.find(r => r.id === row.cashRegisterId);
  const emp = sale ? employees.find(e => e.id === sale.employeeId) : null;

  return (
    <div className="space-y-5">
      {/* Сумма */}
      <div className={`rounded-xl p-4 text-center ${row.direction === 'in' ? 'bg-[#10b981]/10 border border-[#10b981]/20' : 'bg-[#ef4444]/10 border border-[#ef4444]/20'}`}>
        <div className="text-xs text-[#8892a4] mb-1">{PAYMENT_TYPE_LABELS[row.type]}</div>
        <div className={`text-3xl font-bold ${row.direction === 'in' ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
          {row.direction === 'in' ? '+' : '−'}{row.amount.toLocaleString('ru-RU')} ₽
        </div>
        <div className="text-xs text-[#4b5568] mt-1">{new Date(row.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
      </div>

      {/* Инфо */}
      <div className="space-y-3">
        {row.customer && (
          <div className="flex items-center gap-3 p-3 bg-[#161b27] rounded-xl border border-[#252d3d]">
            <div className="w-9 h-9 rounded-full bg-[#3b82f6]/20 flex items-center justify-center flex-shrink-0">
              <Icon name="User" size={16} className="text-[#3b82f6]" />
            </div>
            <div>
              <div className="text-xs text-[#4b5568]">Клиент / Абонент</div>
              <div className="text-sm font-medium text-white">{row.customer}</div>
            </div>
          </div>
        )}
        {sale && (
          <div className="bg-[#161b27] border border-[#252d3d] rounded-xl p-3 space-y-2">
            <div className="text-xs text-[#4b5568] font-semibold uppercase mb-2">Состав продажи</div>
            {sale.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-white">{item.productName}</span>
                <span className="text-[#8892a4]">{item.quantity} × {item.price.toLocaleString('ru-RU')} ₽ = <b className="text-[#10b981]">{item.amount.toLocaleString('ru-RU')} ₽</b></span>
              </div>
            ))}
            <div className="pt-2 border-t border-[#252d3d] flex justify-between">
              <span className="text-sm text-[#8892a4]">Итого</span>
              <span className="text-base font-bold text-[#10b981]">{sale.totalAmount.toLocaleString('ru-RU')} ₽</span>
            </div>
          </div>
        )}
        {[
          reg && { icon: 'CreditCard', label: 'Касса', value: reg.name },
          row.payMethod && { icon: PAY_ICONS[sale?.paymentMethod || 'cash'], label: 'Оплата', value: row.payMethod },
          emp && { icon: 'UserCheck', label: 'Сотрудник', value: `${emp.lastName} ${emp.firstName}` },
        ].filter(Boolean).map((item: unknown) => {
          const it = item as { icon: string; label: string; value: string };
          return (
            <div key={it.label} className="flex items-center justify-between p-3 bg-[#161b27] rounded-xl border border-[#252d3d]">
              <div className="flex items-center gap-2 text-[#8892a4]">
                <Icon name={it.icon} size={14} />
                <span className="text-xs">{it.label}</span>
              </div>
              <span className="text-sm text-white">{it.value}</span>
            </div>
          );
        })}
        <div className="flex items-center justify-between p-3 bg-[#161b27] rounded-xl border border-[#252d3d]">
          <div className="flex items-center gap-2 text-[#8892a4]">
            <Icon name="Tag" size={14} />
            <span className="text-xs">Тип операции</span>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full ${PAYMENT_TYPE_COLORS[row.type]}`}>{PAYMENT_TYPE_LABELS[row.type]}</span>
        </div>
      </div>

      <button onClick={onClose} className="w-full py-2.5 bg-[#1e2637] hover:bg-[#252d3d] text-[#8892a4] hover:text-white rounded-xl text-sm transition-colors">
        Закрыть
      </button>
    </div>
  );
}

/* ─── Панель деталей продажи ─── */
function SaleDetailPanel({ sale, registers, employees, products, onClose, onProvide }: {
  sale: Sale;
  registers: CashRegister[];
  employees: ReturnType<typeof useCRMStore>['employees'];
  products: ReturnType<typeof useCRMStore>['products'];
  onClose: () => void;
  onProvide: (saleId: string) => void;
}) {
  const reg = registers.find(r => r.id === sale.cashRegisterId);
  const emp = employees.find(e => e.id === sale.employeeId);
  const statusLabel: Record<Sale['status'], string> = { completed: 'Проведена', precheck: 'Пречек', refunded: 'Возврат', cancelled: 'Отменена' };
  const statusColor: Record<Sale['status'], string> = {
    completed: 'bg-[#10b981]/20 text-[#10b981]',
    precheck: 'bg-[#f59e0b]/20 text-[#f59e0b]',
    refunded: 'bg-[#8b5cf6]/20 text-[#8b5cf6]',
    cancelled: 'bg-[#ef4444]/20 text-[#ef4444]',
  };

  return (
    <div className="space-y-5">
      <div className={`rounded-xl p-4 text-center ${sale.status === 'precheck' ? 'bg-[#f59e0b]/10 border border-[#f59e0b]/20' : 'bg-[#10b981]/10 border border-[#10b981]/20'}`}>
        <div className="text-xs text-[#8892a4] mb-1">Продажа · {new Date(sale.date).toLocaleDateString('ru-RU')}</div>
        <div className={`text-3xl font-bold ${sale.status === 'precheck' ? 'text-[#f59e0b]' : 'text-[#10b981]'}`}>
          {sale.totalAmount.toLocaleString('ru-RU')} ₽
        </div>
        <span className={`mt-2 inline-flex text-xs px-2 py-0.5 rounded-full ${statusColor[sale.status]}`}>{statusLabel[sale.status]}</span>
      </div>

      {sale.customerName && (
        <div className="flex items-center gap-3 p-3 bg-[#161b27] rounded-xl border border-[#252d3d]">
          <div className="w-9 h-9 rounded-full bg-[#3b82f6]/20 flex items-center justify-center flex-shrink-0">
            <Icon name="User" size={16} className="text-[#3b82f6]" />
          </div>
          <div>
            <div className="text-xs text-[#4b5568]">Покупатель</div>
            <div className="text-sm font-medium text-white">{sale.customerName}</div>
            {sale.customerPhone && <div className="text-xs text-[#4b5568]">{sale.customerPhone}</div>}
          </div>
        </div>
      )}

      <div className="bg-[#161b27] border border-[#252d3d] rounded-xl p-3 space-y-2">
        <div className="text-xs text-[#4b5568] font-semibold uppercase mb-2">Товары</div>
        {sale.items.map((item, i) => {
          const prod = products.find(p => p.id === item.productId);
          return (
            <div key={i} className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="text-sm text-white">{item.productName}</div>
                {prod?.isSerial && <div className="text-[10px] text-[#3b82f6] font-mono">Серийный</div>}
              </div>
              <div className="text-right text-sm">
                <span className="text-[#8892a4]">{item.quantity} × {item.price.toLocaleString('ru-RU')} ₽</span>
                <div className="font-bold text-[#10b981]">{item.amount.toLocaleString('ru-RU')} ₽</div>
              </div>
            </div>
          );
        })}
        <div className="pt-2 border-t border-[#252d3d] flex justify-between">
          <span className="text-sm text-[#8892a4]">Итого</span>
          <span className="text-lg font-bold text-[#10b981]">{sale.totalAmount.toLocaleString('ru-RU')} ₽</span>
        </div>
      </div>

      {[
        reg && { icon: 'CreditCard', label: 'Касса', value: reg.name },
        { icon: PAY_ICONS[sale.paymentMethod], label: 'Способ оплаты', value: PAY_LABELS[sale.paymentMethod] },
        emp && { icon: 'UserCheck', label: 'Сотрудник', value: `${emp.lastName} ${emp.firstName}` },
      ].filter(Boolean).map((item: unknown) => {
        const it = item as { icon: string; label: string; value: string };
        return (
          <div key={it.label} className="flex items-center justify-between p-3 bg-[#161b27] rounded-xl border border-[#252d3d]">
            <div className="flex items-center gap-2 text-[#8892a4]">
              <Icon name={it.icon} size={14} />
              <span className="text-xs">{it.label}</span>
            </div>
            <span className="text-sm text-white">{it.value}</span>
          </div>
        );
      })}

      <div className="flex gap-2 pt-2">
        {sale.status === 'precheck' && (
          <button
            onClick={() => { onProvide(sale.id); onClose(); }}
            className="flex-1 py-2.5 bg-[#10b981] hover:bg-[#059669] text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Icon name="CheckCircle2" size={16} />Провести
          </button>
        )}
        <button onClick={onClose} className="flex-1 py-2.5 bg-[#1e2637] hover:bg-[#252d3d] text-[#8892a4] hover:text-white rounded-xl text-sm transition-colors">
          Закрыть
        </button>
      </div>
    </div>
  );
}

/* ─── Форма продажи ─── */
interface SaleFormProps {
  form: { cashRegisterId: string; customerName: string; customerPhone: string; paymentMethod: Sale['paymentMethod']; employeeId: string };
  items: SaleItem[];
  onChange: (f: SaleFormProps['form']) => void;
  onItemsChange: (items: SaleItem[]) => void;
  registers: CashRegister[];
  employees: ReturnType<typeof useCRMStore>['employees'];
  products: ReturnType<typeof useCRMStore>['products'];
  total: number;
  onSave: (asPrecheck: boolean) => void;
  onCancel: () => void;
}

function SaleForm({ form, items, onChange, onItemsChange, registers, employees, products, total, onSave, onCancel }: SaleFormProps) {
  const addItem = (productId: string) => {
    const p = products.find(pr => pr.id === productId);
    if (!p) return;
    const existing = items.find(i => i.productId === productId);
    if (existing) {
      onItemsChange(items.map(i => i.productId === productId ? { ...i, quantity: i.quantity + 1, amount: (i.quantity + 1) * i.price } : i));
    } else {
      onItemsChange([...items, { productId: p.id, productName: p.name, quantity: 1, price: p.price, amount: p.price }]);
    }
  };
  const removeItem = (productId: string) => onItemsChange(items.filter(i => i.productId !== productId));
  const changeQty = (productId: string, qty: number) => {
    if (qty <= 0) { removeItem(productId); return; }
    onItemsChange(items.map(i => i.productId === productId ? { ...i, quantity: qty, amount: qty * i.price } : i));
  };

  return (
    <div className="space-y-4">
      <Field label="Касса">
        <select value={form.cashRegisterId} onChange={e => onChange({ ...form, cashRegisterId: e.target.value })} className={selectCls}>
          {registers.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Клиент">
          <input value={form.customerName} onChange={e => onChange({ ...form, customerName: e.target.value })} className={inputCls} placeholder="ФИО" />
        </Field>
        <Field label="Телефон">
          <input value={form.customerPhone} onChange={e => onChange({ ...form, customerPhone: e.target.value })} className={inputCls} placeholder="+7..." />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Способ оплаты">
          <select value={form.paymentMethod} onChange={e => onChange({ ...form, paymentMethod: e.target.value as Sale['paymentMethod'] })} className={selectCls}>
            {Object.entries(PAY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Сотрудник">
          <select value={form.employeeId} onChange={e => onChange({ ...form, employeeId: e.target.value })} className={selectCls}>
            <option value="">Выберите</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.lastName} {e.firstName}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Добавить товар">
        <select onChange={e => { addItem(e.target.value); e.target.value = ''; }} className={selectCls} defaultValue="">
          <option value="">Выбрать товар...</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.name} — {p.price.toLocaleString('ru-RU')} ₽/{p.unit}</option>)}
        </select>
      </Field>

      {items.length > 0 && (
        <div className="space-y-2 bg-[#161b27] border border-[#252d3d] rounded-xl p-3">
          {items.map(item => (
            <div key={item.productId} className="flex items-center gap-2">
              <span className="text-sm text-white flex-1 truncate">{item.productName}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => changeQty(item.productId, item.quantity - 1)} className="w-6 h-6 rounded bg-[#252d3d] text-[#8892a4] hover:text-white flex items-center justify-center"><Icon name="Minus" size={12} /></button>
                <span className="text-sm font-medium text-white w-6 text-center">{item.quantity}</span>
                <button onClick={() => changeQty(item.productId, item.quantity + 1)} className="w-6 h-6 rounded bg-[#252d3d] text-[#8892a4] hover:text-white flex items-center justify-center"><Icon name="Plus" size={12} /></button>
              </div>
              <span className="text-sm font-bold text-[#10b981] w-20 text-right">{item.amount.toLocaleString('ru-RU')} ₽</span>
              <button onClick={() => removeItem(item.productId)} className="text-[#4b5568] hover:text-[#ef4444]"><Icon name="X" size={14} /></button>
            </div>
          ))}
          <div className="flex justify-between items-center pt-2 border-t border-[#252d3d]">
            <span className="text-sm font-semibold text-white">Итого</span>
            <span className="text-xl font-bold text-[#10b981]">{total.toLocaleString('ru-RU')} ₽</span>
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-2 border-t border-[#252d3d]">
        <button
          onClick={() => onSave(false)}
          disabled={items.length === 0}
          className="flex-1 py-2.5 bg-[#10b981] hover:bg-[#059669] disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          <Icon name="CheckCircle2" size={16} />Провести
        </button>
        <button
          onClick={() => onSave(true)}
          disabled={items.length === 0}
          className="flex-1 py-2.5 bg-[#f59e0b] hover:bg-[#d97706] disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          <Icon name="FileText" size={16} />Пречек
        </button>
        <button onClick={onCancel} className="px-4 py-2.5 bg-[#1e2637] text-[#8892a4] rounded-xl text-sm transition-colors">Отмена</button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   ГЛАВНЫЙ КОМПОНЕНТ
══════════════════════════════════════════ */
export default function Cash({ onOpenPanel, onClosePanel }: Props) {
  const {
    currentOfficeId, cashRegisters, sales, employees, products, subscribers,
    cashPayments, expenseCategories,
    addCashRegister, deleteCashRegister, addSale, updateSale, addCashPayment,
    addExpenseCategory, deleteExpenseCategory,
  } = useCRMStore();

  const [tab, setTab] = useState<'payments' | 'sales'>('payments');
  const [filterReg, setFilterReg] = useState<string>('all');

  const offRegisters = cashRegisters.filter(r => r.officeId === currentOfficeId);
  const offSales = sales.filter(s => s.officeId === currentOfficeId);
  const offPayments = cashPayments.filter(p => p.officeId === currentOfficeId);
  const todayStr = new Date().toISOString().split('T')[0];

  // Статистика касс
  const completedSales = offSales.filter(s => s.status === 'completed');
  const todayRevenue = completedSales.filter(s => s.date === todayStr).reduce((sum, s) => sum + s.totalAmount, 0)
    + offPayments.filter(p => p.date === todayStr && p.direction === 'in').reduce((sum, p) => sum + p.amount, 0);
  const totalIncome = completedSales.reduce((sum, s) => sum + s.totalAmount, 0)
    + offPayments.filter(p => p.direction === 'in').reduce((sum, p) => sum + p.amount, 0);
  const totalExpense = offPayments.filter(p => p.direction === 'out').reduce((sum, p) => sum + p.amount, 0);
  const balance = totalIncome - totalExpense;

  // Балансы касс
  const getRegBalance = (regId: string) => {
    const regSales = offSales.filter(s => s.cashRegisterId === regId && s.status === 'completed').reduce((s, x) => s + x.totalAmount, 0);
    const regIn = offPayments.filter(p => p.cashRegisterId === regId && p.direction === 'in').reduce((s, p) => s + p.amount, 0);
    const regOut = offPayments.filter(p => p.cashRegisterId === regId && p.direction === 'out').reduce((s, p) => s + p.amount, 0);
    return regSales + regIn - regOut;
  };

  // Все строки платежей объединённые
  const allPaymentRows = [
    ...offSales.filter(s => s.status !== 'precheck').map(s => ({
      id: s.id,
      date: s.date,
      type: 'sale' as CashPayment['type'],
      direction: s.status === 'refunded' ? 'out' : 'in' as 'in' | 'out',
      amount: s.totalAmount,
      description: `Продажа: ${s.items.map(i => i.productName).join(', ')}`,
      customer: s.customerName,
      cashRegisterId: s.cashRegisterId,
      payMethod: PAY_LABELS[s.paymentMethod],
      status: s.status,
      saleRef: s,
    })),
    ...offPayments.map(p => ({
      id: p.id,
      date: p.date,
      type: p.type,
      direction: p.direction,
      amount: p.amount,
      description: p.description,
      customer: p.subscriberName || '',
      cashRegisterId: p.cashRegisterId,
      payMethod: '',
      status: 'completed' as string,
      saleRef: undefined as Sale | undefined,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  const filteredRows = filterReg === 'all' ? allPaymentRows : allPaymentRows.filter(r => r.cashRegisterId === filterReg);

  const openPaymentDetail = (row: typeof allPaymentRows[0]) => {
    onOpenPanel(PAYMENT_TYPE_LABELS[row.type], (
      <PaymentDetailPanel
        row={row}
        sale={row.saleRef}
        registers={offRegisters}
        employees={employees}
        onClose={onClosePanel}
      />
    ));
  };

  const openSaleDetail = (sale: Sale) => {
    onOpenPanel(`Продажа от ${new Date(sale.date).toLocaleDateString('ru-RU')}`, (
      <SaleDetailPanel
        sale={sale}
        registers={offRegisters}
        employees={employees}
        products={products}
        onClose={onClosePanel}
        onProvide={(saleId) => {
          updateSale(saleId, { status: 'completed' });
          addCashPayment({
            id: uid(),
            officeId: currentOfficeId,
            cashRegisterId: sale.cashRegisterId,
            type: 'sale',
            amount: sale.totalAmount,
            direction: 'in',
            description: `Продажа: ${sale.items.map(i => i.productName).join(', ')}`,
            saleId,
            date: todayStr,
            createdAt: new Date().toISOString(),
          });
        }}
      />
    ));
  };

  const openSaleForm = () => {
    const items: SaleItem[] = [];
    let form = { cashRegisterId: offRegisters[0]?.id || '', customerName: '', customerPhone: '', paymentMethod: 'cash' as Sale['paymentMethod'], employeeId: '' };
    const render = () => {
      const total = items.reduce((s, i) => s + i.amount, 0);
      onOpenPanel('Новая продажа', (
        <SaleForm
          form={form}
          items={[...items]}
          onChange={f => { form = f; render(); }}
          onItemsChange={newItems => { items.length = 0; items.push(...newItems); render(); }}
          registers={offRegisters}
          employees={employees.filter(e => e.status === 'active')}
          products={products}
          total={total}
          onSave={(asPrecheck) => {
            if (items.length === 0) return;
            const saleId = uid();
            const status: Sale['status'] = asPrecheck ? 'precheck' : 'completed';
            addSale({
              id: saleId,
              officeId: currentOfficeId,
              ...form,
              items: [...items],
              totalAmount: total,
              status,
              date: todayStr,
              createdAt: new Date().toISOString(),
              subscriberId: undefined,
            });
            if (!asPrecheck) {
              addCashPayment({
                id: uid(),
                officeId: currentOfficeId,
                cashRegisterId: form.cashRegisterId,
                type: 'sale',
                amount: total,
                direction: 'in',
                description: `Продажа: ${items.map(i => i.productName).join(', ')}`,
                saleId,
                date: todayStr,
                createdAt: new Date().toISOString(),
              });
            }
            onClosePanel();
          }}
          onCancel={onClosePanel}
        />
      ));
    };
    render();
  };

  const openCollectionForm = () => {
    const form = { cashRegisterId: offRegisters[0]?.id || '', amount: '', comment: '' };
    const save = () => {
      const amount = parseFloat(form.amount);
      if (!amount || amount <= 0) return;
      addCashPayment({ id: uid(), officeId: currentOfficeId, cashRegisterId: form.cashRegisterId, type: 'collection', amount, direction: 'out', description: 'Инкассация', comment: form.comment, date: todayStr, createdAt: new Date().toISOString() });
      onClosePanel();
    };
    onOpenPanel('Инкассация', (
      <div className="space-y-4">
        <Field label="Касса">
          <select defaultValue={form.cashRegisterId} onChange={e => { form.cashRegisterId = e.target.value; }} className={selectCls}>
            {offRegisters.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </Field>
        <Field label="Сумма, ₽">
          <input type="number" defaultValue="" onChange={e => { form.amount = e.target.value; }} className={inputCls} placeholder="0" min="0" />
        </Field>
        <Field label="Комментарий">
          <textarea defaultValue="" onChange={e => { form.comment = e.target.value; }} className={inputCls} rows={3} placeholder="Причина..." />
        </Field>
        <div className="flex gap-3 pt-4 border-t border-[#252d3d]">
          <button onClick={save} className="flex-1 py-2 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white rounded-lg text-sm font-medium">Провести инкассацию</button>
          <button onClick={onClosePanel} className="px-4 py-2 bg-[#1e2637] text-[#8892a4] rounded-lg text-sm">Отмена</button>
        </div>
      </div>
    ));
  };

  const openExpenseForm = () => {
    const form = { cashRegisterId: offRegisters[0]?.id || '', amount: '', expenseCategoryId: expenseCategories[0]?.id || '', description: '' };
    const save = () => {
      const amount = parseFloat(form.amount);
      if (!amount || amount <= 0 || !form.expenseCategoryId) return;
      const cat = expenseCategories.find(c => c.id === form.expenseCategoryId);
      addCashPayment({ id: uid(), officeId: currentOfficeId, cashRegisterId: form.cashRegisterId, type: 'expense', amount, direction: 'out', description: form.description || cat?.name || 'Выплата', expenseCategoryId: form.expenseCategoryId, date: todayStr, createdAt: new Date().toISOString() });
      onClosePanel();
    };
    onOpenPanel('Выплата из кассы', (
      <div className="space-y-4">
        <Field label="Касса">
          <select defaultValue={form.cashRegisterId} onChange={e => { form.cashRegisterId = e.target.value; }} className={selectCls}>
            {offRegisters.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </Field>
        <Field label="Статья расходов">
          <select defaultValue={form.expenseCategoryId} onChange={e => { form.expenseCategoryId = e.target.value; }} className={selectCls}>
            <option value="">Выберите...</option>
            {expenseCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Сумма, ₽">
          <input type="number" defaultValue="" onChange={e => { form.amount = e.target.value; }} className={inputCls} placeholder="0" min="0" />
        </Field>
        <Field label="Описание">
          <input defaultValue="" onChange={e => { form.description = e.target.value; }} className={inputCls} placeholder="Уточните назначение..." />
        </Field>
        <div className="flex gap-3 pt-4 border-t border-[#252d3d]">
          <button onClick={save} className="flex-1 py-2 bg-[#ef4444] hover:bg-[#dc2626] text-white rounded-lg text-sm font-medium">Провести выплату</button>
          <button onClick={onClosePanel} className="px-4 py-2 bg-[#1e2637] text-[#8892a4] rounded-lg text-sm">Отмена</button>
        </div>
      </div>
    ));
  };

  const openRegisterForm = () => {
    const form = { name: '' };
    const save = () => { if (!form.name) return; addCashRegister({ id: uid(), officeId: currentOfficeId, name: form.name, isActive: true }); onClosePanel(); };
    onOpenPanel('Новая касса', (
      <div className="space-y-4">
        <Field label="Название кассы">
          <input defaultValue="" onChange={e => { form.name = e.target.value; }} className={inputCls} placeholder="Касса 1" />
        </Field>
        <div className="flex gap-3 pt-4 border-t border-[#252d3d]">
          <button onClick={save} className="flex-1 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-sm font-medium">Создать</button>
          <button onClick={onClosePanel} className="px-4 py-2 bg-[#1e2637] text-[#8892a4] rounded-lg text-sm">Отмена</button>
        </div>
      </div>
    ));
  };

  return (
    <div className="space-y-4">
      {/* Кассы (дашборд) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Приход сегодня', value: `${todayRevenue.toLocaleString('ru-RU')} ₽`, icon: 'TrendingUp', color: 'text-[#10b981]', bg: 'bg-[#10b981]/10' },
          { label: 'Всего приход', value: `${totalIncome.toLocaleString('ru-RU')} ₽`, icon: 'Wallet', color: 'text-[#3b82f6]', bg: 'bg-[#3b82f6]/10' },
          { label: 'Всего расход', value: `${totalExpense.toLocaleString('ru-RU')} ₽`, icon: 'TrendingDown', color: 'text-[#ef4444]', bg: 'bg-[#ef4444]/10' },
          { label: 'Баланс', value: `${balance.toLocaleString('ru-RU')} ₽`, icon: 'CircleDollarSign', color: balance >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]', bg: balance >= 0 ? 'bg-[#10b981]/10' : 'bg-[#ef4444]/10' },
        ].map(s => (
          <div key={s.label} className="bg-[#161b27] border border-[#252d3d] rounded-xl p-4">
            <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center mb-2`}><Icon name={s.icon} size={16} className={s.color} /></div>
            <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-[#4b5568] mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Кассы (балансы) */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {offRegisters.map(reg => {
          const bal = getRegBalance(reg.id);
          return (
            <div key={reg.id} className="bg-[#161b27] border border-[#252d3d] rounded-xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#3b82f6]/10 flex items-center justify-center flex-shrink-0">
                <Icon name="CreditCard" size={16} className="text-[#3b82f6]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-[#4b5568] truncate">{reg.name}</div>
                <div className={`text-base font-bold ${bal >= 0 ? 'text-white' : 'text-[#ef4444]'}`}>{bal.toLocaleString('ru-RU')} ₽</div>
              </div>
              <button onClick={() => deleteCashRegister(reg.id)} className="p-1.5 hover:bg-[#ef4444]/10 rounded text-[#4b5568] hover:text-[#ef4444] flex-shrink-0">
                <Icon name="Trash2" size={12} />
              </button>
            </div>
          );
        })}
        <button onClick={openRegisterForm} className="border-2 border-dashed border-[#252d3d] hover:border-[#3b82f6] rounded-xl p-3 flex items-center gap-3 text-[#4b5568] hover:text-white transition-colors">
          <Icon name="Plus" size={16} />
          <span className="text-sm">Добавить кассу</span>
        </button>
      </div>

      {/* Вкладки + кнопки действий */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1 bg-[#161b27] border border-[#252d3d] rounded-xl p-1">
          {([
            { id: 'payments', label: 'Все платежи', icon: 'List' },
            { id: 'sales', label: 'Продажи', icon: 'ShoppingCart' },
          ] as const).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${tab === t.id ? 'bg-[#3b82f6] text-white' : 'text-[#8892a4] hover:text-white'}`}>
              <Icon name={t.icon} size={13} />{t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 ml-auto">
          <button onClick={openCollectionForm} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#8b5cf6]/20 hover:bg-[#8b5cf6]/30 text-[#8b5cf6] rounded-lg text-xs font-medium transition-colors">
            <Icon name="ArrowDownToLine" size={13} />Инкассация
          </button>
          <button onClick={openExpenseForm} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ef4444]/20 hover:bg-[#ef4444]/30 text-[#ef4444] rounded-lg text-xs font-medium transition-colors">
            <Icon name="ArrowUpFromLine" size={13} />Выплата
          </button>
          <button onClick={openSaleForm} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#10b981] hover:bg-[#059669] text-white rounded-lg text-xs font-medium transition-colors">
            <Icon name="Plus" size={13} />Новая продажа
          </button>
        </div>
      </div>

      {/* Платежи */}
      {tab === 'payments' && (
        <>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setFilterReg('all')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterReg === 'all' ? 'bg-[#3b82f6] text-white' : 'bg-[#1e2637] text-[#8892a4] hover:text-white'}`}>Все кассы</button>
            {offRegisters.map(r => (
              <button key={r.id} onClick={() => setFilterReg(r.id)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterReg === r.id ? 'bg-[#3b82f6] text-white' : 'bg-[#1e2637] text-[#8892a4] hover:text-white'}`}>{r.name}</button>
            ))}
          </div>
          <div className="bg-[#161b27] border border-[#252d3d] rounded-xl overflow-hidden">
            {filteredRows.length === 0 ? (
              <div className="py-12 text-center text-sm text-[#4b5568]">Нет операций</div>
            ) : filteredRows.map(row => {
              const reg = cashRegisters.find(r => r.id === row.cashRegisterId);
              return (
                <div
                  key={row.id}
                  onClick={() => openPaymentDetail(row)}
                  className="flex items-center gap-4 px-4 py-3 border-b border-[#252d3d] last:border-0 hover:bg-[#1e2637] cursor-pointer transition-colors"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${PAYMENT_TYPE_COLORS[row.type]}`}>
                    <Icon name={row.direction === 'in' ? 'ArrowDownLeft' : 'ArrowUpRight'} size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{row.description}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${PAYMENT_TYPE_COLORS[row.type]}`}>{PAYMENT_TYPE_LABELS[row.type]}</span>
                      {row.customer && <span className="text-xs text-[#4b5568] truncate">{row.customer}</span>}
                      {reg && <span className="text-xs text-[#4b5568]">· {reg.name}</span>}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={`text-sm font-bold ${row.direction === 'in' ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                      {row.direction === 'in' ? '+' : '−'}{row.amount.toLocaleString('ru-RU')} ₽
                    </div>
                    <div className="text-xs text-[#4b5568]">{new Date(row.date).toLocaleDateString('ru-RU')}</div>
                  </div>
                  <Icon name="ChevronRight" size={14} className="text-[#252d3d] flex-shrink-0" />
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Продажи */}
      {tab === 'sales' && (
        <div className="bg-[#161b27] border border-[#252d3d] rounded-xl overflow-hidden">
          {offSales.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#4b5568]">Нет продаж</div>
          ) : offSales.slice().reverse().map(sale => {
            const statusLabel: Record<Sale['status'], string> = { completed: 'Проведена', precheck: 'Пречек', refunded: 'Возврат', cancelled: 'Отменена' };
            const statusColor: Record<Sale['status'], string> = {
              completed: 'bg-[#10b981]/20 text-[#10b981]',
              precheck: 'bg-[#f59e0b]/20 text-[#f59e0b]',
              refunded: 'bg-[#8b5cf6]/20 text-[#8b5cf6]',
              cancelled: 'bg-[#ef4444]/20 text-[#ef4444]',
            };
            return (
              <div
                key={sale.id}
                onClick={() => openSaleDetail(sale)}
                className="flex items-center gap-4 px-4 py-3 border-b border-[#252d3d] last:border-0 hover:bg-[#1e2637] cursor-pointer transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-[#10b981]/10 flex items-center justify-center flex-shrink-0">
                  <Icon name="ShoppingCart" size={14} className="text-[#10b981]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">{sale.items.map(i => i.productName).join(', ')}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusColor[sale.status]}`}>{statusLabel[sale.status]}</span>
                    {sale.customerName && <span className="text-xs text-[#4b5568] truncate">{sale.customerName}</span>}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-bold text-[#10b981]">{sale.totalAmount.toLocaleString('ru-RU')} ₽</div>
                  <div className="text-xs text-[#4b5568]">{new Date(sale.date).toLocaleDateString('ru-RU')}</div>
                </div>
                {sale.status === 'precheck' && (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      updateSale(sale.id, { status: 'completed' });
                      addCashPayment({
                        id: uid(), officeId: currentOfficeId, cashRegisterId: sale.cashRegisterId,
                        type: 'sale', amount: sale.totalAmount, direction: 'in',
                        description: `Продажа: ${sale.items.map(i => i.productName).join(', ')}`,
                        saleId: sale.id, date: todayStr, createdAt: new Date().toISOString(),
                      });
                    }}
                    className="px-2 py-1 bg-[#10b981] hover:bg-[#059669] text-white rounded-lg text-xs font-medium transition-colors flex-shrink-0"
                  >
                    Провести
                  </button>
                )}
                <Icon name="ChevronRight" size={14} className="text-[#252d3d] flex-shrink-0" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
