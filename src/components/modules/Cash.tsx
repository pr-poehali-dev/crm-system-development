import { useState } from 'react';
import { useCRMStore } from '@/store/crmStore';
import { CashRegister, Sale, SaleItem, CashPayment, ExpenseCategory } from '@/types/crm';
import Icon from '@/components/ui/icon';

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

const inputCls = "w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors";
const selectCls = `${inputCls} cursor-pointer`;

interface Props {
  onOpenPanel: (title: string, content: React.ReactNode) => void;
  onClosePanel: () => void;
}

const PAY_LABELS: Record<Sale['paymentMethod'], string> = { cash: 'Наличные', card: 'Карта', transfer: 'Перевод' };
const PAYMENT_TYPE_LABELS: Record<CashPayment['type'], string> = {
  subscriber_payment: 'Пополнение баланса',
  sale: 'Продажа',
  collection: 'Инкассация',
  expense: 'Выплата',
  refund: 'Возврат',
};
const PAYMENT_TYPE_COLORS: Record<CashPayment['type'], string> = {
  subscriber_payment: 'bg-blue-500/20 text-blue-400',
  sale: 'bg-emerald-500/20 text-emerald-400',
  collection: 'bg-purple-500/20 text-purple-400',
  expense: 'bg-red-500/20 text-red-400',
  refund: 'bg-amber-500/20 text-amber-400',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>{children}</div>;
}

function FormActions({ onSave, onCancel, saveLabel = 'Сохранить' }: { onSave: () => void; onCancel: () => void; saveLabel?: string }) {
  return (
    <div className="flex gap-3 pt-4 border-t border-border">
      <button onClick={onSave} className="flex-1 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium">{saveLabel}</button>
      <button onClick={onCancel} className="px-4 py-2 bg-muted text-muted-foreground rounded-lg text-sm">Отмена</button>
    </div>
  );
}

interface SaleFormProps {
  form: { cashRegisterId: string; customerName: string; paymentMethod: Sale['paymentMethod']; employeeId: string };
  items: SaleItem[];
  onChange: (f: SaleFormProps['form']) => void;
  onItemsChange: (items: SaleItem[]) => void;
  registers: CashRegister[];
  employees: { id: string; firstName: string; lastName: string }[];
  products: { id: string; name: string; price: number; unit: string }[];
  subscribers: { id: string; fullName: string }[];
  total: number;
  onSave: () => void;
  onCancel: () => void;
}

function SaleForm({ form, items, onChange, onItemsChange, registers, employees, products, total, onSave, onCancel }: SaleFormProps) {
  const addItem = (productId: string) => {
    const p = products.find((pr) => pr.id === productId);
    if (!p) return;
    const existing = items.find((i) => i.productId === productId);
    if (existing) {
      onItemsChange(items.map((i) => i.productId === productId ? { ...i, quantity: i.quantity + 1, amount: (i.quantity + 1) * i.price } : i));
    } else {
      onItemsChange([...items, { productId: p.id, productName: p.name, quantity: 1, price: p.price, amount: p.price }]);
    }
  };
  const removeItem = (productId: string) => onItemsChange(items.filter((i) => i.productId !== productId));
  const changeQty = (productId: string, qty: number) => {
    if (qty <= 0) { removeItem(productId); return; }
    onItemsChange(items.map((i) => i.productId === productId ? { ...i, quantity: qty, amount: qty * i.price } : i));
  };

  return (
    <div className="space-y-4">
      <Field label="Касса">
        <select defaultValue={form.cashRegisterId} onChange={(e) => onChange({ ...form, cashRegisterId: e.target.value })} className={selectCls}>
          {registers.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </Field>
      <Field label="Клиент">
        <input defaultValue={form.customerName} onChange={(e) => onChange({ ...form, customerName: e.target.value })} className={inputCls} placeholder="ФИО клиента" />
      </Field>
      <Field label="Способ оплаты">
        <select defaultValue={form.paymentMethod} onChange={(e) => onChange({ ...form, paymentMethod: e.target.value as Sale['paymentMethod'] })} className={selectCls}>
          {Object.entries(PAY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </Field>
      <Field label="Сотрудник">
        <select defaultValue={form.employeeId} onChange={(e) => onChange({ ...form, employeeId: e.target.value })} className={selectCls}>
          <option value="">Выберите сотрудника</option>
          {employees.map((e) => <option key={e.id} value={e.id}>{e.lastName} {e.firstName}</option>)}
        </select>
      </Field>
      <Field label="Добавить товар">
        <select onChange={(e) => { addItem(e.target.value); e.target.value = ''; }} className={selectCls} defaultValue="">
          <option value="">Выбрать товар...</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.price} ₽/{p.unit}</option>)}
        </select>
      </Field>
      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.productId} className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
              <span className="text-sm text-foreground flex-1 truncate">{item.productName}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => changeQty(item.productId, item.quantity - 1)} className="w-6 h-6 rounded flex items-center justify-center bg-background text-muted-foreground hover:text-foreground"><Icon name="Minus" size={12} /></button>
                <span className="text-sm font-medium text-foreground w-6 text-center">{item.quantity}</span>
                <button onClick={() => changeQty(item.productId, item.quantity + 1)} className="w-6 h-6 rounded flex items-center justify-center bg-background text-muted-foreground hover:text-foreground"><Icon name="Plus" size={12} /></button>
              </div>
              <span className="text-sm font-bold text-emerald-500 w-20 text-right">{item.amount.toLocaleString('ru-RU')} ₽</span>
              <button onClick={() => removeItem(item.productId)} className="text-muted-foreground hover:text-red-400"><Icon name="X" size={14} /></button>
            </div>
          ))}
          <div className="flex justify-between items-center px-3 py-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
            <span className="text-sm font-semibold text-foreground">Итого</span>
            <span className="text-lg font-bold text-emerald-500">{total.toLocaleString('ru-RU')} ₽</span>
          </div>
        </div>
      )}
      <FormActions onSave={onSave} onCancel={onCancel} saveLabel="Провести продажу" />
    </div>
  );
}

export default function Cash({ onOpenPanel, onClosePanel }: Props) {
  const {
    currentOfficeId, cashRegisters, sales, employees, products, subscribers,
    cashPayments, expenseCategories,
    addCashRegister, deleteCashRegister, addSale, addCashPayment,
    addExpenseCategory, deleteExpenseCategory,
  } = useCRMStore();
  const [tab, setTab] = useState<'payments' | 'sales' | 'registers' | 'expense_cats'>('payments');
  const [filterReg, setFilterReg] = useState<string>('all');

  const offRegisters = cashRegisters.filter((r) => r.officeId === currentOfficeId);
  const offSales = sales.filter((s) => s.officeId === currentOfficeId);
  const offPayments = cashPayments.filter((p) => p.officeId === currentOfficeId);
  const todayStr = new Date().toISOString().split('T')[0];

  const completedSales = offSales.filter((s) => s.status === 'completed');
  const todayRevenue = completedSales.filter((s) => s.date === todayStr).reduce((sum, s) => sum + s.totalAmount, 0)
    + offPayments.filter((p) => p.date === todayStr && p.direction === 'in').reduce((sum, p) => sum + p.amount, 0);
  const totalIncome = completedSales.reduce((sum, s) => sum + s.totalAmount, 0)
    + offPayments.filter((p) => p.direction === 'in').reduce((sum, p) => sum + p.amount, 0);
  const totalExpense = offPayments.filter((p) => p.direction === 'out').reduce((sum, p) => sum + p.amount, 0);

  const allPaymentRows = [
    ...offSales.map((s) => ({
      id: s.id,
      date: s.date,
      type: 'sale' as CashPayment['type'],
      direction: s.status === 'refunded' ? 'out' : 'in' as 'in' | 'out',
      amount: s.totalAmount,
      description: `Продажа: ${s.items.map((i) => i.productName).join(', ')}`,
      customer: s.customerName,
      cashRegisterId: s.cashRegisterId,
      payMethod: PAY_LABELS[s.paymentMethod],
      status: s.status,
    })),
    ...offPayments.map((p) => ({
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
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  const filteredRows = filterReg === 'all' ? allPaymentRows : allPaymentRows.filter((r) => r.cashRegisterId === filterReg);

  const openSaleForm = () => {
    const items: SaleItem[] = [];
    let form = { cashRegisterId: offRegisters[0]?.id || '', customerName: '', paymentMethod: 'cash' as Sale['paymentMethod'], employeeId: '' };
    const render = () => {
      const total = items.reduce((s, i) => s + i.amount, 0);
      onOpenPanel('Новая продажа', (
        <SaleForm
          form={form}
          items={items}
          onChange={(f) => { form = f; render(); }}
          onItemsChange={(newItems) => { items.length = 0; items.push(...newItems); render(); }}
          registers={offRegisters}
          employees={employees.filter((e) => e.status === 'active')}
          products={products}
          subscribers={subscribers}
          total={total}
          onSave={() => {
            if (items.length === 0) return;
            const saleId = uid();
            addSale({ id: saleId, officeId: currentOfficeId, ...form, items: [...items], totalAmount: total, status: 'completed', date: todayStr, createdAt: new Date().toISOString(), subscriberId: undefined });
            addCashPayment({ id: uid(), officeId: currentOfficeId, cashRegisterId: form.cashRegisterId, type: 'sale', amount: total, direction: 'in', description: `Продажа: ${items.map((i) => i.productName).join(', ')}`, saleId, date: todayStr, createdAt: new Date().toISOString() });
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
          <select defaultValue={form.cashRegisterId} onChange={(e) => { form.cashRegisterId = e.target.value; }} className={selectCls}>
            {offRegisters.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </Field>
        <Field label="Сумма инкассации, ₽">
          <input type="number" defaultValue="" onChange={(e) => { form.amount = e.target.value; }} className={inputCls} placeholder="0" min="0" />
        </Field>
        <Field label="Комментарий">
          <textarea defaultValue="" onChange={(e) => { form.comment = e.target.value; }} className={inputCls} rows={3} placeholder="Причина инкассации..." />
        </Field>
        <FormActions onSave={save} onCancel={onClosePanel} saveLabel="Провести инкассацию" />
      </div>
    ));
  };

  const openExpenseForm = () => {
    const form = { cashRegisterId: offRegisters[0]?.id || '', amount: '', expenseCategoryId: expenseCategories[0]?.id || '', description: '', payMethod: 'cash' as Sale['paymentMethod'] };
    const save = () => {
      const amount = parseFloat(form.amount);
      if (!amount || amount <= 0 || !form.expenseCategoryId) return;
      const cat = expenseCategories.find((c) => c.id === form.expenseCategoryId);
      addCashPayment({ id: uid(), officeId: currentOfficeId, cashRegisterId: form.cashRegisterId, type: 'expense', amount, direction: 'out', description: form.description || cat?.name || 'Выплата', expenseCategoryId: form.expenseCategoryId, date: todayStr, createdAt: new Date().toISOString() });
      onClosePanel();
    };
    onOpenPanel('Выплата из кассы', (
      <div className="space-y-4">
        <Field label="Касса">
          <select defaultValue={form.cashRegisterId} onChange={(e) => { form.cashRegisterId = e.target.value; }} className={selectCls}>
            {offRegisters.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </Field>
        <Field label="Статья расходов">
          <select defaultValue={form.expenseCategoryId} onChange={(e) => { form.expenseCategoryId = e.target.value; }} className={selectCls}>
            <option value="">Выберите статью...</option>
            {expenseCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Сумма, ₽">
          <input type="number" defaultValue="" onChange={(e) => { form.amount = e.target.value; }} className={inputCls} placeholder="0" min="0" />
        </Field>
        <Field label="Описание">
          <input defaultValue="" onChange={(e) => { form.description = e.target.value; }} className={inputCls} placeholder="Уточните назначение..." />
        </Field>
        <FormActions onSave={save} onCancel={onClosePanel} saveLabel="Провести выплату" />
      </div>
    ));
  };

  const openRegisterForm = () => {
    const form = { name: '' };
    const save = () => { if (!form.name) return; addCashRegister({ id: uid(), officeId: currentOfficeId, name: form.name, isActive: true }); onClosePanel(); };
    onOpenPanel('Новая касса', (
      <div className="space-y-4">
        <Field label="Название кассы">
          <input defaultValue="" onChange={(e) => { form.name = e.target.value; }} className={inputCls} placeholder="Касса 1" />
        </Field>
        <FormActions onSave={save} onCancel={onClosePanel} />
      </div>
    ));
  };

  const openExpenseCatForm = () => {
    const form = { name: '', description: '' };
    const save = () => { if (!form.name) return; addExpenseCategory({ id: uid(), name: form.name, description: form.description }); onClosePanel(); };
    onOpenPanel('Новая статья расходов', (
      <div className="space-y-4">
        <Field label="Название">
          <input defaultValue="" onChange={(e) => { form.name = e.target.value; }} className={inputCls} placeholder="Например: Реклама" />
        </Field>
        <Field label="Описание">
          <input defaultValue="" onChange={(e) => { form.description = e.target.value; }} className={inputCls} placeholder="Краткое описание..." />
        </Field>
        <FormActions onSave={save} onCancel={onClosePanel} />
      </div>
    ));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Приход сегодня', value: `${todayRevenue.toLocaleString('ru-RU')} ₽`, icon: 'TrendingUp', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Всего приход', value: `${totalIncome.toLocaleString('ru-RU')} ₽`, icon: 'Wallet', color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'Всего расход', value: `${totalExpense.toLocaleString('ru-RU')} ₽`, icon: 'TrendingDown', color: 'text-red-500', bg: 'bg-red-500/10' },
          { label: 'Касс', value: offRegisters.length, icon: 'CreditCard', color: 'text-amber-500', bg: 'bg-amber-500/10' },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center mb-2`}><Icon name={s.icon} size={16} className={s.color} /></div>
            <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 border-b border-border pb-3 flex-wrap">
        {([
          { id: 'payments', label: 'Все платежи', icon: 'List' },
          { id: 'sales', label: 'Продажи', icon: 'ShoppingCart' },
          { id: 'registers', label: 'Кассы', icon: 'CreditCard' },
          { id: 'expense_cats', label: 'Статьи расходов', icon: 'Tag' },
        ] as const).map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${tab === t.id ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}>
            <Icon name={t.icon} size={14} />{t.label}
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          {tab === 'payments' && (
            <>
              <button onClick={openCollectionForm} className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg text-sm font-medium transition-colors"><Icon name="ArrowDownToLine" size={14} />Инкассация</button>
              <button onClick={openExpenseForm} className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors"><Icon name="ArrowUpFromLine" size={14} />Выплата</button>
            </>
          )}
          {tab === 'sales' && <button onClick={openSaleForm} className="flex items-center gap-2 px-4 py-1.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium transition-colors"><Icon name="Plus" size={14} />Новая продажа</button>}
          {tab === 'registers' && <button onClick={openRegisterForm} className="flex items-center gap-2 px-4 py-1.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium transition-colors"><Icon name="Plus" size={14} />Добавить кассу</button>}
          {tab === 'expense_cats' && <button onClick={openExpenseCatForm} className="flex items-center gap-2 px-4 py-1.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium transition-colors"><Icon name="Plus" size={14} />Добавить статью</button>}
        </div>
      </div>

      {tab === 'payments' && (
        <>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setFilterReg('all')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterReg === 'all' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>Все кассы</button>
            {offRegisters.map((r) => (
              <button key={r.id} onClick={() => setFilterReg(r.id)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterReg === r.id ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>{r.name}</button>
            ))}
          </div>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b border-border">
                {['Дата', 'Тип', 'Описание', 'Касса', 'Направление', 'Сумма'].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}
              </tr></thead>
              <tbody>
                {filteredRows.map((row) => {
                  const reg = cashRegisters.find((r) => r.id === row.cashRegisterId);
                  return (
                    <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(row.date).toLocaleDateString('ru-RU')}</td>
                      <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${PAYMENT_TYPE_COLORS[row.type]}`}>{PAYMENT_TYPE_LABELS[row.type]}</span></td>
                      <td className="px-4 py-3 text-sm text-foreground max-w-xs truncate">{row.description}{row.customer ? <span className="text-muted-foreground ml-1">({row.customer})</span> : null}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{reg?.name || '—'}</td>
                      <td className="px-4 py-3">
                        <div className={`flex items-center gap-1 text-xs font-medium ${row.direction === 'in' ? 'text-emerald-500' : 'text-red-400'}`}>
                          <Icon name={row.direction === 'in' ? 'ArrowDownLeft' : 'ArrowUpRight'} size={12} />
                          {row.direction === 'in' ? 'Приход' : 'Расход'}
                        </div>
                      </td>
                      <td className={`px-4 py-3 text-sm font-bold ${row.direction === 'in' ? 'text-emerald-500' : 'text-red-400'}`}>
                        {row.direction === 'in' ? '+' : '−'}{row.amount.toLocaleString('ru-RU')} ₽
                      </td>
                    </tr>
                  );
                })}
                {filteredRows.length === 0 && <tr><td colSpan={6} className="py-12 text-center text-sm text-muted-foreground">Нет операций</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'sales' && (
        <>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b border-border">
                {['Дата', 'Клиент', 'Товары', 'Оплата', 'Сумма', 'Статус'].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}
              </tr></thead>
              <tbody>
                {offSales.slice().reverse().map((sale) => (
                  <tr key={sale.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(sale.date).toLocaleDateString('ru-RU')}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{sale.customerName || '—'}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate">{sale.items.map((i) => i.productName).join(', ')}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{PAY_LABELS[sale.paymentMethod]}</td>
                    <td className="px-4 py-3 text-sm font-bold text-emerald-500">{sale.totalAmount.toLocaleString('ru-RU')} ₽</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${sale.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : sale.status === 'refunded' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>
                        {sale.status === 'completed' ? 'Выполнена' : sale.status === 'refunded' ? 'Возврат' : 'Отменена'}
                      </span>
                    </td>
                  </tr>
                ))}
                {offSales.length === 0 && <tr><td colSpan={6} className="py-12 text-center text-sm text-muted-foreground">Нет продаж</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'registers' && (
        <div className="grid grid-cols-2 gap-3">
          {offRegisters.map((reg) => {
            const regPayments = allPaymentRows.filter((r) => r.cashRegisterId === reg.id);
            const regBalance = regPayments.reduce((sum, r) => r.direction === 'in' ? sum + r.amount : sum - r.amount, 0);
            return (
              <div key={reg.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-semibold text-foreground text-sm">{reg.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{regPayments.length} операций</div>
                  </div>
                  <button onClick={() => deleteCashRegister(reg.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors"><Icon name="Trash2" size={14} /></button>
                </div>
                <div className={`text-xl font-bold ${regBalance >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>{regBalance.toLocaleString('ru-RU')} ₽</div>
                <div className="text-xs text-muted-foreground mt-0.5">Остаток в кассе</div>
              </div>
            );
          })}
          {offRegisters.length === 0 && <div className="col-span-2 py-12 text-center text-sm text-muted-foreground">Нет касс</div>}
        </div>
      )}

      {tab === 'expense_cats' && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b border-border">
              {['Статья расходов', 'Описание', 'Сумма выплат', ''].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}
            </tr></thead>
            <tbody>
              {expenseCategories.map((cat) => {
                const total = offPayments.filter((p) => p.type === 'expense' && p.expenseCategoryId === cat.id).reduce((sum, p) => sum + p.amount, 0);
                return (
                  <tr key={cat.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{cat.name}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{cat.description || '—'}</td>
                    <td className="px-4 py-3 text-sm font-bold text-red-400">{total > 0 ? `${total.toLocaleString('ru-RU')} ₽` : '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => deleteExpenseCategory(cat.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors"><Icon name="Trash2" size={14} /></button>
                    </td>
                  </tr>
                );
              })}
              {expenseCategories.length === 0 && <tr><td colSpan={4} className="py-12 text-center text-sm text-muted-foreground">Нет статей расходов</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
