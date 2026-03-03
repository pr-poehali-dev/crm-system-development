import { useState, useMemo } from 'react';
import { useCRMStore } from '@/store/crmStore';
import {
  Warehouse as WarehouseType, Category, Product, StockOperation, StockOperationType,
} from '@/types/crm';
import Icon from '@/components/ui/icon';

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

const inputCls = 'w-full bg-[#0f1117] border border-[#252d3d] rounded-lg px-3 py-2 text-sm text-white placeholder-[#4b5568] focus:outline-none focus:border-[#3b82f6] transition-colors';
const labelCls = 'block text-xs font-medium text-[#8892a4] mb-1.5 uppercase tracking-wide';

const OP_CONFIG: Record<StockOperationType, { label: string; icon: string; color: string; bg: string; btnBg: string }> = {
  receipt:  { label: 'Приход',       icon: 'ArrowDownToLine', color: 'text-[#10b981]', bg: 'bg-[#10b981]/15 border-[#10b981]/30', btnBg: 'bg-[#10b981] hover:bg-[#059669]' },
  writeoff: { label: 'Списание',     icon: 'ArrowUpFromLine', color: 'text-[#ef4444]', bg: 'bg-[#ef4444]/15 border-[#ef4444]/30', btnBg: 'bg-[#ef4444] hover:bg-[#dc2626]' },
  transfer: { label: 'Перемещение',  icon: 'ArrowLeftRight',  color: 'text-[#3b82f6]', bg: 'bg-[#3b82f6]/15 border-[#3b82f6]/30', btnBg: 'bg-[#3b82f6] hover:bg-[#2563eb]' },
  sale:     { label: 'Продажа',      icon: 'ShoppingCart',    color: 'text-[#f59e0b]', bg: 'bg-[#f59e0b]/15 border-[#f59e0b]/30', btnBg: 'bg-[#f59e0b] hover:bg-[#d97706]' },
  return:   { label: 'Возврат',      icon: 'Undo2',           color: 'text-[#8b5cf6]', bg: 'bg-[#8b5cf6]/15 border-[#8b5cf6]/30', btnBg: 'bg-[#8b5cf6] hover:bg-[#7c3aed]' },
};

const UNITS = ['шт', 'м', 'кг', 'л', 'уп', 'рул', 'компл'];

type Tab = 'residue' | 'income' | 'outcome' | 'move' | 'products' | 'operations';
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'residue',    label: 'Остатки',     icon: 'LayoutGrid' },
  { id: 'income',     label: 'Приход',      icon: 'ArrowDownToLine' },
  { id: 'outcome',    label: 'Списание',    icon: 'ArrowUpFromLine' },
  { id: 'move',       label: 'Перемещение', icon: 'ArrowLeftRight' },
  { id: 'products',   label: 'Номенклатура',icon: 'Package' },
  { id: 'operations', label: 'История',     icon: 'ClipboardList' },
];

interface Props {
  onOpenPanel: (title: string, content: React.ReactNode) => void;
  onClosePanel: () => void;
}

export default function WarehouseModule({ onOpenPanel, onClosePanel }: Props) {
  const store = useCRMStore();
  const { currentOfficeId, warehouses, categories, products, stockOperations, warehouseStock, employees } = store;
  const [tab, setTab] = useState<Tab>('residue');
  const [search, setSearch] = useState('');
  const [whFilter, setWhFilter] = useState('all');
  const [catFilter, setCatFilter] = useState('all');
  const [opTypeFilter, setOpTypeFilter] = useState<'all' | StockOperationType>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const offWarehouses = warehouses.filter(w => w.officeId === currentOfficeId);

  // Вычисляем остатки
  const getStock = (warehouseId: string, productId: string) =>
    warehouseStock.find(s => s.warehouseId === warehouseId && s.productId === productId)?.quantity ?? 0;

  const getTotalStock = (productId: string) =>
    offWarehouses.reduce((sum, w) => sum + getStock(w.id, productId), 0);

  // Все операции офиса
  const offOps = stockOperations.filter(o => o.officeId === currentOfficeId);

  // Фильтрованные операции по табу + фильтрам
  const filteredOps = useMemo(() => {
    const typeForTab: Partial<Record<Tab, StockOperationType>> = {
      income: 'receipt', outcome: 'writeoff', move: 'transfer',
    };
    let ops = offOps;
    if (tab === 'income') ops = ops.filter(o => o.type === 'receipt');
    else if (tab === 'outcome') ops = ops.filter(o => o.type === 'writeoff');
    else if (tab === 'move') ops = ops.filter(o => o.type === 'transfer');
    else if (tab === 'operations') {
      if (opTypeFilter !== 'all') ops = ops.filter(o => o.type === opTypeFilter);
    }
    if (whFilter !== 'all') ops = ops.filter(o => o.warehouseId === whFilter || o.toWarehouseId === whFilter);
    if (dateFrom) ops = ops.filter(o => o.date >= dateFrom);
    if (dateTo) ops = ops.filter(o => o.date <= dateTo);
    const q = search.toLowerCase();
    if (q) ops = ops.filter(o => {
      const p = products.find(p => p.id === o.productId);
      return p?.name.toLowerCase().includes(q) || p?.sku.toLowerCase().includes(q);
    });
    return [...ops].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [offOps, tab, whFilter, opTypeFilter, dateFrom, dateTo, search, products]);

  // Статистика
  const totalValue = offWarehouses.reduce((sum, wh) =>
    sum + warehouseStock
      .filter(s => s.warehouseId === wh.id && s.quantity > 0)
      .reduce((s2, s) => {
        const p = products.find(p => p.id === s.productId);
        return s2 + (p ? s.quantity * p.price : 0);
      }, 0), 0);

  const totalItems = new Set(
    warehouseStock.filter(s => offWarehouses.find(w => w.id === s.warehouseId) && s.quantity > 0).map(s => s.productId)
  ).size;

  const monthOps = offOps.filter(o => {
    const d = new Date(o.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const monthReceipt = monthOps.filter(o => o.type === 'receipt').reduce((s, o) => s + o.amount, 0);
  const monthWriteoff = monthOps.filter(o => o.type === 'writeoff').reduce((s, o) => s + o.amount, 0);

  const openOpForm = (type: StockOperationType) => {
    const cfg = OP_CONFIG[type];
    onOpenPanel(cfg.label, (
      <OperationForm
        type={type}
        warehouses={offWarehouses}
        products={products}
        categories={categories}
        employees={employees.filter(e => e.status === 'active')}
        onSave={(op) => {
          store.addStockOperation({ id: uid(), officeId: currentOfficeId, createdAt: new Date().toISOString(), ...op });
          onClosePanel();
        }}
        onCancel={onClosePanel}
      />
    ));
  };

  const openProductForm = (product?: Product) => {
    onOpenPanel(product ? 'Редактировать товар' : 'Новый товар', (
      <ProductForm
        product={product}
        categories={categories}
        onSave={(data) => {
          if (product) store.updateProduct(product.id, data);
          else store.addProduct({ id: uid(), ...data });
          onClosePanel();
        }}
        onDelete={product ? () => { store.deleteProduct(product.id); onClosePanel(); } : undefined}
        onCancel={onClosePanel}
      />
    ));
  };

  const openWarehouseForm = (wh?: WarehouseType) => {
    onOpenPanel(wh ? 'Редактировать склад' : 'Новый склад', (
      <WarehouseForm
        warehouse={wh}
        onSave={(data) => {
          if (wh) store.updateWarehouse(wh.id, data);
          else store.addWarehouse({ id: uid(), officeId: currentOfficeId, ...data });
          onClosePanel();
        }}
        onDelete={wh ? () => { store.deleteWarehouse(wh.id); onClosePanel(); } : undefined}
        onCancel={onClosePanel}
      />
    ));
  };

  const openCategoryForm = (cat?: Category) => {
    onOpenPanel(cat ? 'Редактировать категорию' : 'Новая категория', (
      <CategoryForm
        category={cat}
        categories={categories}
        onSave={(data) => {
          if (cat) store.updateCategory(cat.id, data);
          else store.addCategory({ id: uid(), ...data });
          onClosePanel();
        }}
        onDelete={cat ? () => { store.deleteCategory(cat.id); onClosePanel(); } : undefined}
        onCancel={onClosePanel}
      />
    ));
  };

  return (
    <div className="space-y-4">
      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Складов', value: offWarehouses.length, icon: 'Warehouse', color: 'text-[#3b82f6]', bg: 'bg-[#3b82f6]/10' },
          { label: 'Позиций на складе', value: totalItems, icon: 'Package', color: 'text-[#10b981]', bg: 'bg-[#10b981]/10' },
          { label: 'Приход за месяц', value: `${monthReceipt.toLocaleString('ru-RU')} ₽`, icon: 'ArrowDownToLine', color: 'text-[#10b981]', bg: 'bg-[#10b981]/10' },
          { label: 'Стоимость запасов', value: `${totalValue.toLocaleString('ru-RU')} ₽`, icon: 'CircleDollarSign', color: 'text-[#f59e0b]', bg: 'bg-[#f59e0b]/10' },
        ].map(s => (
          <div key={s.label} className="bg-[#161b27] border border-[#252d3d] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0`}>
                <Icon name={s.icon} size={16} className={s.color} />
              </div>
              <div>
                <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-[#4b5568]">{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#0f1117] rounded-xl p-1 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex-shrink-0 ${
              tab === t.id ? 'bg-[#3b82f6] text-white shadow' : 'text-[#8892a4] hover:text-white hover:bg-[#1e2637]'
            }`}
          >
            <Icon name={t.icon} size={13} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── ОСТАТКИ ─── */}
      {tab === 'residue' && (
        <ResidueTab
          warehouses={offWarehouses}
          products={products}
          categories={categories}
          warehouseStock={warehouseStock}
          onReceipt={() => openOpForm('receipt')}
          onWriteoff={() => openOpForm('writeoff')}
          onTransfer={() => openOpForm('transfer')}
          onAddWarehouse={() => openWarehouseForm()}
          onEditWarehouse={openWarehouseForm}
        />
      )}

      {/* ─── ПРИХОД / СПИСАНИЕ / ПЕРЕМЕЩЕНИЕ ─── */}
      {(tab === 'income' || tab === 'outcome' || tab === 'move') && (
        <OpListTab
          tab={tab}
          ops={filteredOps}
          products={products}
          warehouses={warehouses}
          employees={employees}
          whFilter={whFilter}
          setWhFilter={setWhFilter}
          search={search}
          setSearch={setSearch}
          dateFrom={dateFrom}
          setDateFrom={setDateFrom}
          dateTo={dateTo}
          setDateTo={setDateTo}
          offWarehouses={offWarehouses}
          onAdd={() => openOpForm(tab === 'income' ? 'receipt' : tab === 'outcome' ? 'writeoff' : 'transfer')}
        />
      )}

      {/* ─── НОМЕНКЛАТУРА ─── */}
      {tab === 'products' && (
        <ProductsTab
          products={products}
          categories={categories}
          warehouseStock={warehouseStock}
          offWarehouses={offWarehouses}
          search={search}
          setSearch={setSearch}
          catFilter={catFilter}
          setCatFilter={setCatFilter}
          onAdd={() => openProductForm()}
          onEdit={openProductForm}
          onAddCategory={() => openCategoryForm()}
          onEditCategory={openCategoryForm}
        />
      )}

      {/* ─── ИСТОРИЯ ─── */}
      {tab === 'operations' && (
        <HistoryTab
          ops={filteredOps}
          products={products}
          warehouses={warehouses}
          employees={employees}
          search={search}
          setSearch={setSearch}
          whFilter={whFilter}
          setWhFilter={setWhFilter}
          opTypeFilter={opTypeFilter}
          setOpTypeFilter={setOpTypeFilter}
          dateFrom={dateFrom}
          setDateFrom={setDateFrom}
          dateTo={dateTo}
          setDateTo={setDateTo}
          offWarehouses={offWarehouses}
        />
      )}
    </div>
  );
}

/* ─────────── ОСТАТКИ ─────────── */
function ResidueTab({ warehouses, products, categories, warehouseStock, onReceipt, onWriteoff, onTransfer, onAddWarehouse, onEditWarehouse }: {
  warehouses: WarehouseType[];
  products: Product[];
  categories: Category[];
  warehouseStock: ReturnType<typeof useCRMStore>['warehouseStock'];
  onReceipt: () => void; onWriteoff: () => void; onTransfer: () => void;
  onAddWarehouse: () => void; onEditWarehouse: (wh: WarehouseType) => void;
}) {
  const [search, setSearch] = useState('');
  const [expandedWh, setExpandedWh] = useState<string[]>(warehouses.map(w => w.id));

  const getCatName = (id: string) => {
    const cat = categories.find(c => c.id === id);
    if (!cat) return '—';
    if (cat.parentId) {
      const parent = categories.find(c => c.id === cat.parentId);
      return parent ? `${parent.name} / ${cat.name}` : cat.name;
    }
    return cat.name;
  };

  return (
    <div className="space-y-4">
      {/* Кнопки операций */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <button onClick={onReceipt} className="flex items-center gap-2 px-4 py-2 bg-[#10b981] hover:bg-[#059669] text-white rounded-lg text-sm font-medium transition-colors">
            <Icon name="ArrowDownToLine" size={14} />Приход
          </button>
          <button onClick={onWriteoff} className="flex items-center gap-2 px-4 py-2 bg-[#ef4444] hover:bg-[#dc2626] text-white rounded-lg text-sm font-medium transition-colors">
            <Icon name="ArrowUpFromLine" size={14} />Списание
          </button>
          <button onClick={onTransfer} className="flex items-center gap-2 px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-sm font-medium transition-colors">
            <Icon name="ArrowLeftRight" size={14} />Перемещение
          </button>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4b5568]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по товару..." className="bg-[#1e2637] border border-[#252d3d] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-[#4b5568] focus:outline-none focus:border-[#3b82f6] w-52" />
          </div>
          <button onClick={onAddWarehouse} className="flex items-center gap-1.5 px-3 py-2 bg-[#1e2637] hover:bg-[#252d3d] text-[#8892a4] hover:text-white rounded-lg text-sm transition-colors">
            <Icon name="Plus" size={14} />Склад
          </button>
        </div>
      </div>

      {warehouses.length === 0 && (
        <div className="text-center py-16 text-[#4b5568]">
          <Icon name="Warehouse" size={40} className="mx-auto mb-3 opacity-30" />
          <div className="text-sm">Складов нет. Добавьте первый.</div>
          <button onClick={onAddWarehouse} className="mt-3 px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-sm">Добавить склад</button>
        </div>
      )}

      {warehouses.map(wh => {
        const stocks = warehouseStock.filter(s => s.warehouseId === wh.id && s.quantity > 0);
        const filteredStocks = stocks.filter(s => {
          if (!search) return true;
          const p = products.find(p => p.id === s.productId);
          return p?.name.toLowerCase().includes(search.toLowerCase()) || p?.sku.toLowerCase().includes(search.toLowerCase());
        });
        const totalVal = stocks.reduce((sum, s) => {
          const p = products.find(p => p.id === s.productId);
          return sum + (p ? s.quantity * p.price : 0);
        }, 0);
        const isExpanded = expandedWh.includes(wh.id);

        return (
          <div key={wh.id} className="bg-[#161b27] border border-[#252d3d] rounded-xl overflow-hidden">
            {/* Заголовок склада */}
            <div
              className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-[#1e2637] transition-colors"
              onClick={() => setExpandedWh(prev => prev.includes(wh.id) ? prev.filter(id => id !== wh.id) : [...prev, wh.id])}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#3b82f6]/10 flex items-center justify-center">
                  <Icon name="Warehouse" size={16} className="text-[#3b82f6]" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{wh.name}</div>
                  <div className="text-xs text-[#4b5568]">{wh.address}</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-bold text-[#10b981]">{totalVal.toLocaleString('ru-RU')} ₽</div>
                  <div className="text-xs text-[#4b5568]">{stocks.length} позиций</div>
                </div>
                <button onClick={e => { e.stopPropagation(); onEditWarehouse(wh); }} className="p-1.5 hover:bg-[#252d3d] rounded text-[#4b5568] hover:text-white transition-colors">
                  <Icon name="Pencil" size={13} />
                </button>
                <Icon name={isExpanded ? 'ChevronUp' : 'ChevronDown'} size={16} className="text-[#4b5568]" />
              </div>
            </div>

            {/* Таблица остатков */}
            {isExpanded && (
              filteredStocks.length === 0 ? (
                <div className="px-5 py-6 text-center text-xs text-[#4b5568] border-t border-[#252d3d]">
                  {search ? 'Товары не найдены' : 'Склад пуст'}
                </div>
              ) : (
                <div className="border-t border-[#252d3d] overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[#0f1117]">
                        {['Наименование', 'Артикул', 'Категория', 'Кол-во', 'Цена', 'Сумма'].map(h => (
                          <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-[#4b5568] uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStocks.map(s => {
                        const p = products.find(p => p.id === s.productId);
                        if (!p) return null;
                        const rowTotal = s.quantity * p.price;
                        return (
                          <tr key={s.productId} className="border-t border-[#252d3d] hover:bg-[#1e2637]/50 transition-colors">
                            <td className="px-4 py-2.5">
                              <div className="text-sm text-white font-medium">{p.name}</div>
                            </td>
                            <td className="px-4 py-2.5 text-xs text-[#8892a4] font-mono">{p.sku}</td>
                            <td className="px-4 py-2.5 text-xs text-[#8892a4]">{getCatName(p.categoryId)}</td>
                            <td className="px-4 py-2.5">
                              <span className={`text-sm font-semibold ${s.quantity <= 5 ? 'text-[#ef4444]' : s.quantity <= 20 ? 'text-[#f59e0b]' : 'text-white'}`}>
                                {s.quantity} {p.unit}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-sm text-[#8892a4]">{p.price.toLocaleString('ru-RU')} ₽</td>
                            <td className="px-4 py-2.5 text-sm font-semibold text-[#10b981]">{rowTotal.toLocaleString('ru-RU')} ₽</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-[#0f1117] border-t border-[#252d3d]">
                        <td colSpan={5} className="px-4 py-2.5 text-xs text-[#4b5568]">Итого: {filteredStocks.length} позиций</td>
                        <td className="px-4 py-2.5 text-sm font-bold text-[#10b981]">{totalVal.toLocaleString('ru-RU')} ₽</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─────────── СПИСОК ОПЕРАЦИЙ (ПРИХОД/СПИСАНИЕ/ПЕРЕМЕЩЕНИЕ) ─────────── */
function OpListTab({ tab, ops, products, warehouses, employees, whFilter, setWhFilter, search, setSearch, dateFrom, setDateFrom, dateTo, setDateTo, offWarehouses, onAdd }: {
  tab: Tab; ops: StockOperation[];
  products: Product[]; warehouses: WarehouseType[];
  employees: ReturnType<typeof useCRMStore>['employees'];
  whFilter: string; setWhFilter: (v: string) => void;
  search: string; setSearch: (v: string) => void;
  dateFrom: string; setDateFrom: (v: string) => void;
  dateTo: string; setDateTo: (v: string) => void;
  offWarehouses: WarehouseType[]; onAdd: () => void;
}) {
  const cfg = OP_CONFIG[tab === 'income' ? 'receipt' : tab === 'outcome' ? 'writeoff' : 'transfer'];
  const totalSum = ops.reduce((s, o) => s + o.amount, 0);
  const totalQty = ops.reduce((s, o) => s + o.quantity, 0);

  return (
    <div className="space-y-4">
      {/* Фильтры */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4b5568]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по товару..." className="bg-[#1e2637] border border-[#252d3d] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-[#4b5568] focus:outline-none focus:border-[#3b82f6] w-48" />
          </div>
          <select value={whFilter} onChange={e => setWhFilter(e.target.value)} className="bg-[#1e2637] border border-[#252d3d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3b82f6] cursor-pointer">
            <option value="all">Все склады</option>
            {offWarehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-[#1e2637] border border-[#252d3d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3b82f6]" title="Дата от" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-[#1e2637] border border-[#252d3d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3b82f6]" title="Дата до" />
          {(search || whFilter !== 'all' || dateFrom || dateTo) && (
            <button onClick={() => { setSearch(''); setWhFilter('all'); setDateFrom(''); setDateTo(''); }} className="px-3 py-2 text-xs text-[#ef4444] hover:bg-[#ef4444]/10 rounded-lg transition-colors">
              <Icon name="X" size={13} />
            </button>
          )}
        </div>
        <button onClick={onAdd} className={`flex items-center gap-2 px-4 py-2 ${cfg.btnBg} text-white rounded-lg text-sm font-medium transition-colors`}>
          <Icon name="Plus" size={14} />{cfg.label}
        </button>
      </div>

      {/* Итоги */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Документов', value: ops.length },
          { label: 'Товаров (шт)', value: totalQty },
          { label: 'Сумма', value: `${totalSum.toLocaleString('ru-RU')} ₽` },
        ].map(s => (
          <div key={s.label} className="bg-[#161b27] border border-[#252d3d] rounded-xl px-4 py-3">
            <div className={`text-lg font-bold ${cfg.color}`}>{s.value}</div>
            <div className="text-xs text-[#4b5568]">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Таблица */}
      <div className="bg-[#161b27] border border-[#252d3d] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[#0f1117] border-b border-[#252d3d]">
              <th className="px-4 py-3 text-left text-[10px] font-semibold text-[#4b5568] uppercase">Дата</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold text-[#4b5568] uppercase">Товар</th>
              {tab === 'move' && <th className="px-4 py-3 text-left text-[10px] font-semibold text-[#4b5568] uppercase">Откуда → Куда</th>}
              {tab !== 'move' && <th className="px-4 py-3 text-left text-[10px] font-semibold text-[#4b5568] uppercase">Склад</th>}
              <th className="px-4 py-3 text-left text-[10px] font-semibold text-[#4b5568] uppercase">Кол-во</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold text-[#4b5568] uppercase">Цена</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold text-[#4b5568] uppercase">Сумма</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold text-[#4b5568] uppercase">Ответств.</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold text-[#4b5568] uppercase">Примечание</th>
            </tr>
          </thead>
          <tbody>
            {ops.length === 0 && (
              <tr><td colSpan={8} className="py-14 text-center text-sm text-[#4b5568]">
                <Icon name={cfg.icon} size={32} className="mx-auto mb-2 opacity-20" />
                Нет записей
              </td></tr>
            )}
            {ops.map(op => {
              const p = products.find(p => p.id === op.productId);
              const wh = warehouses.find(w => w.id === op.warehouseId);
              const toWh = warehouses.find(w => w.id === op.toWarehouseId);
              const emp = employees.find(e => e.id === op.employeeId);
              return (
                <tr key={op.id} className="border-t border-[#252d3d] hover:bg-[#1e2637]/50 transition-colors">
                  <td className="px-4 py-3 text-xs text-[#8892a4] whitespace-nowrap">
                    {new Date(op.date).toLocaleDateString('ru-RU')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-white">{p?.name || '—'}</div>
                    {p?.sku && <div className="text-[10px] text-[#4b5568] font-mono">{p.sku}</div>}
                  </td>
                  {tab === 'move' ? (
                    <td className="px-4 py-3 text-xs text-[#8892a4]">
                      <span>{wh?.name || '—'}</span>
                      <Icon name="ArrowRight" size={10} className="inline mx-1 text-[#4b5568]" />
                      <span className="text-[#3b82f6]">{toWh?.name || '—'}</span>
                    </td>
                  ) : (
                    <td className="px-4 py-3 text-xs text-[#8892a4]">{wh?.name || '—'}</td>
                  )}
                  <td className="px-4 py-3 text-sm font-medium text-white">{op.quantity} {p?.unit || ''}</td>
                  <td className="px-4 py-3 text-sm text-[#8892a4]">{op.price.toLocaleString('ru-RU')} ₽</td>
                  <td className="px-4 py-3 text-sm font-semibold text-white">{op.amount.toLocaleString('ru-RU')} ₽</td>
                  <td className="px-4 py-3 text-xs text-[#8892a4]">
                    {emp ? `${emp.lastName} ${emp.firstName[0]}.` : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#8892a4] max-w-[140px] truncate">{op.notes || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─────────── НОМЕНКЛАТУРА ─────────── */
function ProductsTab({ products, categories, warehouseStock, offWarehouses, search, setSearch, catFilter, setCatFilter, onAdd, onEdit, onAddCategory, onEditCategory }: {
  products: Product[]; categories: Category[];
  warehouseStock: ReturnType<typeof useCRMStore>['warehouseStock'];
  offWarehouses: WarehouseType[];
  search: string; setSearch: (v: string) => void;
  catFilter: string; setCatFilter: (v: string) => void;
  onAdd: () => void; onEdit: (p: Product) => void;
  onAddCategory: () => void; onEditCategory: (c: Category) => void;
}) {
  const [view, setView] = useState<'products' | 'categories'>('products');

  const getStock = (productId: string) =>
    offWarehouses.reduce((sum, wh) =>
      sum + (warehouseStock.find(s => s.warehouseId === wh.id && s.productId === productId)?.quantity ?? 0), 0);

  const getCatName = (id: string) => {
    const cat = categories.find(c => c.id === id);
    if (!cat) return '—';
    if (cat.parentId) {
      const parent = categories.find(c => c.id === cat.parentId);
      return parent ? `${parent.name} / ${cat.name}` : cat.name;
    }
    return cat.name;
  };

  const filtered = products.filter(p => {
    if (catFilter !== 'all' && p.categoryId !== catFilter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.sku.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const rootCats = categories.filter(c => !c.parentId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1 bg-[#0f1117] rounded-lg p-1">
          <button onClick={() => setView('products')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${view === 'products' ? 'bg-[#1e2637] text-white' : 'text-[#4b5568] hover:text-white'}`}>
            Товары ({products.length})
          </button>
          <button onClick={() => setView('categories')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${view === 'categories' ? 'bg-[#1e2637] text-white' : 'text-[#4b5568] hover:text-white'}`}>
            Категории ({categories.length})
          </button>
        </div>
        <div className="flex gap-2">
          {view === 'products' && (
            <>
              <div className="relative">
                <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4b5568]" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск..." className="bg-[#1e2637] border border-[#252d3d] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-[#4b5568] focus:outline-none focus:border-[#3b82f6] w-44" />
              </div>
              <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="bg-[#1e2637] border border-[#252d3d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3b82f6] cursor-pointer">
                <option value="all">Все категории</option>
                {rootCats.map(c => (
                  <optgroup key={c.id} label={c.name}>
                    <option value={c.id}>{c.name}</option>
                    {categories.filter(sc => sc.parentId === c.id).map(sc => (
                      <option key={sc.id} value={sc.id}>  {sc.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <button onClick={onAdd} className="flex items-center gap-2 px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-sm font-medium transition-colors">
                <Icon name="Plus" size={14} />Товар
              </button>
            </>
          )}
          {view === 'categories' && (
            <button onClick={onAddCategory} className="flex items-center gap-2 px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-sm font-medium transition-colors">
              <Icon name="Plus" size={14} />Категория
            </button>
          )}
        </div>
      </div>

      {/* Список товаров */}
      {view === 'products' && (
        <div className="bg-[#161b27] border border-[#252d3d] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-[#0f1117] border-b border-[#252d3d]">
                {['Наименование', 'Артикул', 'Категория', 'Ед.', 'Цена', 'На складе', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-[#4b5568] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="py-12 text-center text-sm text-[#4b5568]">
                  {search || catFilter !== 'all' ? 'Ничего не найдено' : 'Товаров нет'}
                </td></tr>
              )}
              {filtered.map(p => {
                const stock = getStock(p.id);
                return (
                  <tr key={p.id} onClick={() => onEdit(p)} className="border-t border-[#252d3d] hover:bg-[#1e2637] cursor-pointer transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-white">{p.name}</td>
                    <td className="px-4 py-3 text-xs text-[#8892a4] font-mono">{p.sku}</td>
                    <td className="px-4 py-3 text-xs text-[#8892a4]">{getCatName(p.categoryId)}</td>
                    <td className="px-4 py-3 text-xs text-[#8892a4]">{p.unit}</td>
                    <td className="px-4 py-3 text-sm text-[#10b981] font-medium">{p.price.toLocaleString('ru-RU')} ₽</td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-semibold ${stock === 0 ? 'text-[#4b5568]' : stock <= 5 ? 'text-[#ef4444]' : stock <= 20 ? 'text-[#f59e0b]' : 'text-white'}`}>
                        {stock} {p.unit}
                      </span>
                      {stock === 0 && <span className="ml-1.5 text-[10px] text-[#ef4444] bg-[#ef4444]/10 px-1.5 py-0.5 rounded">нет</span>}
                      {stock > 0 && stock <= 5 && <span className="ml-1.5 text-[10px] text-[#f59e0b] bg-[#f59e0b]/10 px-1.5 py-0.5 rounded">мало</span>}
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <button onClick={() => onEdit(p)} className="p-1.5 hover:bg-[#252d3d] rounded text-[#4b5568] hover:text-white transition-colors">
                        <Icon name="Pencil" size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Список категорий */}
      {view === 'categories' && (
        <div className="space-y-2">
          {rootCats.length === 0 && (
            <div className="text-center py-12 text-sm text-[#4b5568]">Категорий нет</div>
          )}
          {rootCats.map(cat => {
            const subCats = categories.filter(c => c.parentId === cat.id);
            const catProducts = products.filter(p => p.categoryId === cat.id).length;
            const subProducts = subCats.reduce((s, sc) => s + products.filter(p => p.categoryId === sc.id).length, 0);
            return (
              <div key={cat.id} className="bg-[#161b27] border border-[#252d3d] rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 hover:bg-[#1e2637] cursor-pointer transition-colors" onClick={() => onEditCategory(cat)}>
                  <div className="flex items-center gap-3">
                    <Icon name="FolderOpen" size={16} className="text-[#f59e0b]" />
                    <span className="text-sm font-medium text-white">{cat.name}</span>
                    <span className="text-xs text-[#4b5568]">{catProducts + subProducts} товаров</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={e => { e.stopPropagation(); onEditCategory(cat); }} className="p-1.5 hover:bg-[#252d3d] rounded text-[#4b5568] hover:text-white transition-colors">
                      <Icon name="Pencil" size={13} />
                    </button>
                  </div>
                </div>
                {subCats.map(sc => (
                  <div key={sc.id} className="flex items-center justify-between px-4 py-2.5 pl-10 border-t border-[#252d3d] hover:bg-[#1e2637] cursor-pointer transition-colors" onClick={() => onEditCategory(sc)}>
                    <div className="flex items-center gap-3">
                      <Icon name="Folder" size={14} className="text-[#4b5568]" />
                      <span className="text-xs text-[#8892a4]">{sc.name}</span>
                      <span className="text-xs text-[#4b5568]">{products.filter(p => p.categoryId === sc.id).length} товаров</span>
                    </div>
                    <button onClick={e => { e.stopPropagation(); onEditCategory(sc); }} className="p-1.5 hover:bg-[#252d3d] rounded text-[#4b5568] hover:text-white transition-colors">
                      <Icon name="Pencil" size={13} />
                    </button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─────────── ИСТОРИЯ ОПЕРАЦИЙ ─────────── */
function HistoryTab({ ops, products, warehouses, employees, search, setSearch, whFilter, setWhFilter, opTypeFilter, setOpTypeFilter, dateFrom, setDateFrom, dateTo, setDateTo, offWarehouses }: {
  ops: StockOperation[]; products: Product[];
  warehouses: WarehouseType[]; employees: ReturnType<typeof useCRMStore>['employees'];
  search: string; setSearch: (v: string) => void;
  whFilter: string; setWhFilter: (v: string) => void;
  opTypeFilter: 'all' | StockOperationType; setOpTypeFilter: (v: 'all' | StockOperationType) => void;
  dateFrom: string; setDateFrom: (v: string) => void;
  dateTo: string; setDateTo: (v: string) => void;
  offWarehouses: WarehouseType[];
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4b5568]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по товару..." className="bg-[#1e2637] border border-[#252d3d] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-[#4b5568] focus:outline-none focus:border-[#3b82f6] w-48" />
        </div>
        <select value={opTypeFilter} onChange={e => setOpTypeFilter(e.target.value as 'all' | StockOperationType)} className="bg-[#1e2637] border border-[#252d3d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3b82f6] cursor-pointer">
          <option value="all">Все типы</option>
          {(Object.keys(OP_CONFIG) as StockOperationType[]).map(t => (
            <option key={t} value={t}>{OP_CONFIG[t].label}</option>
          ))}
        </select>
        <select value={whFilter} onChange={e => setWhFilter(e.target.value)} className="bg-[#1e2637] border border-[#252d3d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3b82f6] cursor-pointer">
          <option value="all">Все склады</option>
          {offWarehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-[#1e2637] border border-[#252d3d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3b82f6]" />
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-[#1e2637] border border-[#252d3d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3b82f6]" />
      </div>

      <div className="bg-[#161b27] border border-[#252d3d] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[#0f1117] border-b border-[#252d3d]">
              {['Дата', 'Тип', 'Товар', 'Склад', 'Кол-во', 'Сумма', 'Ответств.', 'Примечание'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-[#4b5568] uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ops.length === 0 && (
              <tr><td colSpan={8} className="py-14 text-center text-sm text-[#4b5568]">
                <Icon name="ClipboardList" size={32} className="mx-auto mb-2 opacity-20" />
                Нет операций
              </td></tr>
            )}
            {ops.map(op => {
              const p = products.find(p => p.id === op.productId);
              const wh = warehouses.find(w => w.id === op.warehouseId);
              const toWh = warehouses.find(w => w.id === op.toWarehouseId);
              const emp = employees.find(e => e.id === op.employeeId);
              const cfg = OP_CONFIG[op.type];
              return (
                <tr key={op.id} className="border-t border-[#252d3d] hover:bg-[#1e2637]/50 transition-colors">
                  <td className="px-4 py-3 text-xs text-[#8892a4] whitespace-nowrap">
                    {new Date(op.date).toLocaleDateString('ru-RU')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full border ${cfg.bg} ${cfg.color}`}>
                      {cfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-white">{p?.name || '—'}</div>
                    {p?.sku && <div className="text-[10px] text-[#4b5568] font-mono">{p.sku}</div>}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#8892a4]">
                    {wh?.name || '—'}
                    {toWh && <><Icon name="ArrowRight" size={9} className="inline mx-1" />{toWh.name}</>}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-white">{op.quantity} {p?.unit || ''}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-white">{op.amount.toLocaleString('ru-RU')} ₽</td>
                  <td className="px-4 py-3 text-xs text-[#8892a4]">
                    {emp ? `${emp.lastName} ${emp.firstName[0]}.` : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#8892a4] max-w-[120px] truncate">{op.notes || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─────────── ФОРМА ОПЕРАЦИИ ─────────── */
function OperationForm({ type, warehouses, products, categories, employees, onSave, onCancel }: {
  type: StockOperationType;
  warehouses: WarehouseType[]; products: Product[];
  categories: Category[];
  employees: ReturnType<typeof useCRMStore>['employees'];
  onSave: (data: Omit<StockOperation, 'id' | 'officeId' | 'createdAt'>) => void;
  onCancel: () => void;
}) {
  const cfg = OP_CONFIG[type];
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id || '');
  const [toWarehouseId, setToWarehouseId] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [employeeId, setEmployeeId] = useState(employees[0]?.id || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const selectedProduct = products.find(p => p.id === productId);

  const handleProductChange = (id: string) => {
    setProductId(id);
    const p = products.find(p => p.id === id);
    if (p) setPrice(String(p.price));
  };

  const amount = (parseFloat(quantity) || 0) * (parseFloat(price) || 0);

  const getCatName = (id: string) => {
    const cat = categories.find(c => c.id === id);
    if (!cat) return '';
    if (cat.parentId) {
      const parent = categories.find(c => c.id === cat.parentId);
      return parent ? `${parent.name} / ${cat.name}` : cat.name;
    }
    return cat.name;
  };

  const handleSave = () => {
    if (!warehouseId || !productId || !quantity) return;
    onSave({
      warehouseId,
      toWarehouseId: type === 'transfer' ? toWarehouseId : undefined,
      type,
      productId,
      quantity: parseFloat(quantity),
      price: parseFloat(price) || 0,
      amount,
      employeeId,
      date,
      notes,
    });
  };

  const rootCats = categories.filter(c => !c.parentId);

  return (
    <div className="space-y-4">
      {/* Тип операции */}
      <div className={`flex items-center gap-2 text-xs font-semibold px-3 py-2.5 rounded-lg border ${cfg.bg} ${cfg.color}`}>
        <Icon name={cfg.icon} size={14} />
        {cfg.label}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Склад {type === 'transfer' ? '(откуда)' : ''} *</label>
          <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)} className={inputCls + ' cursor-pointer'}>
            <option value="">— Выберите —</option>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
        {type === 'transfer' && (
          <div>
            <label className={labelCls}>Склад назначения *</label>
            <select value={toWarehouseId} onChange={e => setToWarehouseId(e.target.value)} className={inputCls + ' cursor-pointer'}>
              <option value="">— Выберите —</option>
              {warehouses.filter(w => w.id !== warehouseId).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
        )}
        {type !== 'transfer' && (
          <div>
            <label className={labelCls}>Дата *</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
          </div>
        )}
      </div>

      {type === 'transfer' && (
        <div>
          <label className={labelCls}>Дата *</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
        </div>
      )}

      <div>
        <label className={labelCls}>Товар *</label>
        <select value={productId} onChange={e => handleProductChange(e.target.value)} className={inputCls + ' cursor-pointer'}>
          <option value="">— Выберите товар —</option>
          {rootCats.map(cat => {
            const catProds = products.filter(p => p.categoryId === cat.id);
            const subCats = categories.filter(c => c.parentId === cat.id);
            const hasProds = catProds.length > 0 || subCats.some(sc => products.find(p => p.categoryId === sc.id));
            if (!hasProds) return null;
            return (
              <optgroup key={cat.id} label={cat.name}>
                {catProds.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                {subCats.map(sc =>
                  products.filter(p => p.categoryId === sc.id).map(p =>
                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                  )
                )}
              </optgroup>
            );
          })}
          {products.filter(p => !categories.find(c => c.id === p.categoryId)).map(p =>
            <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
          )}
        </select>
        {selectedProduct && (
          <div className="mt-1.5 text-xs text-[#4b5568]">
            {getCatName(selectedProduct.categoryId)} · {selectedProduct.unit}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Количество *</label>
          <div className="flex gap-2">
            <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} min="0.001" step="any" className={inputCls} placeholder="0" />
            {selectedProduct && <span className="flex items-center text-xs text-[#4b5568] px-2 bg-[#0f1117] border border-[#252d3d] rounded-lg">{selectedProduct.unit}</span>}
          </div>
        </div>
        <div>
          <label className={labelCls}>Цена за ед., ₽</label>
          <input type="number" value={price} onChange={e => setPrice(e.target.value)} min="0" className={inputCls} placeholder="0" />
        </div>
      </div>

      {quantity && price && (
        <div className="flex items-center justify-between bg-[#0f1117] border border-[#252d3d] rounded-xl px-4 py-3">
          <span className="text-xs text-[#4b5568]">Итого</span>
          <span className="text-lg font-bold text-white">{amount.toLocaleString('ru-RU')} ₽</span>
        </div>
      )}

      <div>
        <label className={labelCls}>Ответственный</label>
        <select value={employeeId} onChange={e => setEmployeeId(e.target.value)} className={inputCls + ' cursor-pointer'}>
          <option value="">— Выберите —</option>
          {employees.map(e => <option key={e.id} value={e.id}>{e.lastName} {e.firstName}</option>)}
        </select>
      </div>

      <div>
        <label className={labelCls}>Примечание</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={inputCls} placeholder="Необязательно..." />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={!warehouseId || !productId || !quantity || (type === 'transfer' && !toWarehouseId)}
          className={`flex-1 py-2.5 ${cfg.btnBg} disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors`}
        >
          Провести
        </button>
        <button onClick={onCancel} className="px-4 py-2.5 bg-[#1e2637] hover:bg-[#252d3d] text-[#8892a4] rounded-lg text-sm transition-colors">
          Отмена
        </button>
      </div>
    </div>
  );
}

/* ─────────── ФОРМА ТОВАРА ─────────── */
function ProductForm({ product, categories, onSave, onDelete, onCancel }: {
  product?: Product; categories: Category[];
  onSave: (data: Omit<Product, 'id'>) => void;
  onDelete?: () => void; onCancel: () => void;
}) {
  const [name, setName] = useState(product?.name || '');
  const [sku, setSku] = useState(product?.sku || '');
  const [categoryId, setCategoryId] = useState(product?.categoryId || '');
  const [unit, setUnit] = useState(product?.unit || 'шт');
  const [price, setPrice] = useState(String(product?.price || ''));
  const [description, setDescription] = useState(product?.description || '');

  const rootCats = categories.filter(c => !c.parentId);

  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Наименование *</label>
        <input value={name} onChange={e => setName(e.target.value)} className={inputCls} placeholder="Название товара" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Артикул (SKU)</label>
          <input value={sku} onChange={e => setSku(e.target.value)} className={inputCls} placeholder="KB-CAT5E" />
        </div>
        <div>
          <label className={labelCls}>Единица измерения</label>
          <select value={unit} onChange={e => setUnit(e.target.value)} className={inputCls + ' cursor-pointer'}>
            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Категория</label>
          <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className={inputCls + ' cursor-pointer'}>
            <option value="">Без категории</option>
            {rootCats.map(c => (
              <optgroup key={c.id} label={c.name}>
                <option value={c.id}>{c.name}</option>
                {categories.filter(sc => sc.parentId === c.id).map(sc => (
                  <option key={sc.id} value={sc.id}>  {sc.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Цена, ₽</label>
          <input type="number" value={price} onChange={e => setPrice(e.target.value)} min="0" className={inputCls} placeholder="0" />
        </div>
      </div>
      <div>
        <label className={labelCls}>Описание</label>
        <input value={description} onChange={e => setDescription(e.target.value)} className={inputCls} placeholder="Краткое описание" />
      </div>
      <div className="flex gap-3 pt-2">
        <button
          onClick={() => onSave({ name, sku, categoryId, unit, price: parseFloat(price) || 0, description })}
          disabled={!name}
          className="flex-1 py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Сохранить
        </button>
        <button onClick={onCancel} className="px-4 py-2.5 bg-[#1e2637] hover:bg-[#252d3d] text-[#8892a4] rounded-lg text-sm transition-colors">Отмена</button>
        {onDelete && (
          <button onClick={onDelete} className="px-4 py-2.5 bg-[#ef4444]/10 hover:bg-[#ef4444]/20 text-[#ef4444] rounded-lg text-sm transition-colors">
            <Icon name="Trash2" size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ─────────── ФОРМА СКЛАДА ─────────── */
function WarehouseForm({ warehouse, onSave, onDelete, onCancel }: {
  warehouse?: WarehouseType;
  onSave: (data: Omit<WarehouseType, 'id' | 'officeId'>) => void;
  onDelete?: () => void; onCancel: () => void;
}) {
  const [name, setName] = useState(warehouse?.name || '');
  const [address, setAddress] = useState(warehouse?.address || '');
  const [description, setDescription] = useState(warehouse?.description || '');

  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Название *</label>
        <input value={name} onChange={e => setName(e.target.value)} className={inputCls} placeholder="Основной склад" />
      </div>
      <div>
        <label className={labelCls}>Адрес</label>
        <input value={address} onChange={e => setAddress(e.target.value)} className={inputCls} placeholder="г. Абакан, ул. Ленина 1" />
      </div>
      <div>
        <label className={labelCls}>Описание</label>
        <input value={description} onChange={e => setDescription(e.target.value)} className={inputCls} placeholder="Описание склада" />
      </div>
      <div className="flex gap-3 pt-2">
        <button onClick={() => onSave({ name, address, description })} disabled={!name} className="flex-1 py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
          Сохранить
        </button>
        <button onClick={onCancel} className="px-4 py-2.5 bg-[#1e2637] hover:bg-[#252d3d] text-[#8892a4] rounded-lg text-sm transition-colors">Отмена</button>
        {onDelete && (
          <button onClick={onDelete} className="px-4 py-2.5 bg-[#ef4444]/10 hover:bg-[#ef4444]/20 text-[#ef4444] rounded-lg text-sm transition-colors">
            <Icon name="Trash2" size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ─────────── ФОРМА КАТЕГОРИИ ─────────── */
function CategoryForm({ category, categories, onSave, onDelete, onCancel }: {
  category?: Category; categories: Category[];
  onSave: (data: Omit<Category, 'id'>) => void;
  onDelete?: () => void; onCancel: () => void;
}) {
  const [name, setName] = useState(category?.name || '');
  const [parentId, setParentId] = useState(category?.parentId || '');

  const rootCats = categories.filter(c => !c.parentId && c.id !== category?.id);

  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Название *</label>
        <input value={name} onChange={e => setName(e.target.value)} className={inputCls} placeholder="Кабели и провода" />
      </div>
      <div>
        <label className={labelCls}>Родительская категория</label>
        <select value={parentId} onChange={e => setParentId(e.target.value)} className={inputCls + ' cursor-pointer'}>
          <option value="">Корневая (без родителя)</option>
          {rootCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="flex gap-3 pt-2">
        <button onClick={() => onSave({ name, parentId: parentId || undefined })} disabled={!name} className="flex-1 py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
          Сохранить
        </button>
        <button onClick={onCancel} className="px-4 py-2.5 bg-[#1e2637] hover:bg-[#252d3d] text-[#8892a4] rounded-lg text-sm transition-colors">Отмена</button>
        {onDelete && (
          <button onClick={onDelete} className="px-4 py-2.5 bg-[#ef4444]/10 hover:bg-[#ef4444]/20 text-[#ef4444] rounded-lg text-sm transition-colors">
            <Icon name="Trash2" size={14} />
          </button>
        )}
      </div>
    </div>
  );
}