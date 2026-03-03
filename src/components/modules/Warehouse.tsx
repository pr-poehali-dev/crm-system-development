import { useState, useMemo, useRef } from 'react';
import { useCRMStore } from '@/store/crmStore';
import {
  Warehouse as WarehouseType, Category, Product, StockOperationType, StockOperationItem, Supplier,
} from '@/types/crm';
import Icon from '@/components/ui/icon';

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

const inputCls = 'w-full bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] placeholder-[#4b5568] focus:outline-none focus:border-[#3b82f6] transition-colors';
const labelCls = 'block text-xs font-medium text-[#8892a4] mb-1.5 uppercase tracking-wide';

const OP_CONFIG: Record<StockOperationType, { label: string; icon: string; color: string; bg: string; btnBg: string }> = {
  receipt:  { label: 'Оприходование', icon: 'ArrowDownToLine', color: 'text-[#10b981]', bg: 'bg-[#10b981]/15 border-[#10b981]/30', btnBg: 'bg-[#10b981] hover:bg-[#059669]' },
  writeoff: { label: 'Списание',      icon: 'ArrowUpFromLine', color: 'text-[#ef4444]', bg: 'bg-[#ef4444]/15 border-[#ef4444]/30', btnBg: 'bg-[#ef4444] hover:bg-[#dc2626]' },
  transfer: { label: 'Перемещение',   icon: 'ArrowLeftRight',  color: 'text-[#3b82f6]', bg: 'bg-[#3b82f6]/15 border-[#3b82f6]/30', btnBg: 'bg-[#3b82f6] hover:bg-[#2563eb]' },
  sale:     { label: 'Продажа',       icon: 'ShoppingCart',    color: 'text-[#f59e0b]', bg: 'bg-[#f59e0b]/15 border-[#f59e0b]/30', btnBg: 'bg-[#f59e0b] hover:bg-[#d97706]' },
  return:   { label: 'Возврат',       icon: 'Undo2',           color: 'text-[#8b5cf6]', bg: 'bg-[#8b5cf6]/15 border-[#8b5cf6]/30', btnBg: 'bg-[#8b5cf6] hover:bg-[#7c3aed]' },
};

const UNITS = ['шт', 'м', 'кг', 'л', 'уп', 'рул', 'компл'];

type Tab = 'residue' | 'income' | 'outcome' | 'move' | 'products' | 'operations';
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'residue',    label: 'Остатки',        icon: 'LayoutGrid' },
  { id: 'income',     label: 'Оприходования',  icon: 'ArrowDownToLine' },
  { id: 'outcome',    label: 'Списание',        icon: 'ArrowUpFromLine' },
  { id: 'move',       label: 'Перемещение',     icon: 'ArrowLeftRight' },
  { id: 'products',   label: 'Номенклатура',    icon: 'Package' },
  { id: 'operations', label: 'История',         icon: 'ClipboardList' },
];

interface Props {
  onOpenPanel: (title: string, content: React.ReactNode) => void;
  onClosePanel: () => void;
}

/* ─── Компонент поиска + выпадающего списка товаров ─── */
interface ProductSearchProps {
  products: Product[];
  onSelect: (p: Product) => void;
  placeholder?: string;
}
function ProductSearch({ products, onSelect, placeholder = 'Поиск товара...' }: ProductSearchProps) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!q.trim()) return products.slice(0, 40);
    const lq = q.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(lq) ||
      p.sku.toLowerCase().includes(lq)
    ).slice(0, 40);
  }, [q, products]);

  return (
    <div className="relative" ref={ref}>
      <input
        value={q}
        onChange={e => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className={inputCls}
        placeholder={placeholder}
      />
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-[#161b27] border border-[#252d3d] rounded-xl shadow-xl max-h-64 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-3 text-sm text-[#4b5568]">Ничего не найдено</div>
          ) : filtered.map(p => (
            <button
              key={p.id}
              onMouseDown={() => { onSelect(p); setQ(''); setOpen(false); }}
              className="w-full text-left px-3 py-2 hover:bg-[#1e2637] transition-colors"
            >
              <div className="text-sm text-[var(--foreground)]">{p.name}</div>
              <div className="text-xs text-[#4b5568]">{p.sku} · {p.unit}{p.isSerial ? ' · серийный' : ''}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Строка товара в таблице операции ─── */
interface ItemRowProps {
  item: StockOperationItem & { _product?: Product; _serials?: string };
  products: Product[];
  showPrice: boolean;
  onChange: (updated: StockOperationItem & { _product?: Product; _serials?: string }) => void;
  onRemove: () => void;
}
function ItemRow({ item, showPrice, onChange, onRemove }: ItemRowProps) {
  const product = item._product;
  return (
    <div className="grid gap-2 items-start" style={{ gridTemplateColumns: showPrice ? '1fr 80px 100px 90px 28px' : '1fr 80px 28px' }}>
      <div>
        <div className="text-sm text-[var(--foreground)] font-medium">{product?.name || '—'}</div>
        <div className="text-xs text-[#4b5568]">{product?.sku}</div>
        {product?.isSerial && (
          <input
            value={item._serials || ''}
            onChange={e => onChange({ ...item, _serials: e.target.value })}
            className={inputCls + ' mt-1 text-xs'}
            placeholder="Серийные номера через запятую"
          />
        )}
      </div>
      <input
        type="number"
        min={1}
        value={item.quantity}
        onChange={e => {
          const qty = Math.max(1, +e.target.value);
          onChange({ ...item, quantity: qty, amount: qty * (item.price || 0) });
        }}
        className={inputCls + ' text-center'}
      />
      {showPrice && (
        <>
          <input
            type="number"
            min={0}
            value={item.price}
            onChange={e => {
              const price = +e.target.value;
              onChange({ ...item, price, amount: item.quantity * price });
            }}
            className={inputCls}
            placeholder="Цена"
          />
          <div className="flex items-center h-[38px] text-sm text-[#10b981] font-medium">
            {(item.amount).toLocaleString('ru-RU')} ₽
          </div>
        </>
      )}
      <button onClick={onRemove} className="flex items-center justify-center h-[38px] text-[#ef4444] hover:bg-[#ef4444]/10 rounded-lg transition-colors">
        <Icon name="Trash2" size={14} />
      </button>
    </div>
  );
}

/* ─── Форма оприходования ─── */
interface ReceiptFormProps {
  warehouses: WarehouseType[];
  products: Product[];
  suppliers: Supplier[];
  employeeId: string;
  onSave: (data: Parameters<ReturnType<typeof useCRMStore>['addStockOperation']>[0]) => void;
  onCancel: () => void;
}
function ReceiptForm({ warehouses, products, suppliers, employeeId, onSave, onCancel }: ReceiptFormProps) {
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id || '');
  const [supplierId, setSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [items, setItems] = useState<Array<StockOperationItem & { _product?: Product; _serials?: string }>>([]);
  const [addingProduct, setAddingProduct] = useState<Product | null>(null);
  const [addQty, setAddQty] = useState(1);
  const [addPrice, setAddPrice] = useState(0);
  const [addSerials, setAddSerials] = useState('');

  const totalAmount = items.reduce((s, i) => s + i.amount, 0);

  const handleSelectProduct = (p: Product) => setAddingProduct(p);

  const handleAddItem = () => {
    if (!addingProduct) return;
    const serials = addSerials.split(',').map(s => s.trim()).filter(Boolean);
    setItems(prev => [...prev, {
      productId: addingProduct.id,
      quantity: addQty,
      price: addPrice,
      amount: addQty * addPrice,
      serialNumbers: serials.length > 0 ? serials : undefined,
      _product: addingProduct,
      _serials: addSerials,
    }]);
    setAddingProduct(null);
    setAddQty(1);
    setAddPrice(0);
    setAddSerials('');
  };

  const handleSave = () => {
    if (!warehouseId || items.length === 0) return;
    const totalQty = items.reduce((s, i) => s + i.quantity, 0);
    onSave({
      id: uid(),
      officeId: '',
      type: 'receipt',
      warehouseId,
      productId: items[0].productId,
      quantity: totalQty,
      price: items[0].price,
      amount: totalAmount,
      employeeId,
      date: new Date().toISOString().split('T')[0],
      notes: '',
      createdAt: new Date().toISOString(),
      supplierId: supplierId || undefined,
      invoiceNumber: invoiceNumber || undefined,
      invoiceDate: invoiceDate || undefined,
      items: items.map(i => ({
        productId: i.productId,
        quantity: i.quantity,
        price: i.price,
        amount: i.amount,
        serialNumbers: i._serials ? i._serials.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      })),
    });
  };

  return (
    <div className="space-y-4">
      {/* Склад */}
      <div>
        <label className={labelCls}>Склад *</label>
        <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)} className={inputCls + ' cursor-pointer'}>
          {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </div>

      {/* Поставщик + Накладная */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Поставщик</label>
          <select value={supplierId} onChange={e => setSupplierId(e.target.value)} className={inputCls + ' cursor-pointer'}>
            <option value="">— Выберите —</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>№ Накладной</label>
          <input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} className={inputCls} placeholder="№" />
        </div>
      </div>

      <div>
        <label className={labelCls}>От (дата накладной)</label>
        <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className={inputCls} />
      </div>

      {/* Таблица товаров */}
      <div>
        <label className={labelCls}>Товары *</label>
        {items.length > 0 && (
          <div className="mb-3 space-y-2 bg-[var(--card)] border border-[var(--border)] rounded-xl p-3">
            <div className="grid text-[10px] text-[#4b5568] font-semibold uppercase mb-1" style={{ gridTemplateColumns: '1fr 80px 100px 90px 28px' }}>
              <span>Наименование</span><span className="text-center">Кол-во</span><span>Цена</span><span>Сумма</span><span />
            </div>
            {items.map((item, idx) => (
              <ItemRow
                key={idx}
                item={item}
                products={products}
                showPrice={true}
                onChange={updated => setItems(prev => prev.map((it, i) => i === idx ? updated : it))}
                onRemove={() => setItems(prev => prev.filter((_, i) => i !== idx))}
              />
            ))}
            <div className="flex justify-end pt-1 border-t border-[var(--border)]">
              <span className="text-sm font-semibold text-[#10b981]">Итого: {totalAmount.toLocaleString('ru-RU')} ₽</span>
            </div>
          </div>
        )}

        {/* Добавить товар */}
        {!addingProduct ? (
          <ProductSearch products={products} onSelect={handleSelectProduct} placeholder="Поиск для добавления товара..." />
        ) : (
          <div className="bg-[var(--card)] border border-[#3b82f6]/40 rounded-xl p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-[var(--foreground)]">{addingProduct.name}</div>
                <div className="text-xs text-[#4b5568]">{addingProduct.sku}</div>
              </div>
              <button onClick={() => setAddingProduct(null)} className="p-1 text-[#4b5568] hover:text-white rounded"><Icon name="X" size={14} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-[#4b5568] mb-1 block">Количество</label>
                <input type="number" min={1} value={addQty} onChange={e => setAddQty(Math.max(1, +e.target.value))} className={inputCls} />
              </div>
              <div>
                <label className="text-[10px] text-[#4b5568] mb-1 block">Закупочная цена</label>
                <input type="number" min={0} value={addPrice} onChange={e => setAddPrice(+e.target.value)} className={inputCls} />
              </div>
            </div>
            {addingProduct.isSerial && (
              <div>
                <label className="text-[10px] text-[#4b5568] mb-1 block">Серийные номера (через запятую, необязательно)</label>
                <input value={addSerials} onChange={e => setAddSerials(e.target.value)} className={inputCls} placeholder="SN001, SN002, ..." />
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#4b5568]">Сумма: <b className="text-[#10b981]">{(addQty * addPrice).toLocaleString('ru-RU')} ₽</b></span>
              <button onClick={handleAddItem} className="px-3 py-1.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-sm transition-colors">
                Добавить
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <button onClick={handleSave} disabled={!warehouseId || items.length === 0} className="flex-1 py-2.5 bg-[#10b981] hover:bg-[#059669] disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
          Сохранить оприходование
        </button>
        <button onClick={onCancel} className="px-4 py-2.5 bg-[#1e2637] hover:bg-[#252d3d] text-[#8892a4] hover:text-white rounded-lg text-sm transition-colors">
          Отмена
        </button>
      </div>
    </div>
  );
}

/* ─── Форма списания ─── */
interface WriteoffFormProps {
  warehouses: WarehouseType[];
  products: Product[];
  warehouseStock: ReturnType<typeof useCRMStore>['warehouseStock'];
  employeeId: string;
  onSave: (data: Parameters<ReturnType<typeof useCRMStore>['addStockOperation']>[0]) => void;
  onCancel: () => void;
}
function WriteoffForm({ warehouses, products, warehouseStock, employeeId, onSave, onCancel }: WriteoffFormProps) {
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id || '');
  const [items, setItems] = useState<Array<StockOperationItem & { _product?: Product; _serials?: string }>>([]);
  const [notes, setNotes] = useState('');
  const [addingProduct, setAddingProduct] = useState<Product | null>(null);
  const [addQty, setAddQty] = useState(1);
  const [addSerials, setAddSerials] = useState('');

  const availableProducts = products.filter(p =>
    (warehouseStock.find(s => s.warehouseId === warehouseId && s.productId === p.id)?.quantity || 0) > 0
  );

  const handleAddItem = () => {
    if (!addingProduct) return;
    setItems(prev => [...prev, {
      productId: addingProduct.id,
      quantity: addQty,
      price: 0,
      amount: 0,
      _product: addingProduct,
      _serials: addSerials,
    }]);
    setAddingProduct(null);
    setAddQty(1);
    setAddSerials('');
  };

  const handleSave = () => {
    if (!warehouseId || items.length === 0 || !notes.trim()) return;
    const totalQty = items.reduce((s, i) => s + i.quantity, 0);
    onSave({
      id: uid(),
      officeId: '',
      type: 'writeoff',
      warehouseId,
      productId: items[0].productId,
      quantity: totalQty,
      price: 0,
      amount: 0,
      employeeId,
      date: new Date().toISOString().split('T')[0],
      notes,
      createdAt: new Date().toISOString(),
      items: items.map(i => ({
        productId: i.productId,
        quantity: i.quantity,
        price: 0,
        amount: 0,
        serialNumbers: i._serials ? i._serials.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      })),
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Склад *</label>
        <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)} className={inputCls + ' cursor-pointer'}>
          {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </div>

      <div>
        <label className={labelCls}>Товары *</label>
        {items.length > 0 && (
          <div className="mb-3 space-y-2 bg-[var(--card)] border border-[var(--border)] rounded-xl p-3">
            <div className="grid text-[10px] text-[#4b5568] font-semibold uppercase mb-1" style={{ gridTemplateColumns: '1fr 80px 28px' }}>
              <span>Наименование</span><span className="text-center">Кол-во</span><span />
            </div>
            {items.map((item, idx) => (
              <ItemRow
                key={idx}
                item={item}
                products={products}
                showPrice={false}
                onChange={updated => setItems(prev => prev.map((it, i) => i === idx ? updated : it))}
                onRemove={() => setItems(prev => prev.filter((_, i) => i !== idx))}
              />
            ))}
          </div>
        )}

        {!addingProduct ? (
          <ProductSearch products={availableProducts} onSelect={p => setAddingProduct(p)} placeholder="Поиск товара на складе..." />
        ) : (
          <div className="bg-[var(--card)] border border-[#ef4444]/40 rounded-xl p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-[var(--foreground)]">{addingProduct.name}</div>
                <div className="text-xs text-[#4b5568]">
                  Остаток: {warehouseStock.find(s => s.warehouseId === warehouseId && s.productId === addingProduct.id)?.quantity || 0} {addingProduct.unit}
                </div>
              </div>
              <button onClick={() => setAddingProduct(null)} className="p-1 text-[#4b5568] hover:text-white rounded"><Icon name="X" size={14} /></button>
            </div>
            <div>
              <label className="text-[10px] text-[#4b5568] mb-1 block">Количество</label>
              <input type="number" min={1} value={addQty} onChange={e => setAddQty(Math.max(1, +e.target.value))} className={inputCls} />
            </div>
            {addingProduct.isSerial && (
              <div>
                <label className="text-[10px] text-[#4b5568] mb-1 block">Серийные номера (через запятую)</label>
                <input value={addSerials} onChange={e => setAddSerials(e.target.value)} className={inputCls} placeholder="SN001, SN002, ..." />
              </div>
            )}
            <div className="flex justify-end">
              <button onClick={handleAddItem} className="px-3 py-1.5 bg-[#ef4444] hover:bg-[#dc2626] text-white rounded-lg text-sm transition-colors">
                Добавить
              </button>
            </div>
          </div>
        )}
      </div>

      <div>
        <label className={labelCls}>Комментарий *</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className={inputCls} placeholder="Причина списания (обязательно)" />
      </div>

      <div className="flex gap-2 pt-2">
        <button onClick={handleSave} disabled={!warehouseId || items.length === 0 || !notes.trim()} className="flex-1 py-2.5 bg-[#ef4444] hover:bg-[#dc2626] disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
          Списать
        </button>
        <button onClick={onCancel} className="px-4 py-2.5 bg-[#1e2637] hover:bg-[#252d3d] text-[#8892a4] hover:text-white rounded-lg text-sm transition-colors">
          Отмена
        </button>
      </div>
    </div>
  );
}

/* ─── Форма перемещения ─── */
interface TransferFormProps {
  warehouses: WarehouseType[];
  products: Product[];
  warehouseStock: ReturnType<typeof useCRMStore>['warehouseStock'];
  employeeId: string;
  onSave: (data: Parameters<ReturnType<typeof useCRMStore>['addStockOperation']>[0]) => void;
  onCancel: () => void;
}
function TransferForm({ warehouses, products, warehouseStock, employeeId, onSave, onCancel }: TransferFormProps) {
  const [fromId, setFromId] = useState(warehouses[0]?.id || '');
  const [toId, setToId] = useState(warehouses[1]?.id || warehouses[0]?.id || '');
  const [items, setItems] = useState<Array<StockOperationItem & { _product?: Product; _serials?: string }>>([]);
  const [addingProduct, setAddingProduct] = useState<Product | null>(null);
  const [addQty, setAddQty] = useState(1);
  const [addSerials, setAddSerials] = useState('');

  const availableProducts = products.filter(p =>
    (warehouseStock.find(s => s.warehouseId === fromId && s.productId === p.id)?.quantity || 0) > 0
  );

  const handleAddItem = () => {
    if (!addingProduct) return;
    setItems(prev => [...prev, {
      productId: addingProduct.id,
      quantity: addQty,
      price: 0,
      amount: 0,
      _product: addingProduct,
      _serials: addSerials,
    }]);
    setAddingProduct(null);
    setAddQty(1);
    setAddSerials('');
  };

  const handleSave = () => {
    if (!fromId || !toId || fromId === toId || items.length === 0) return;
    const totalQty = items.reduce((s, i) => s + i.quantity, 0);
    onSave({
      id: uid(),
      officeId: '',
      type: 'transfer',
      warehouseId: fromId,
      toWarehouseId: toId,
      productId: items[0].productId,
      quantity: totalQty,
      price: 0,
      amount: 0,
      employeeId,
      date: new Date().toISOString().split('T')[0],
      notes: '',
      createdAt: new Date().toISOString(),
      items: items.map(i => ({
        productId: i.productId,
        quantity: i.quantity,
        price: 0,
        amount: 0,
        serialNumbers: i._serials ? i._serials.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      })),
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Откуда *</label>
          <select value={fromId} onChange={e => setFromId(e.target.value)} className={inputCls + ' cursor-pointer'}>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Куда *</label>
          <select value={toId} onChange={e => setToId(e.target.value)} className={inputCls + ' cursor-pointer'}>
            {warehouses.filter(w => w.id !== fromId).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className={labelCls}>Товары *</label>
        {items.length > 0 && (
          <div className="mb-3 space-y-2 bg-[var(--card)] border border-[var(--border)] rounded-xl p-3">
            {items.map((item, idx) => (
              <ItemRow
                key={idx}
                item={item}
                products={products}
                showPrice={false}
                onChange={updated => setItems(prev => prev.map((it, i) => i === idx ? updated : it))}
                onRemove={() => setItems(prev => prev.filter((_, i) => i !== idx))}
              />
            ))}
          </div>
        )}

        {!addingProduct ? (
          <ProductSearch products={availableProducts} onSelect={p => setAddingProduct(p)} placeholder="Поиск товара для перемещения..." />
        ) : (
          <div className="bg-[var(--card)] border border-[#3b82f6]/40 rounded-xl p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-[var(--foreground)]">{addingProduct.name}</div>
                <div className="text-xs text-[#4b5568]">
                  Остаток: {warehouseStock.find(s => s.warehouseId === fromId && s.productId === addingProduct.id)?.quantity || 0} {addingProduct.unit}
                </div>
              </div>
              <button onClick={() => setAddingProduct(null)} className="p-1 text-[#4b5568] hover:text-white rounded"><Icon name="X" size={14} /></button>
            </div>
            <div>
              <label className="text-[10px] text-[#4b5568] mb-1 block">Количество</label>
              <input type="number" min={1} value={addQty} onChange={e => setAddQty(Math.max(1, +e.target.value))} className={inputCls} />
            </div>
            {addingProduct.isSerial && (
              <div>
                <label className="text-[10px] text-[#4b5568] mb-1 block">Серийные номера (через запятую)</label>
                <input value={addSerials} onChange={e => setAddSerials(e.target.value)} className={inputCls} placeholder="SN001, SN002, ..." />
              </div>
            )}
            <div className="flex justify-end">
              <button onClick={handleAddItem} className="px-3 py-1.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-sm transition-colors">
                Добавить
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <button onClick={handleSave} disabled={!fromId || !toId || fromId === toId || items.length === 0} className="flex-1 py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
          Переместить
        </button>
        <button onClick={onCancel} className="px-4 py-2.5 bg-[#1e2637] hover:bg-[#252d3d] text-[#8892a4] hover:text-white rounded-lg text-sm transition-colors">
          Отмена
        </button>
      </div>
    </div>
  );
}

/* ─── Форма товара (Номенклатура) ─── */
interface ProductFormProps {
  product?: Product;
  categories: Category[];
  onSave: (data: Omit<Product, 'id'>) => void;
  onDelete?: () => void;
  onCancel: () => void;
}
function ProductForm({ product, categories, onSave, onDelete, onCancel }: ProductFormProps) {
  const [name, setName] = useState(product?.name || '');
  const [sku, setSku] = useState(product?.sku || '');
  const [categoryId, setCategoryId] = useState(product?.categoryId || categories[0]?.id || '');
  const [unit, setUnit] = useState(product?.unit || 'шт');
  const [price, setPrice] = useState(product?.price || 0);
  const [description, setDescription] = useState(product?.description || '');
  const [isSerial, setIsSerial] = useState(product?.isSerial || false);
  const [photoUrl, setPhotoUrl] = useState(product?.photoUrl || '');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setPhotoUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      {/* Фото */}
      <div className="flex items-center gap-4">
        <div
          onClick={() => fileRef.current?.click()}
          className="w-20 h-20 rounded-xl border-2 border-dashed border-[#252d3d] hover:border-[#3b82f6] cursor-pointer flex items-center justify-center overflow-hidden flex-shrink-0 transition-colors"
        >
          {photoUrl ? (
            <img src={photoUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <Icon name="Camera" size={24} className="text-[#4b5568]" />
          )}
        </div>
        <div className="flex-1">
          <div className="text-sm text-[var(--foreground)] font-medium mb-1">Фотография товара</div>
          <div className="text-xs text-[#4b5568] mb-2">Нажмите для загрузки</div>
          {photoUrl && (
            <button onClick={() => setPhotoUrl('')} className="text-xs text-[#ef4444] hover:underline">Удалить фото</button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>

      <div>
        <label className={labelCls}>Наименование *</label>
        <input value={name} onChange={e => setName(e.target.value)} className={inputCls} placeholder="Название товара" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Артикул</label>
          <input value={sku} onChange={e => setSku(e.target.value)} className={inputCls} placeholder="SKU-001" />
        </div>
        <div>
          <label className={labelCls}>Единица</label>
          <select value={unit} onChange={e => setUnit(e.target.value)} className={inputCls + ' cursor-pointer'}>
            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Категория</label>
          <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className={inputCls + ' cursor-pointer'}>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Цена (₽)</label>
          <input type="number" min={0} value={price} onChange={e => setPrice(+e.target.value)} className={inputCls} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Описание</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className={inputCls} />
      </div>

      {/* Серийный учёт */}
      <label className="flex items-center gap-3 cursor-pointer select-none">
        <div
          onClick={() => setIsSerial(!isSerial)}
          className={`w-10 h-5 rounded-full transition-colors flex items-center px-0.5 ${isSerial ? 'bg-[#3b82f6]' : 'bg-[#252d3d]'}`}
        >
          <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${isSerial ? 'translate-x-5' : 'translate-x-0'}`} />
        </div>
        <div>
          <div className="text-sm text-[var(--foreground)] font-medium">Вести серийный учёт</div>
          <div className="text-xs text-[#4b5568]">Каждая единица учитывается по серийному номеру</div>
        </div>
      </label>

      <div className="flex gap-2 pt-2">
        <button onClick={() => onSave({ name, sku, categoryId, unit, price, description, isSerial, photoUrl: photoUrl || undefined })} disabled={!name} className="flex-1 py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
          {product ? 'Сохранить' : 'Создать товар'}
        </button>
        <button onClick={onCancel} className="px-4 py-2.5 bg-[#1e2637] hover:bg-[#252d3d] text-[#8892a4] hover:text-white rounded-lg text-sm transition-colors">
          Отмена
        </button>
        {onDelete && (
          <button onClick={onDelete} className="px-3 py-2.5 bg-[#ef4444]/10 hover:bg-[#ef4444]/20 text-[#ef4444] rounded-lg text-sm transition-colors">
            <Icon name="Trash2" size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Форма склада ─── */
interface WarehouseFormProps {
  warehouse?: WarehouseType;
  onSave: (data: Omit<WarehouseType, 'id' | 'officeId'>) => void;
  onDelete?: () => void;
  onCancel: () => void;
}
function WarehouseForm({ warehouse, onSave, onDelete, onCancel }: WarehouseFormProps) {
  const [name, setName] = useState(warehouse?.name || '');
  const [address, setAddress] = useState(warehouse?.address || '');
  const [description, setDescription] = useState(warehouse?.description || '');
  return (
    <div className="space-y-4">
      <div><label className={labelCls}>Название *</label><input value={name} onChange={e => setName(e.target.value)} className={inputCls} /></div>
      <div><label className={labelCls}>Адрес</label><input value={address} onChange={e => setAddress(e.target.value)} className={inputCls} /></div>
      <div><label className={labelCls}>Описание</label><textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className={inputCls} /></div>
      <div className="flex gap-2 pt-2">
        <button onClick={() => onSave({ name, address, description })} disabled={!name} className="flex-1 py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
          {warehouse ? 'Сохранить' : 'Создать склад'}
        </button>
        <button onClick={onCancel} className="px-4 py-2.5 bg-[#1e2637] text-[#8892a4] rounded-lg text-sm transition-colors">Отмена</button>
        {onDelete && <button onClick={onDelete} className="px-3 py-2.5 bg-[#ef4444]/10 text-[#ef4444] rounded-lg text-sm transition-colors"><Icon name="Trash2" size={14} /></button>}
      </div>
    </div>
  );
}

/* ─── Форма категории ─── */
interface CategoryFormProps {
  category?: Category;
  categories: Category[];
  onSave: (data: Omit<Category, 'id'>) => void;
  onDelete?: () => void;
  onCancel: () => void;
}
function CategoryForm({ category, categories, onSave, onDelete, onCancel }: CategoryFormProps) {
  const [name, setName] = useState(category?.name || '');
  const [parentId, setParentId] = useState(category?.parentId || '');
  return (
    <div className="space-y-4">
      <div><label className={labelCls}>Название *</label><input value={name} onChange={e => setName(e.target.value)} className={inputCls} /></div>
      <div>
        <label className={labelCls}>Родительская категория</label>
        <select value={parentId} onChange={e => setParentId(e.target.value)} className={inputCls + ' cursor-pointer'}>
          <option value="">— Корневая —</option>
          {categories.filter(c => c.id !== category?.id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="flex gap-2 pt-2">
        <button onClick={() => onSave({ name, parentId: parentId || undefined })} disabled={!name} className="flex-1 py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
          {category ? 'Сохранить' : 'Создать категорию'}
        </button>
        <button onClick={onCancel} className="px-4 py-2.5 bg-[#1e2637] text-[#8892a4] rounded-lg text-sm transition-colors">Отмена</button>
        {onDelete && <button onClick={onDelete} className="px-3 py-2.5 bg-[#ef4444]/10 text-[#ef4444] rounded-lg text-sm transition-colors"><Icon name="Trash2" size={14} /></button>}
      </div>
    </div>
  );
}

/* ─── Форма поставщика ─── */
interface SupplierFormProps {
  supplier?: Supplier;
  onSave: (data: Omit<Supplier, 'id'>) => void;
  onDelete?: () => void;
  onCancel: () => void;
}
function SupplierForm({ supplier, onSave, onDelete, onCancel }: SupplierFormProps) {
  const [name, setName] = useState(supplier?.name || '');
  const [inn, setInn] = useState(supplier?.inn || '');
  const [phone, setPhone] = useState(supplier?.phone || '');
  const [email, setEmail] = useState(supplier?.email || '');
  const [address, setAddress] = useState(supplier?.address || '');
  const [contactPerson, setContactPerson] = useState(supplier?.contactPerson || '');
  const [notes, setNotes] = useState(supplier?.notes || '');
  return (
    <div className="space-y-4">
      <div><label className={labelCls}>Название *</label><input value={name} onChange={e => setName(e.target.value)} className={inputCls} placeholder="ООО Поставщик" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={labelCls}>ИНН</label><input value={inn} onChange={e => setInn(e.target.value)} className={inputCls} /></div>
        <div><label className={labelCls}>Телефон</label><input value={phone} onChange={e => setPhone(e.target.value)} className={inputCls} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={labelCls}>Email</label><input value={email} onChange={e => setEmail(e.target.value)} className={inputCls} /></div>
        <div><label className={labelCls}>Контактное лицо</label><input value={contactPerson} onChange={e => setContactPerson(e.target.value)} className={inputCls} /></div>
      </div>
      <div><label className={labelCls}>Адрес</label><input value={address} onChange={e => setAddress(e.target.value)} className={inputCls} /></div>
      <div><label className={labelCls}>Примечания</label><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={inputCls} /></div>
      <div className="flex gap-2 pt-2">
        <button onClick={() => onSave({ name, inn, phone, email, address, contactPerson, notes })} disabled={!name} className="flex-1 py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
          {supplier ? 'Сохранить' : 'Создать поставщика'}
        </button>
        <button onClick={onCancel} className="px-4 py-2.5 bg-[#1e2637] text-[#8892a4] rounded-lg text-sm transition-colors">Отмена</button>
        {onDelete && <button onClick={onDelete} className="px-3 py-2.5 bg-[#ef4444]/10 text-[#ef4444] rounded-lg text-sm transition-colors"><Icon name="Trash2" size={14} /></button>}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   ГЛАВНЫЙ КОМПОНЕНТ
════════════════════════════════════════════ */
export default function WarehouseModule({ onOpenPanel, onClosePanel }: Props) {
  const store = useCRMStore();
  const { currentOfficeId, warehouses, categories, products, stockOperations, warehouseStock, employees, suppliers } = store;
  const [tab, setTab] = useState<Tab>('residue');
  const [search, setSearch] = useState('');
  const [whFilter, setWhFilter] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [opTypeFilter, setOpTypeFilter] = useState<'all' | StockOperationType>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const offWarehouses = warehouses.filter(w => w.officeId === currentOfficeId);

  const getStock = (warehouseId: string, productId: string) =>
    warehouseStock.find(s => s.warehouseId === warehouseId && s.productId === productId)?.quantity ?? 0;

  const getSerials = (warehouseId: string, productId: string) =>
    warehouseStock.find(s => s.warehouseId === warehouseId && s.productId === productId)?.serialNumbers || [];

  const offOps = stockOperations.filter(o => o.officeId === currentOfficeId);

  const filteredOps = useMemo(() => {
    let ops = offOps;
    if (tab === 'income') ops = ops.filter(o => o.type === 'receipt');
    else if (tab === 'outcome') ops = ops.filter(o => o.type === 'writeoff');
    else if (tab === 'move') ops = ops.filter(o => o.type === 'transfer');
    else if (tab === 'operations') {
      if (opTypeFilter !== 'all') ops = ops.filter(o => o.type === opTypeFilter);
    }
    if (whFilter) ops = ops.filter(o => o.warehouseId === whFilter || o.toWarehouseId === whFilter);
    if (dateFrom) ops = ops.filter(o => o.date >= dateFrom);
    if (dateTo) ops = ops.filter(o => o.date <= dateTo);
    const q = search.toLowerCase();
    if (q) ops = ops.filter(o => {
      const p = products.find(p => p.id === o.productId);
      return p?.name.toLowerCase().includes(q) || p?.sku.toLowerCase().includes(q);
    });
    return [...ops].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [offOps, tab, whFilter, opTypeFilter, dateFrom, dateTo, search, products]);

  // Остатки: все товары с ненулевым остатком, фильтрованные по выбранному складу
  const residueRows = useMemo(() => {
    const selectedWh = whFilter ? offWarehouses.filter(w => w.id === whFilter) : offWarehouses;
    const q = search.toLowerCase();
    const rows: Array<{ product: Product; warehouseId: string; warehouseName: string; qty: number; serialNumbers: string[] }> = [];
    for (const wh of selectedWh) {
      for (const p of products) {
        if (catFilter !== 'all' && p.categoryId !== catFilter) continue;
        if (q && !p.name.toLowerCase().includes(q) && !p.sku.toLowerCase().includes(q)) continue;
        const qty = getStock(wh.id, p.id);
        const serials = getSerials(wh.id, p.id);
        if (qty > 0 || serials.length > 0) {
          if (p.isSerial && serials.length > 0) {
            for (const sn of serials) {
              rows.push({ product: p, warehouseId: wh.id, warehouseName: wh.name, qty: 1, serialNumbers: [sn] });
            }
          } else {
            rows.push({ product: p, warehouseId: wh.id, warehouseName: wh.name, qty, serialNumbers: [] });
          }
        }
      }
    }
    return rows;
  }, [offWarehouses, products, warehouseStock, whFilter, catFilter, search]);

  const activeEmployee = employees.find(e => e.status === 'active');

  const openReceiptForm = () => {
    onOpenPanel('Новое оприходование', (
      <ReceiptForm
        warehouses={offWarehouses}
        products={products}
        suppliers={suppliers || []}
        employeeId={activeEmployee?.id || ''}
        onSave={(op) => {
          store.addStockOperation({ ...op, officeId: currentOfficeId });
          onClosePanel();
        }}
        onCancel={onClosePanel}
      />
    ));
  };

  const openWriteoffForm = () => {
    onOpenPanel('Новое списание', (
      <WriteoffForm
        warehouses={offWarehouses}
        products={products}
        warehouseStock={warehouseStock}
        employeeId={activeEmployee?.id || ''}
        onSave={(op) => {
          store.addStockOperation({ ...op, officeId: currentOfficeId });
          onClosePanel();
        }}
        onCancel={onClosePanel}
      />
    ));
  };

  const openTransferForm = () => {
    onOpenPanel('Новое перемещение', (
      <TransferForm
        warehouses={offWarehouses}
        products={products}
        warehouseStock={warehouseStock}
        employeeId={activeEmployee?.id || ''}
        onSave={(op) => {
          store.addStockOperation({ ...op, officeId: currentOfficeId });
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

  const openSupplierForm = (sup?: Supplier) => {
    onOpenPanel(sup ? 'Редактировать поставщика' : 'Новый поставщик', (
      <SupplierForm
        supplier={sup}
        onSave={(data) => {
          if (sup) store.updateSupplier(sup.id, data);
          else store.addSupplier({ id: uid(), ...data });
          onClosePanel();
        }}
        onDelete={sup ? () => { store.deleteSupplier(sup.id); onClosePanel(); } : undefined}
        onCancel={onClosePanel}
      />
    ));
  };

  /* ── СТАТИСТИКА ── */
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

  return (
    <div className="space-y-4">
      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Складов', value: offWarehouses.length, icon: 'Warehouse', color: 'text-[#3b82f6]', bg: 'bg-[#3b82f6]/10' },
          { label: 'Позиций на складе', value: totalItems, icon: 'Package', color: 'text-[#10b981]', bg: 'bg-[#10b981]/10' },
          { label: 'Оприходовано за месяц', value: `${monthReceipt.toLocaleString('ru-RU')} ₽`, icon: 'ArrowDownToLine', color: 'text-[#10b981]', bg: 'bg-[#10b981]/10' },
          { label: 'Стоимость запасов', value: `${totalValue.toLocaleString('ru-RU')} ₽`, icon: 'CircleDollarSign', color: 'text-[#f59e0b]', bg: 'bg-[#f59e0b]/10' },
        ].map(s => (
          <div key={s.label} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0`}>
                <Icon name={s.icon} size={16} className={s.color} />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] text-[#4b5568] truncate">{s.label}</div>
                <div className="text-base font-bold text-[var(--foreground)]">{s.value}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Вкладки */}
      <div className="flex gap-1 bg-[var(--card)] border border-[var(--border)] rounded-xl p-1 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setSearch(''); }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0
              ${tab === t.id ? 'bg-[#3b82f6] text-white' : 'text-[#8892a4] hover:text-[var(--foreground)]'}`}
          >
            <Icon name={t.icon} size={13} />{t.label}
          </button>
        ))}
      </div>

      {/* ── ОСТАТКИ ── */}
      {tab === 'residue' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <input value={search} onChange={e => setSearch(e.target.value)} className={inputCls + ' max-w-xs'} placeholder="Поиск товара..." />
            <select value={whFilter} onChange={e => setWhFilter(e.target.value)} className={inputCls + ' max-w-[180px] cursor-pointer'}>
              <option value="">Все склады</option>
              {offWarehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
            <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className={inputCls + ' max-w-[160px] cursor-pointer'}>
              <option value="all">Все категории</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button onClick={() => openWarehouseForm()} className="flex items-center gap-1.5 px-3 py-2 bg-[#1e2637] hover:bg-[#252d3d] text-[#8892a4] hover:text-white rounded-lg text-xs transition-colors ml-auto">
              <Icon name="Plus" size={13} />Новый склад
            </button>
          </div>

          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
            <div className="grid text-[11px] text-[#4b5568] font-semibold uppercase px-4 py-2 border-b border-[var(--border)] bg-[var(--card)]" style={{ gridTemplateColumns: '2fr 1fr 1fr 80px 80px' }}>
              <span>Наименование</span><span>Артикул</span><span>Склад</span><span className="text-right">Кол-во</span><span className="text-right">Ед.</span>
            </div>
            {residueRows.length === 0 ? (
              <div className="py-12 text-center text-sm text-[#4b5568]">Нет товаров на складе</div>
            ) : (
              residueRows.map((row, idx) => {
                const cat = categories.find(c => c.id === row.product.categoryId);
                const lowStock = row.qty <= 5;
                const midStock = row.qty <= 20 && row.qty > 5;
                return (
                  <div
                    key={idx}
                    className="grid items-center px-4 py-2.5 border-b border-[var(--border)] last:border-0 hover:bg-[#1e2637]/30 transition-colors"
                    style={{ gridTemplateColumns: '2fr 1fr 1fr 80px 80px' }}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        {row.product.photoUrl && (
                          <img src={row.product.photoUrl} alt="" className="w-7 h-7 rounded object-cover flex-shrink-0" />
                        )}
                        <div>
                          <div className="text-sm text-[var(--foreground)] font-medium">{row.product.name}</div>
                          {cat && <div className="text-[10px] text-[#4b5568]">{cat.name}</div>}
                          {row.product.isSerial && row.serialNumbers[0] && (
                            <div className="text-[10px] text-[#3b82f6] font-mono">SN: {row.serialNumbers[0]}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-[#8892a4] font-mono">{row.product.sku}</div>
                    <div className="text-xs text-[#8892a4]">{row.warehouseName}</div>
                    <div className={`text-sm font-bold text-right ${lowStock ? 'text-[#ef4444]' : midStock ? 'text-[#f59e0b]' : 'text-[var(--foreground)]'}`}>
                      {row.qty}
                    </div>
                    <div className="text-xs text-[#4b5568] text-right">{row.product.unit}</div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ── ОПРИХОДОВАНИЯ ── */}
      {tab === 'income' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <input value={search} onChange={e => setSearch(e.target.value)} className={inputCls + ' max-w-xs'} placeholder="Поиск..." />
            <select value={whFilter} onChange={e => setWhFilter(e.target.value)} className={inputCls + ' max-w-[180px] cursor-pointer'}>
              <option value="">Все склады</option>
              {offWarehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={inputCls + ' max-w-[150px]'} />
            <span className="text-[#4b5568] text-sm">—</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={inputCls + ' max-w-[150px]'} />
            <button onClick={openReceiptForm} className="flex items-center gap-1.5 px-3 py-2 bg-[#10b981] hover:bg-[#059669] text-white rounded-lg text-xs font-medium transition-colors ml-auto">
              <Icon name="Plus" size={13} />Новое оприходование
            </button>
          </div>
          <OperationsTable ops={filteredOps} products={products} warehouses={offWarehouses} suppliers={suppliers || []} opConfig={OP_CONFIG} />
        </div>
      )}

      {/* ── СПИСАНИЕ ── */}
      {tab === 'outcome' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <input value={search} onChange={e => setSearch(e.target.value)} className={inputCls + ' max-w-xs'} placeholder="Поиск..." />
            <select value={whFilter} onChange={e => setWhFilter(e.target.value)} className={inputCls + ' max-w-[180px] cursor-pointer'}>
              <option value="">Все склады</option>
              {offWarehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
            <button onClick={openWriteoffForm} className="flex items-center gap-1.5 px-3 py-2 bg-[#ef4444] hover:bg-[#dc2626] text-white rounded-lg text-xs font-medium transition-colors ml-auto">
              <Icon name="Plus" size={13} />Новое списание
            </button>
          </div>
          <OperationsTable ops={filteredOps} products={products} warehouses={offWarehouses} suppliers={suppliers || []} opConfig={OP_CONFIG} />
        </div>
      )}

      {/* ── ПЕРЕМЕЩЕНИЕ ── */}
      {tab === 'move' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <input value={search} onChange={e => setSearch(e.target.value)} className={inputCls + ' max-w-xs'} placeholder="Поиск..." />
            <select value={whFilter} onChange={e => setWhFilter(e.target.value)} className={inputCls + ' max-w-[180px] cursor-pointer'}>
              <option value="">Все склады</option>
              {offWarehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
            <button onClick={openTransferForm} className="flex items-center gap-1.5 px-3 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-xs font-medium transition-colors ml-auto">
              <Icon name="Plus" size={13} />Новое перемещение
            </button>
          </div>
          <OperationsTable ops={filteredOps} products={products} warehouses={offWarehouses} suppliers={suppliers || []} opConfig={OP_CONFIG} />
        </div>
      )}

      {/* ── НОМЕНКЛАТУРА ── */}
      {tab === 'products' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <input value={search} onChange={e => setSearch(e.target.value)} className={inputCls + ' max-w-xs'} placeholder="Поиск товара..." />
            <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className={inputCls + ' max-w-[160px] cursor-pointer'}>
              <option value="all">Все категории</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div className="flex gap-2 ml-auto">
              <button onClick={() => openCategoryForm()} className="flex items-center gap-1.5 px-3 py-2 bg-[#1e2637] hover:bg-[#252d3d] text-[#8892a4] hover:text-white rounded-lg text-xs transition-colors">
                <Icon name="FolderPlus" size={13} />Категория
              </button>
              <button onClick={() => openProductForm()} className="flex items-center gap-1.5 px-3 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-xs font-medium transition-colors">
                <Icon name="Plus" size={13} />Новый товар
              </button>
            </div>
          </div>

          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
            <div className="grid text-[11px] text-[#4b5568] font-semibold uppercase px-4 py-2 border-b border-[var(--border)]" style={{ gridTemplateColumns: '40px 2fr 1fr 1fr 80px 70px 60px 32px' }}>
              <span />
              <span>Наименование</span><span>Артикул</span><span>Категория</span>
              <span className="text-right">Цена</span><span className="text-center">Ед.</span>
              <span className="text-center">Серийный</span><span />
            </div>
            {products.filter(p => {
              if (catFilter !== 'all' && p.categoryId !== catFilter) return false;
              if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.sku.toLowerCase().includes(search.toLowerCase())) return false;
              return true;
            }).map(p => {
              const cat = categories.find(c => c.id === p.categoryId);
              const totalQty = offWarehouses.reduce((s, w) => s + getStock(w.id, p.id), 0);
              return (
                <div
                  key={p.id}
                  className="grid items-center px-4 py-2.5 border-b border-[var(--border)] last:border-0 hover:bg-[#1e2637]/30 cursor-pointer transition-colors"
                  style={{ gridTemplateColumns: '40px 2fr 1fr 1fr 80px 70px 60px 32px' }}
                  onClick={() => openProductForm(p)}
                >
                  <div className="w-8 h-8 rounded overflow-hidden bg-[#252d3d] flex items-center justify-center flex-shrink-0">
                    {p.photoUrl ? <img src={p.photoUrl} alt="" className="w-full h-full object-cover" /> : <Icon name="Package" size={14} className="text-[#4b5568]" />}
                  </div>
                  <div>
                    <div className="text-sm text-[var(--foreground)] font-medium">{p.name}</div>
                    <div className="text-[10px] text-[#4b5568]">Остаток: {totalQty} {p.unit}</div>
                  </div>
                  <div className="text-xs text-[#8892a4] font-mono">{p.sku}</div>
                  <div className="text-xs text-[#8892a4]">{cat?.name || '—'}</div>
                  <div className="text-sm text-right text-[var(--foreground)]">{p.price.toLocaleString('ru-RU')} ₽</div>
                  <div className="text-xs text-center text-[#8892a4]">{p.unit}</div>
                  <div className="text-center">
                    {p.isSerial ? <span className="text-[10px] text-[#3b82f6] bg-[#3b82f6]/10 px-1.5 py-0.5 rounded">Да</span> : <span className="text-[10px] text-[#4b5568]">—</span>}
                  </div>
                  <Icon name="ChevronRight" size={14} className="text-[#4b5568]" />
                </div>
              );
            })}
          </div>

          {/* Категории */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-[var(--foreground)]">Категории</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map(c => (
                <button key={c.id} onClick={() => openCategoryForm(c)} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e2637] hover:bg-[#252d3d] text-[#8892a4] hover:text-white rounded-lg text-xs transition-colors">
                  <Icon name="Folder" size={12} />{c.name}
                  {c.parentId && <span className="text-[#252d3d]">↳</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Поставщики */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-[var(--foreground)]">Поставщики</h4>
              <button onClick={() => openSupplierForm()} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-xs transition-colors">
                <Icon name="Plus" size={12} />Добавить
              </button>
            </div>
            {(!suppliers || suppliers.length === 0) ? (
              <div className="text-sm text-[#4b5568] text-center py-4">Поставщики не добавлены</div>
            ) : (
              <div className="space-y-2">
                {suppliers.map(s => (
                  <div key={s.id} onClick={() => openSupplierForm(s)} className="flex items-center justify-between p-3 bg-[#1e2637] rounded-xl hover:bg-[#252d3d] cursor-pointer transition-colors">
                    <div>
                      <div className="text-sm font-medium text-[var(--foreground)]">{s.name}</div>
                      <div className="text-xs text-[#4b5568]">{[s.inn && `ИНН: ${s.inn}`, s.phone].filter(Boolean).join(' · ')}</div>
                    </div>
                    <Icon name="ChevronRight" size={14} className="text-[#4b5568]" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ИСТОРИЯ ── */}
      {tab === 'operations' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <input value={search} onChange={e => setSearch(e.target.value)} className={inputCls + ' max-w-xs'} placeholder="Поиск..." />
            <select value={whFilter} onChange={e => setWhFilter(e.target.value)} className={inputCls + ' max-w-[180px] cursor-pointer'}>
              <option value="">Все склады</option>
              {offWarehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
            <select value={opTypeFilter} onChange={e => setOpTypeFilter(e.target.value as 'all' | StockOperationType)} className={inputCls + ' max-w-[160px] cursor-pointer'}>
              <option value="all">Все типы</option>
              {Object.entries(OP_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={inputCls + ' max-w-[150px]'} />
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={inputCls + ' max-w-[150px]'} />
          </div>
          <OperationsTable ops={filteredOps} products={products} warehouses={offWarehouses} suppliers={suppliers || []} opConfig={OP_CONFIG} />
        </div>
      )}
    </div>
  );
}

/* ─── Таблица операций (общая) ─── */
interface OpsTableProps {
  ops: ReturnType<typeof useCRMStore>['stockOperations'];
  products: Product[];
  warehouses: WarehouseType[];
  suppliers: Supplier[];
  opConfig: typeof OP_CONFIG;
}
function OperationsTable({ ops, products, warehouses, suppliers, opConfig }: OpsTableProps) {
  if (ops.length === 0) {
    return <div className="py-12 text-center text-sm text-[#4b5568]">Операций не найдено</div>;
  }
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
      {ops.map(op => {
        const cfg = opConfig[op.type];
        const wh = warehouses.find(w => w.id === op.warehouseId);
        const toWh = op.toWarehouseId ? warehouses.find(w => w.id === op.toWarehouseId) : null;
        const sup = op.supplierId ? suppliers.find(s => s.id === op.supplierId) : null;
        const itemProducts = op.items?.map(i => products.find(p => p.id === i.productId)) || [products.find(p => p.id === op.productId)];
        const uniqueNames = Array.from(new Set(itemProducts.map(p => p?.name).filter(Boolean)));

        return (
          <div key={op.id} className={`flex items-start gap-3 px-4 py-3 border-b border-[var(--border)] last:border-0 hover:bg-[#1e2637]/20 transition-colors`}>
            <div className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg} border`}>
              <Icon name={cfg.icon} size={12} className={cfg.color} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                <span className="text-xs text-[#4b5568]">{op.date}</span>
                {op.invoiceNumber && <span className="text-xs text-[#4b5568]">№ {op.invoiceNumber}</span>}
                {sup && <span className="text-xs text-[#8892a4]">· {sup.name}</span>}
              </div>
              <div className="text-sm text-[var(--foreground)] mt-0.5 truncate">
                {uniqueNames.join(', ')}
                {op.items && op.items.length > 1 && <span className="text-xs text-[#4b5568] ml-1">и ещё {op.items.length - 1} поз.</span>}
              </div>
              <div className="text-xs text-[#4b5568] mt-0.5">
                {wh?.name}{toWh ? ` → ${toWh.name}` : ''}
                {op.notes && <span className="ml-2 italic">· {op.notes}</span>}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-sm font-semibold text-[var(--foreground)]">{op.quantity} {products.find(p => p.id === op.productId)?.unit || 'шт'}</div>
              {op.amount > 0 && <div className="text-xs text-[#4b5568]">{op.amount.toLocaleString('ru-RU')} ₽</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
