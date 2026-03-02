import { useState } from 'react';
import { useCRMStore } from '@/store/crmStore';
import { Warehouse as WHType, Category, Product, StockOperation } from '@/types/crm';
import Icon from '@/components/ui/icon';

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
const inputCls = "w-full bg-[#0f1117] border border-[#252d3d] rounded-lg px-3 py-2 text-sm text-white placeholder-[#4b5568] focus:outline-none focus:border-[#3b82f6] transition-colors";
const selectCls = `${inputCls} cursor-pointer`;

type Tab = 'stock' | 'products' | 'categories' | 'warehouses' | 'operations';

interface Props {
  onOpenPanel: (title: string, content: React.ReactNode) => void;
  onClosePanel: () => void;
}

const OP_TYPES: Record<StockOperation['type'], string> = {
  receipt: 'Приход', writeoff: 'Списание', transfer: 'Перемещение', sale: 'Продажа', return: 'Возврат',
};
const OP_COLORS: Record<StockOperation['type'], string> = {
  receipt: 'text-[#10b981]', writeoff: 'text-[#ef4444]', transfer: 'text-[#3b82f6]', sale: 'text-[#f59e0b]', return: 'text-[#8b5cf6]',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs font-medium text-[#8892a4] mb-1.5">{label}</label>{children}</div>;
}

export default function Warehouse({ onOpenPanel, onClosePanel }: Props) {
  const { currentOfficeId, warehouses, categories, products, stockOperations, warehouseStock, employees, sales, cashRegisters, addWarehouse, updateWarehouse, deleteWarehouse, addCategory, deleteCategory, addProduct, updateProduct, deleteProduct, addStockOperation, updateSale, addCashPayment } = useCRMStore();
  const [tab, setTab] = useState<Tab>('stock');

  const offWarehouses = warehouses.filter((w) => w.officeId === currentOfficeId);
  const offOperations = stockOperations.filter((o) => o.officeId === currentOfficeId);

  const openWarehouseForm = (wh?: WHType) => {
    const form = { name: wh?.name || '', address: wh?.address || '', description: wh?.description || '' };
    const save = () => { if (!wh) addWarehouse({ id: uid(), officeId: currentOfficeId, ...form }); else updateWarehouse(wh.id, form); onClosePanel(); };
    onOpenPanel(wh ? 'Редактировать склад' : 'Новый склад', (
      <div className="space-y-4">
        <Field label="Название"><input defaultValue={form.name} onChange={(e) => { form.name = e.target.value; }} className={inputCls} /></Field>
        <Field label="Адрес"><input defaultValue={form.address} onChange={(e) => { form.address = e.target.value; }} className={inputCls} /></Field>
        <Field label="Описание"><input defaultValue={form.description} onChange={(e) => { form.description = e.target.value; }} className={inputCls} /></Field>
        <div className="flex gap-3 pt-4 border-t border-[#252d3d]">
          <button onClick={save} className="flex-1 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-sm font-medium">Сохранить</button>
          <button onClick={onClosePanel} className="px-4 py-2 bg-[#1e2637] text-[#8892a4] rounded-lg text-sm">Отмена</button>
        </div>
      </div>
    ));
  };

  const openCategoryForm = () => {
    const form = { name: '', parentId: '' };
    const save = () => { addCategory({ id: uid(), ...form, parentId: form.parentId || undefined }); onClosePanel(); };
    onOpenPanel('Новая категория', (
      <div className="space-y-4">
        <Field label="Название"><input defaultValue={form.name} onChange={(e) => { form.name = e.target.value; }} className={inputCls} /></Field>
        <Field label="Родительская категория">
          <select defaultValue={form.parentId} onChange={(e) => { form.parentId = e.target.value; }} className={selectCls}>
            <option value="">Корневая</option>
            {categories.filter((c) => !c.parentId).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <div className="flex gap-3 pt-4 border-t border-[#252d3d]">
          <button onClick={save} className="flex-1 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-sm font-medium">Сохранить</button>
          <button onClick={onClosePanel} className="px-4 py-2 bg-[#1e2637] text-[#8892a4] rounded-lg text-sm">Отмена</button>
        </div>
      </div>
    ));
  };

  const openProductForm = (prod?: Product) => {
    const form = { name: prod?.name || '', sku: prod?.sku || '', categoryId: prod?.categoryId || '', unit: prod?.unit || 'шт', price: prod?.price || 0, description: prod?.description || '' };
    const save = () => { if (!prod) addProduct({ id: uid(), ...form }); else updateProduct(prod.id, form); onClosePanel(); };
    onOpenPanel(prod ? 'Редактировать товар' : 'Новый товар', (
      <div className="space-y-4">
        <Field label="Название"><input defaultValue={form.name} onChange={(e) => { form.name = e.target.value; }} className={inputCls} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Артикул"><input defaultValue={form.sku} onChange={(e) => { form.sku = e.target.value; }} className={inputCls} /></Field>
          <Field label="Единица">
            <select defaultValue={form.unit} onChange={(e) => { form.unit = e.target.value; }} className={selectCls}>
              {['шт', 'м', 'кг', 'л', 'уп', 'рул'].map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Категория">
          <select defaultValue={form.categoryId} onChange={(e) => { form.categoryId = e.target.value; }} className={selectCls}>
            <option value="">Без категории</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.parentId ? '└ ' : ''}{c.name}</option>)}
          </select>
        </Field>
        <Field label="Цена (₽)"><input type="number" defaultValue={form.price} onChange={(e) => { form.price = +e.target.value; }} className={inputCls} /></Field>
        <Field label="Описание"><input defaultValue={form.description} onChange={(e) => { form.description = e.target.value; }} className={inputCls} /></Field>
        <div className="flex gap-3 pt-4 border-t border-[#252d3d]">
          <button onClick={save} className="flex-1 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-sm font-medium">Сохранить</button>
          <button onClick={onClosePanel} className="px-4 py-2 bg-[#1e2637] text-[#8892a4] rounded-lg text-sm">Отмена</button>
        </div>
      </div>
    ));
  };

  const openOperationForm = (type: StockOperation['type']) => {
    const form = { warehouseId: offWarehouses[0]?.id || '', toWarehouseId: '', productId: '', quantity: 1, price: 0, notes: '', employeeId: '' };
    const save = () => {
      const prod = products.find((p) => p.id === form.productId);
      addStockOperation({ id: uid(), officeId: currentOfficeId, type, ...form, toWarehouseId: form.toWarehouseId || undefined, amount: form.quantity * form.price, date: new Date().toISOString().split('T')[0], createdAt: new Date().toISOString() });
      onClosePanel();
    };
    onOpenPanel(`Складская операция: ${OP_TYPES[type]}`, (
      <div className="space-y-4">
        <Field label="Склад">
          <select defaultValue={form.warehouseId} onChange={(e) => { form.warehouseId = e.target.value; }} className={selectCls}>
            {offWarehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </Field>
        {type === 'transfer' && (
          <Field label="Склад назначения">
            <select defaultValue={form.toWarehouseId} onChange={(e) => { form.toWarehouseId = e.target.value; }} className={selectCls}>
              {offWarehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </Field>
        )}
        <Field label="Товар">
          <select defaultValue={form.productId} onChange={(e) => { form.productId = e.target.value; const p = products.find((pr) => pr.id === e.target.value); if (p) form.price = p.price; }} className={selectCls}>
            <option value="">Выбрать товар</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Количество"><input type="number" defaultValue={form.quantity} onChange={(e) => { form.quantity = +e.target.value; }} className={inputCls} min={1} /></Field>
          <Field label="Цена (₽)"><input type="number" defaultValue={form.price} onChange={(e) => { form.price = +e.target.value; }} className={inputCls} /></Field>
        </div>
        <Field label="Ответственный">
          <select defaultValue={form.employeeId} onChange={(e) => { form.employeeId = e.target.value; }} className={selectCls}>
            <option value="">Выбрать</option>
            {employees.filter((e) => e.status === 'active').map((e) => <option key={e.id} value={e.id}>{e.lastName} {e.firstName}</option>)}
          </select>
        </Field>
        <Field label="Примечание"><input defaultValue={form.notes} onChange={(e) => { form.notes = e.target.value; }} className={inputCls} /></Field>
        <div className="flex gap-3 pt-4 border-t border-[#252d3d]">
          <button onClick={save} className="flex-1 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-sm font-medium">Провести</button>
          <button onClick={onClosePanel} className="px-4 py-2 bg-[#1e2637] text-[#8892a4] rounded-lg text-sm">Отмена</button>
        </div>
      </div>
    ));
  };

  const offRegisters = cashRegisters.filter((r) => r.officeId === currentOfficeId);
  const offSales = sales.filter((s) => s.officeId === currentOfficeId && s.status === 'completed');

  const openSaleReturnForm = () => {
    let selectedSaleId = offSales[0]?.id || '';
    let cashRegisterId = offRegisters[0]?.id || '';
    let notes = '';
    const todayStr = new Date().toISOString().split('T')[0];

    const save = () => {
      const sale = sales.find((s) => s.id === selectedSaleId);
      if (!sale) return;
      updateSale(sale.id, { status: 'refunded' });
      const warehouseId = warehouses.find((w) => w.officeId === currentOfficeId)?.id;
      if (warehouseId) {
        sale.items.forEach((item) => {
          addStockOperation({
            id: uid(), officeId: currentOfficeId, warehouseId, type: 'return',
            productId: item.productId, quantity: item.quantity, price: item.price,
            amount: item.amount, employeeId: '', date: todayStr,
            notes: `Возврат по продаже #${sale.id}${notes ? ': ' + notes : ''}`,
            createdAt: new Date().toISOString(),
          });
        });
      }
      addCashPayment({
        id: uid(), officeId: currentOfficeId, cashRegisterId, type: 'refund',
        amount: sale.totalAmount, direction: 'out',
        description: `Возврат товара: ${sale.items.map((i) => i.productName).join(', ')} (${sale.customerName})`,
        comment: notes, date: todayStr, createdAt: new Date().toISOString(),
      });
      onClosePanel();
    };

    onOpenPanel('Возврат товара', (
      <div className="space-y-4">
        <Field label="Выберите продажу для возврата">
          <select defaultValue={selectedSaleId} onChange={(e) => { selectedSaleId = e.target.value; }} className={selectCls}>
            <option value="">Выбрать продажу...</option>
            {offSales.slice().reverse().map((s) => (
              <option key={s.id} value={s.id}>
                {new Date(s.date).toLocaleDateString('ru-RU')} · {s.customerName || 'Клиент'} · {s.totalAmount.toLocaleString('ru-RU')} ₽
              </option>
            ))}
          </select>
        </Field>
        <Field label="Касса для выплаты">
          <select defaultValue={cashRegisterId} onChange={(e) => { cashRegisterId = e.target.value; }} className={selectCls}>
            {offRegisters.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </Field>
        <Field label="Причина возврата">
          <input defaultValue="" onChange={(e) => { notes = e.target.value; }} className={inputCls} placeholder="Опишите причину возврата..." />
        </Field>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-500">
          Деньги будут выплачены из выбранной кассы, товары вернутся на склад автоматически
        </div>
        <div className="flex gap-3 pt-4 border-t border-[#252d3d]">
          <button onClick={save} className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium">Провести возврат</button>
          <button onClick={onClosePanel} className="px-4 py-2 bg-[#1e2637] text-[#8892a4] rounded-lg text-sm">Отмена</button>
        </div>
      </div>
    ));
  };

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'stock', label: 'Остатки', icon: 'BarChart3' },
    { id: 'products', label: 'Товары', icon: 'Tag' },
    { id: 'categories', label: 'Категории', icon: 'FolderOpen' },
    { id: 'warehouses', label: 'Склады', icon: 'Warehouse' },
    { id: 'operations', label: 'Операции', icon: 'ArrowLeftRight' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-[#252d3d] pb-4">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${tab === t.id ? 'bg-[#3b82f6] text-white' : 'text-[#8892a4] hover:text-white hover:bg-[#1e2637]'}`}>
            <Icon name={t.icon} size={14} />{t.label}
          </button>
        ))}
      </div>

      {tab === 'stock' && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {(['receipt', 'writeoff', 'transfer'] as const).map((type) => (
              <button key={type} onClick={() => openOperationForm(type)} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e2637] hover:bg-[#252d3d] text-[#8892a4] hover:text-white rounded-lg text-sm transition-colors">
                <Icon name={type === 'receipt' ? 'ArrowDown' : type === 'writeoff' ? 'Trash2' : 'ArrowLeftRight'} size={13} className={OP_COLORS[type]} />
                {OP_TYPES[type]}
              </button>
            ))}
            <button onClick={openSaleReturnForm} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg text-sm transition-colors">
              <Icon name="RotateCcw" size={13} />Возврат товара
            </button>
          </div>
          {offWarehouses.map((wh) => {
            const stocks = warehouseStock.filter((s) => s.warehouseId === wh.id && s.quantity > 0);
            return (
              <div key={wh.id} className="bg-[#161b27] border border-[#252d3d] rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-[#252d3d] flex items-center gap-2">
                  <Icon name="Warehouse" size={15} className="text-[#3b82f6]" />
                  <span className="text-sm font-semibold text-white">{wh.name}</span>
                  <span className="text-xs text-[#4b5568] ml-auto">{stocks.length} позиций</span>
                </div>
                <table className="w-full">
                  <thead><tr className="border-b border-[#252d3d] bg-[#0f1117]/50">
                    {['Товар', 'Артикул', 'Количество', 'Цена', 'Сумма'].map((h) => (
                      <th key={h} className="px-4 py-2 text-left text-xs text-[#4b5568] font-semibold uppercase">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {stocks.map((st) => {
                      const prod = products.find((p) => p.id === st.productId);
                      if (!prod) return null;
                      return (
                        <tr key={st.productId} className="border-b border-[#252d3d] last:border-0 hover:bg-[#1e2637]">
                          <td className="px-4 py-2.5 text-sm text-white">{prod.name}</td>
                          <td className="px-4 py-2.5 text-xs text-[#4b5568]">{prod.sku}</td>
                          <td className="px-4 py-2.5 text-sm font-semibold text-white">{st.quantity} {prod.unit}</td>
                          <td className="px-4 py-2.5 text-sm text-[#8892a4]">{prod.price.toLocaleString('ru-RU')} ₽</td>
                          <td className="px-4 py-2.5 text-sm font-semibold text-[#10b981]">{(st.quantity * prod.price).toLocaleString('ru-RU')} ₽</td>
                        </tr>
                      );
                    })}
                    {stocks.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-[#4b5568]">Склад пуст</td></tr>}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'products' && (
        <>
          <div className="flex justify-end">
            <button onClick={() => openProductForm()} className="flex items-center gap-2 px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-sm font-medium transition-colors"><Icon name="Plus" size={14} />Добавить товар</button>
          </div>
          <div className="bg-[#161b27] border border-[#252d3d] rounded-xl overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b border-[#252d3d]">
                {['Название', 'Артикул', 'Категория', 'Единица', 'Цена', ''].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#4b5568] uppercase">{h}</th>)}
              </tr></thead>
              <tbody>
                {products.map((p) => {
                  const cat = categories.find((c) => c.id === p.categoryId);
                  return (
                    <tr key={p.id} className="border-b border-[#252d3d] last:border-0 hover:bg-[#1e2637] cursor-pointer" onClick={() => openProductForm(p)}>
                      <td className="px-4 py-3 text-sm font-medium text-white">{p.name}</td>
                      <td className="px-4 py-3 text-xs text-[#4b5568]">{p.sku}</td>
                      <td className="px-4 py-3 text-sm text-[#8892a4]">{cat?.name || '—'}</td>
                      <td className="px-4 py-3 text-sm text-[#8892a4]">{p.unit}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-[#10b981]">{p.price.toLocaleString('ru-RU')} ₽</td>
                      <td className="px-4 py-3"><button onClick={(e) => { e.stopPropagation(); deleteProduct(p.id); }} className="p-1.5 hover:bg-[#ef4444]/20 rounded text-[#4b5568] hover:text-[#ef4444]"><Icon name="Trash2" size={13} /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'categories' && (
        <>
          <div className="flex justify-end">
            <button onClick={openCategoryForm} className="flex items-center gap-2 px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-sm font-medium transition-colors"><Icon name="Plus" size={14} />Добавить</button>
          </div>
          <div className="bg-[#161b27] border border-[#252d3d] rounded-xl p-4 space-y-2">
            {categories.filter((c) => !c.parentId).map((cat) => (
              <div key={cat.id}>
                <div className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-[#1e2637]">
                  <Icon name="Folder" size={15} className="text-[#f59e0b]" />
                  <span className="text-sm font-medium text-white flex-1">{cat.name}</span>
                  <span className="text-xs text-[#4b5568]">{products.filter((p) => p.categoryId === cat.id).length} товаров</span>
                  <button onClick={() => deleteCategory(cat.id)} className="p-1 hover:bg-[#ef4444]/20 rounded text-[#4b5568] hover:text-[#ef4444]"><Icon name="Trash2" size={12} /></button>
                </div>
                {categories.filter((c) => c.parentId === cat.id).map((sub) => (
                  <div key={sub.id} className="flex items-center gap-2 py-2 px-3 pl-8 rounded-lg hover:bg-[#1e2637]">
                    <Icon name="FolderOpen" size={13} className="text-[#8892a4]" />
                    <span className="text-sm text-[#8892a4] flex-1">{sub.name}</span>
                    <span className="text-xs text-[#4b5568]">{products.filter((p) => p.categoryId === sub.id).length} товаров</span>
                    <button onClick={() => deleteCategory(sub.id)} className="p-1 hover:bg-[#ef4444]/20 rounded text-[#4b5568] hover:text-[#ef4444]"><Icon name="Trash2" size={12} /></button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'warehouses' && (
        <>
          <div className="flex justify-end">
            <button onClick={() => openWarehouseForm()} className="flex items-center gap-2 px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-sm font-medium transition-colors"><Icon name="Plus" size={14} />Добавить склад</button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {offWarehouses.map((wh) => {
              const stockCount = warehouseStock.filter((s) => s.warehouseId === wh.id && s.quantity > 0).length;
              const stockValue = warehouseStock.filter((s) => s.warehouseId === wh.id).reduce((sum, s) => {
                const p = products.find((pr) => pr.id === s.productId);
                return sum + (p ? p.price * s.quantity : 0);
              }, 0);
              return (
                <div key={wh.id} className="bg-[#161b27] border border-[#252d3d] rounded-xl p-4 hover:border-[#3b82f6]/30 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-9 h-9 rounded-lg bg-[#3b82f6]/10 flex items-center justify-center"><Icon name="Warehouse" size={16} className="text-[#3b82f6]" /></div>
                    <div className="flex gap-1">
                      <button onClick={() => openWarehouseForm(wh)} className="p-1.5 hover:bg-[#252d3d] rounded text-[#4b5568] hover:text-white"><Icon name="Pencil" size={13} /></button>
                      <button onClick={() => deleteWarehouse(wh.id)} className="p-1.5 hover:bg-[#ef4444]/20 rounded text-[#4b5568] hover:text-[#ef4444]"><Icon name="Trash2" size={13} /></button>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-white mb-1">{wh.name}</div>
                  <div className="text-xs text-[#4b5568] mb-3">{wh.address}</div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#8892a4]">{stockCount} позиций</span>
                    <span className="text-[#10b981] font-semibold">{stockValue.toLocaleString('ru-RU')} ₽</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === 'operations' && (
        <div className="bg-[#161b27] border border-[#252d3d] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b border-[#252d3d]">
              {['Дата', 'Тип', 'Товар', 'Кол-во', 'Сумма', 'Примечание'].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#4b5568] uppercase">{h}</th>)}
            </tr></thead>
            <tbody>
              {offOperations.slice().reverse().map((op) => {
                const prod = products.find((p) => p.id === op.productId);
                return (
                  <tr key={op.id} className="border-b border-[#252d3d] last:border-0 hover:bg-[#1e2637]">
                    <td className="px-4 py-3 text-xs text-[#4b5568]">{new Date(op.date).toLocaleDateString('ru-RU')}</td>
                    <td className="px-4 py-3"><span className={`text-xs font-medium ${OP_COLORS[op.type]}`}>{OP_TYPES[op.type]}</span></td>
                    <td className="px-4 py-3 text-sm text-white">{prod?.name || '—'}</td>
                    <td className="px-4 py-3 text-sm text-[#8892a4]">{op.quantity} {prod?.unit}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-white">{op.amount.toLocaleString('ru-RU')} ₽</td>
                    <td className="px-4 py-3 text-xs text-[#4b5568]">{op.notes || '—'}</td>
                  </tr>
                );
              })}
              {offOperations.length === 0 && <tr><td colSpan={6} className="py-12 text-center text-sm text-[#4b5568]">Нет операций</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}