import { useState } from 'react';
import { useCRMStore } from '@/store/crmStore';
import { CashRegister, Sale, SaleItem } from '@/types/crm';
import Icon from '@/components/ui/icon';

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
const inputCls = "w-full bg-[#0f1117] border border-[#252d3d] rounded-lg px-3 py-2 text-sm text-white placeholder-[#4b5568] focus:outline-none focus:border-[#3b82f6] transition-colors";
const selectCls = `${inputCls} cursor-pointer`;

interface Props {
  onOpenPanel: (title: string, content: React.ReactNode) => void;
  onClosePanel: () => void;
}

const STATUS_LABELS: Record<Sale['status'], string> = { completed: 'Выполнена', refunded: 'Возврат', cancelled: 'Отменена' };
const PAY_LABELS: Record<Sale['paymentMethod'], string> = { cash: 'Наличные', card: 'Карта', transfer: 'Перевод' };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs font-medium text-[#8892a4] mb-1.5">{label}</label>{children}</div>;
}

export default function Cash({ onOpenPanel, onClosePanel }: Props) {
  const { currentOfficeId, cashRegisters, sales, employees, products, subscribers, addCashRegister, deleteCashRegister, addSale } = useCRMStore();
  const [tab, setTab] = useState<'sales' | 'registers'>('sales');
  const [filter, setFilter] = useState<'all' | Sale['status']>('all');

  const offRegisters = cashRegisters.filter((r) => r.officeId === currentOfficeId);
  const offSales = sales.filter((s) => s.officeId === currentOfficeId);
  const filteredSales = filter === 'all' ? offSales : offSales.filter((s) => s.status === filter);
  const todayStr = new Date().toISOString().split('T')[0];
  const todayRevenue = offSales.filter((s) => s.date === todayStr && s.status === 'completed').reduce((sum, s) => sum + s.totalAmount, 0);
  const monthRevenue = offSales.filter((s) => s.status === 'completed').reduce((sum, s) => sum + s.totalAmount, 0);

  const openSaleForm = () => {
    const items: SaleItem[] = [];
    let form = { cashRegisterId: offRegisters[0]?.id || '', customerName: '', paymentMethod: 'cash' as Sale['paymentMethod'], employeeId: '' };

    const render = () => {
      const total = items.reduce((s, i) => s + i.amount, 0);
      onOpenPanel('Новая продажа', (
        <SaleForm
          form={form}
          items={items}
          onChange={(f) => { form = f; }}
          onItemsChange={(newItems) => { items.length = 0; items.push(...newItems); render(); }}
          registers={offRegisters}
          employees={employees.filter((e) => e.status === 'active')}
          products={products}
          subscribers={subscribers}
          total={total}
          onSave={() => {
            if (items.length === 0) return;
            addSale({ id: uid(), officeId: currentOfficeId, ...form, items: [...items], totalAmount: total, status: 'completed', date: todayStr, createdAt: new Date().toISOString(), subscriberId: undefined });
            onClosePanel();
          }}
          onCancel={onClosePanel}
        />
      ));
    };
    render();
  };

  const openRegisterForm = () => {
    const form = { name: '' };
    const save = () => { addCashRegister({ id: uid(), officeId: currentOfficeId, name: form.name, isActive: true }); onClosePanel(); };
    onOpenPanel('Новая касса', (
      <div className="space-y-4">
        <Field label="Название кассы"><input defaultValue="" onChange={(e) => { form.name = e.target.value; }} className={inputCls} placeholder="Касса 1" /></Field>
        <div className="flex gap-3 pt-4 border-t border-[#252d3d]">
          <button onClick={save} className="flex-1 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-sm font-medium">Сохранить</button>
          <button onClick={onClosePanel} className="px-4 py-2 bg-[#1e2637] text-[#8892a4] rounded-lg text-sm">Отмена</button>
        </div>
      </div>
    ));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Выручка сегодня', value: `${todayRevenue.toLocaleString('ru-RU')} ₽`, icon: 'TrendingUp', color: 'text-[#10b981]', bg: 'bg-[#10b981]/10' },
          { label: 'Всего выручка', value: `${monthRevenue.toLocaleString('ru-RU')} ₽`, icon: 'Wallet', color: 'text-[#3b82f6]', bg: 'bg-[#3b82f6]/10' },
          { label: 'Продаж', value: offSales.filter((s) => s.status === 'completed').length, icon: 'ShoppingCart', color: 'text-[#f59e0b]', bg: 'bg-[#f59e0b]/10' },
        ].map((s) => (
          <div key={s.label} className="bg-[#161b27] border border-[#252d3d] rounded-xl p-4">
            <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center mb-2`}><Icon name={s.icon} size={16} className={s.color} /></div>
            <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-[#4b5568] mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 border-b border-[#252d3d] pb-3">
        <button onClick={() => setTab('sales')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${tab === 'sales' ? 'bg-[#3b82f6] text-white' : 'text-[#8892a4] hover:text-white hover:bg-[#1e2637]'}`}><Icon name="Receipt" size={14} />Продажи</button>
        <button onClick={() => setTab('registers')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${tab === 'registers' ? 'bg-[#3b82f6] text-white' : 'text-[#8892a4] hover:text-white hover:bg-[#1e2637]'}`}><Icon name="CreditCard" size={14} />Кассы</button>
        <div className="ml-auto flex gap-2">
          {tab === 'sales' && <button onClick={openSaleForm} className="flex items-center gap-2 px-4 py-1.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-sm font-medium transition-colors"><Icon name="Plus" size={14} />Новая продажа</button>}
          {tab === 'registers' && <button onClick={openRegisterForm} className="flex items-center gap-2 px-4 py-1.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-sm font-medium transition-colors"><Icon name="Plus" size={14} />Добавить кассу</button>}
        </div>
      </div>

      {tab === 'sales' && (
        <>
          <div className="flex gap-2">
            {(['all', 'completed', 'refunded', 'cancelled'] as const).map((f) => {
              const labels: Record<string, string> = { all: 'Все', ...STATUS_LABELS };
              return <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f ? 'bg-[#3b82f6] text-white' : 'bg-[#1e2637] text-[#8892a4] hover:text-white'}`}>{labels[f]}</button>;
            })}
          </div>
          <div className="bg-[#161b27] border border-[#252d3d] rounded-xl overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b border-[#252d3d]">
                {['Дата', 'Клиент', 'Товары', 'Оплата', 'Сумма', 'Статус'].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#4b5568] uppercase">{h}</th>)}
              </tr></thead>
              <tbody>
                {filteredSales.slice().reverse().map((sale) => (
                  <tr key={sale.id} className="border-b border-[#252d3d] last:border-0 hover:bg-[#1e2637]">
                    <td className="px-4 py-3 text-xs text-[#4b5568]">{new Date(sale.date).toLocaleDateString('ru-RU')}</td>
                    <td className="px-4 py-3 text-sm text-white">{sale.customerName || '—'}</td>
                    <td className="px-4 py-3 text-xs text-[#8892a4]">{sale.items.map((i) => i.productName).join(', ')}</td>
                    <td className="px-4 py-3 text-xs text-[#8892a4]">{PAY_LABELS[sale.paymentMethod]}</td>
                    <td className="px-4 py-3 text-sm font-bold text-[#10b981]">{sale.totalAmount.toLocaleString('ru-RU')} ₽</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${sale.status === 'completed' ? 'bg-[#10b981]/20 text-[#10b981]' : sale.status === 'refunded' ? 'bg-[#f59e0b]/20 text-[#f59e0b]' : 'bg-[#ef4444]/20 text-[#ef4444]'}`}>{STATUS_LABELS[sale.status]}</span></td>
                  </tr>
                ))}
                {filteredSales.length === 0 && <tr><td colSpan={6} className="py-12 text-center text-sm text-[#4b5568]">Нет продаж</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'registers' && (
        <div className="grid grid-cols-2 gap-3">
          {offRegisters.map((reg) => {
            const regSales = offSales.filter((s) => s.cashRegisterId === reg.id && s.status === 'completed');
            const total = regSales.reduce((s, sale) => s + sale.totalAmount, 0);
            return (
              <div key={reg.id} className="bg-[#161b27] border border-[#252d3d] rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 rounded-lg bg-[#10b981]/10 flex items-center justify-center"><Icon name="CreditCard" size={16} className="text-[#10b981]" /></div>
                  <button onClick={() => deleteCashRegister(reg.id)} className="p-1.5 hover:bg-[#ef4444]/20 rounded text-[#4b5568] hover:text-[#ef4444]"><Icon name="Trash2" size={13} /></button>
                </div>
                <div className="text-sm font-semibold text-white mb-1">{reg.name}</div>
                <div className="text-xs text-[#4b5568] mb-3">{regSales.length} продаж</div>
                <div className="text-lg font-bold text-[#10b981]">{total.toLocaleString('ru-RU')} ₽</div>
                <div className="text-xs text-[#4b5568]">выручка</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SaleForm({ form: initial, items: initItems, onChange, onItemsChange, registers, employees, products, subscribers, total, onSave, onCancel }: {
  form: { cashRegisterId: string; customerName: string; paymentMethod: Sale['paymentMethod']; employeeId: string };
  items: SaleItem[];
  onChange: (f: typeof initial) => void;
  onItemsChange: (items: SaleItem[]) => void;
  registers: CashRegister[];
  employees: ReturnType<typeof useCRMStore>['employees'];
  products: ReturnType<typeof useCRMStore>['products'];
  subscribers: ReturnType<typeof useCRMStore>['subscribers'];
  total: number;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [items, setItems] = useState<SaleItem[]>(initItems);
  const [subSearch, setSubSearch] = useState('');

  const update = (key: string, val: string) => { const next = { ...form, [key]: val }; setForm(next); onChange(next); };

  const addItem = (prod: typeof products[0]) => {
    const exists = items.find((i) => i.productId === prod.id);
    let newItems: SaleItem[];
    if (exists) newItems = items.map((i) => i.productId === prod.id ? { ...i, quantity: i.quantity + 1, amount: (i.quantity + 1) * i.price } : i);
    else newItems = [...items, { productId: prod.id, productName: prod.name, quantity: 1, price: prod.price, amount: prod.price }];
    setItems(newItems);
    onItemsChange(newItems);
  };

  const removeItem = (productId: string) => {
    const newItems = items.filter((i) => i.productId !== productId);
    setItems(newItems);
    onItemsChange(newItems);
  };

  const updateQty = (productId: string, qty: number) => {
    const newItems = items.map((i) => i.productId === productId ? { ...i, quantity: qty, amount: qty * i.price } : i);
    setItems(newItems);
    onItemsChange(newItems);
  };

  const filteredSubs = subSearch.length > 1 ? subscribers.filter((s) => s.fullName.toLowerCase().includes(subSearch.toLowerCase())).slice(0, 5) : [];
  const calcTotal = items.reduce((s, i) => s + i.amount, 0);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Field label="Клиент (поиск абонента)">
          <input value={subSearch || form.customerName} onChange={(e) => { setSubSearch(e.target.value); if (!e.target.value) update('customerName', ''); }} placeholder="Введите имя или выберите абонента" className={inputCls} />
        </Field>
        {filteredSubs.length > 0 && (
          <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-[#1e2637] border border-[#252d3d] rounded-lg shadow-xl">
            {filteredSubs.map((s) => (
              <button key={s.id} onClick={() => { update('customerName', s.fullName); setSubSearch(''); }} className="w-full px-3 py-2.5 text-left hover:bg-[#252d3d] border-b border-[#252d3d] last:border-0">
                <div className="text-sm text-white">{s.fullName}</div>
                <div className="text-xs text-[#4b5568]">{s.contractNumber}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Касса">
          <select value={form.cashRegisterId} onChange={(e) => update('cashRegisterId', e.target.value)} className={selectCls}>
            {registers.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </Field>
        <Field label="Оплата">
          <select value={form.paymentMethod} onChange={(e) => update('paymentMethod', e.target.value)} className={selectCls}>
            <option value="cash">Наличные</option>
            <option value="card">Карта</option>
            <option value="transfer">Перевод</option>
          </select>
        </Field>
      </div>

      <Field label="Кассир">
        <select value={form.employeeId} onChange={(e) => update('employeeId', e.target.value)} className={selectCls}>
          <option value="">Выбрать</option>
          {employees.map((e) => <option key={e.id} value={e.id}>{e.lastName} {e.firstName}</option>)}
        </select>
      </Field>

      {/* Products */}
      <div>
        <label className="block text-xs font-medium text-[#8892a4] mb-1.5">Добавить товар</label>
        <div className="grid grid-cols-1 gap-1 max-h-36 overflow-y-auto bg-[#0f1117] border border-[#252d3d] rounded-lg p-2">
          {products.map((p) => (
            <button key={p.id} onClick={() => addItem(p)} className="flex items-center gap-2 px-2 py-1.5 hover:bg-[#1e2637] rounded text-left transition-colors">
              <Icon name="Plus" size={12} className="text-[#3b82f6]" />
              <span className="text-sm text-white flex-1 truncate">{p.name}</span>
              <span className="text-xs text-[#10b981]">{p.price.toLocaleString('ru-RU')} ₽</span>
            </button>
          ))}
        </div>
      </div>

      {items.length > 0 && (
        <div className="bg-[#0f1117] border border-[#252d3d] rounded-lg overflow-hidden">
          {items.map((item) => (
            <div key={item.productId} className="flex items-center gap-2 px-3 py-2 border-b border-[#252d3d] last:border-0">
              <span className="flex-1 text-sm text-white truncate">{item.productName}</span>
              <input type="number" value={item.quantity} onChange={(e) => updateQty(item.productId, +e.target.value)} className="w-14 bg-[#1e2637] border border-[#252d3d] rounded px-2 py-1 text-sm text-white text-center" min={1} />
              <span className="text-xs text-[#4b5568] w-16 text-right">{item.price.toLocaleString('ru-RU')} ₽</span>
              <span className="text-sm font-semibold text-[#10b981] w-20 text-right">{item.amount.toLocaleString('ru-RU')} ₽</span>
              <button onClick={() => removeItem(item.productId)} className="p-1 hover:bg-[#ef4444]/20 rounded text-[#4b5568] hover:text-[#ef4444]"><Icon name="X" size={12} /></button>
            </div>
          ))}
          <div className="px-3 py-2 bg-[#1e2637] flex items-center justify-between">
            <span className="text-sm font-semibold text-white">Итого</span>
            <span className="text-lg font-bold text-[#10b981]">{calcTotal.toLocaleString('ru-RU')} ₽</span>
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-4 border-t border-[#252d3d]">
        <button onClick={onSave} disabled={items.length === 0} className="flex-1 py-2 bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-50 text-white rounded-lg text-sm font-medium">Провести продажу</button>
        <button onClick={onCancel} className="px-4 py-2 bg-[#1e2637] text-[#8892a4] rounded-lg text-sm">Отмена</button>
      </div>
    </div>
  );
}
