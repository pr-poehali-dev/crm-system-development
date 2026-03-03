import { useState } from 'react';
import { useCRMStore } from '@/store/crmStore';
import { Office, WorkType, ExpenseCategory } from '@/types/crm';
import Icon from '@/components/ui/icon';

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
const inputCls = "w-full bg-[#0f1117] border border-[#252d3d] rounded-lg px-3 py-2 text-sm text-white placeholder-[#4b5568] focus:outline-none focus:border-[#3b82f6] transition-colors";

interface Props {
  onOpenPanel: (title: string, content: React.ReactNode) => void;
  onClosePanel: () => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs font-medium text-[#8892a4] mb-1.5">{label}</label>{children}</div>;
}

export default function Settings({ onOpenPanel, onClosePanel }: Props) {
  const {
    offices, currentOfficeId, addOffice, updateOffice, deleteOffice,
    appSettings, updateAppSettings,
    workTypes, addWorkType, updateWorkType, deleteWorkType,
    expenseCategories, addExpenseCategory, updateExpenseCategory, deleteExpenseCategory,
  } = useCRMStore();
  const [promisedFee, setPromisedFee] = useState(String(appSettings.promisedPaymentFee));

  const [newWtName, setNewWtName] = useState('');
  const [newWtPrice, setNewWtPrice] = useState('');
  const [newEcName, setNewEcName] = useState('');

  const openOfficeForm = (office?: Office) => {
    const isNew = !office;
    const form = { name: office?.name || '', address: office?.address || '', phone: office?.phone || '' };
    const save = () => {
      if (isNew) addOffice({ id: uid(), ...form });
      else updateOffice(office!.id, form);
      onClosePanel();
    };
    onOpenPanel(isNew ? 'Новый офис' : 'Редактировать офис', (
      <div className="space-y-4">
        <Field label="Название офиса"><input defaultValue={form.name} onChange={(e) => { form.name = e.target.value; }} className={inputCls} placeholder="Абакан" /></Field>
        <Field label="Адрес"><input defaultValue={form.address} onChange={(e) => { form.address = e.target.value; }} className={inputCls} placeholder="г. Абакан, ул. Ленина 1" /></Field>
        <Field label="Телефон"><input defaultValue={form.phone} onChange={(e) => { form.phone = e.target.value; }} className={inputCls} placeholder="+7 (3902) 00-00-00" /></Field>
        <div className="flex gap-3 pt-4 border-t border-[#252d3d]">
          <button onClick={save} className="flex-1 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-sm font-medium">Сохранить</button>
          <button onClick={onClosePanel} className="px-4 py-2 bg-[#1e2637] text-[#8892a4] rounded-lg text-sm">Отмена</button>
        </div>
      </div>
    ));
  };

  return (
    <div className="space-y-6">
      {/* Offices */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Icon name="Building2" size={16} className="text-[#3b82f6]" />
            Офисы
          </h2>
          <button onClick={() => openOfficeForm()} className="flex items-center gap-2 px-3 py-1.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-sm font-medium transition-colors">
            <Icon name="Plus" size={14} />Добавить офис
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {offices.map((office) => (
            <div key={office.id} className={`bg-[#161b27] border rounded-xl p-4 transition-colors ${office.id === currentOfficeId ? 'border-[#3b82f6]/50' : 'border-[#252d3d] hover:border-[#3b82f6]/30'}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${office.id === currentOfficeId ? 'bg-[#3b82f6]' : 'bg-[#3b82f6]/10'}`}>
                    <Icon name="Building2" size={16} className={office.id === currentOfficeId ? 'text-white' : 'text-[#3b82f6]'} />
                  </div>
                  {office.id === currentOfficeId && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#3b82f6]/20 text-[#3b82f6]">Текущий</span>
                  )}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openOfficeForm(office)} className="p-1.5 hover:bg-[#252d3d] rounded text-[#4b5568] hover:text-white transition-colors"><Icon name="Pencil" size={13} /></button>
                  {offices.length > 1 && (
                    <button onClick={() => deleteOffice(office.id)} className="p-1.5 hover:bg-[#ef4444]/20 rounded text-[#4b5568] hover:text-[#ef4444] transition-colors"><Icon name="Trash2" size={13} /></button>
                  )}
                </div>
              </div>
              <div className="text-sm font-semibold text-white mb-1">{office.name}</div>
              <div className="text-xs text-[#4b5568] mb-1 flex items-center gap-1">
                <Icon name="MapPin" size={11} />{office.address}
              </div>
              <div className="text-xs text-[#4b5568] flex items-center gap-1">
                <Icon name="Phone" size={11} />{office.phone}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Billing Settings */}
      <div>
        <h2 className="text-base font-semibold text-white flex items-center gap-2 mb-4">
          <Icon name="CreditCard" size={16} className="text-[#3b82f6]" />
          Настройки биллинга
        </h2>
        <div className="bg-[#161b27] border border-[#252d3d] rounded-xl p-4 space-y-4">
          <Field label="Стоимость обещанного платежа, ₽">
            <div className="flex gap-2">
              <input
                type="number"
                value={promisedFee}
                onChange={e => setPromisedFee(e.target.value)}
                className={inputCls}
                placeholder="30"
                min="0"
              />
              <button
                onClick={() => updateAppSettings({ promisedPaymentFee: parseFloat(promisedFee) || 0 })}
                className="px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-sm font-medium transition-colors flex-shrink-0"
              >
                Сохранить
              </button>
            </div>
            <div className="text-xs text-[#4b5568] mt-1.5">
              При активации обещанного платежа к сумме добавляется эта комиссия.
              Формула: (сумма_тарифов / дней_в_месяце × дней_обещ.) + стоимость_обещ.
            </div>
          </Field>
        </div>
      </div>

      {/* About */}
      <div className="bg-[#161b27] border border-[#252d3d] rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#3b82f6] flex items-center justify-center">
            <Icon name="Zap" size={20} className="text-white" />
          </div>
          <div>
            <div className="text-base font-bold text-white">NetCRM</div>
            <div className="text-xs text-[#4b5568]">Версия 1.0.0</div>
          </div>
        </div>
        <p className="text-sm text-[#8892a4] leading-relaxed">
          Корпоративная CRM-система для управления интернет-провайдером. Включает модули: Сотрудники, Сервис, Склад, Касса, Акты, Отчёты, Зарплата, Контакты с интеграцией LightBilling.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {[
            ['Офисов', offices.length],
            ['Модулей', 9],
          ].map(([label, val]) => (
            <div key={label as string} className="bg-[#0f1117] rounded-lg p-3">
              <div className="text-lg font-bold text-white">{val}</div>
              <div className="text-xs text-[#4b5568]">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Виды работ */}
      <div>
        <h2 className="text-base font-semibold text-white flex items-center gap-2 mb-4">
          <Icon name="Wrench" size={16} className="text-[#3b82f6]" />
          Виды работ
        </h2>
        <div className="bg-[#161b27] border border-[#252d3d] rounded-xl p-4 space-y-3">
          {(workTypes || []).map((wt) => (
            <div key={wt.id} className="flex items-center gap-2">
              <span className="flex-1 text-sm text-white">{wt.name}</span>
              <span className="text-sm text-[#10b981] font-semibold w-24 text-right">{wt.price.toLocaleString('ru-RU')} ₽</span>
              <button onClick={() => deleteWorkType(wt.id)} className="p-1.5 hover:bg-[#ef4444]/20 rounded text-[#4b5568] hover:text-[#ef4444]">
                <Icon name="Trash2" size={13} />
              </button>
            </div>
          ))}
          {(workTypes || []).length === 0 && (
            <div className="text-sm text-[#4b5568] text-center py-3">Виды работ не добавлены</div>
          )}
          <div className="flex gap-2 pt-2 border-t border-[#252d3d]">
            <input
              value={newWtName}
              onChange={e => setNewWtName(e.target.value)}
              className={inputCls}
              placeholder="Название работы"
            />
            <input
              type="number"
              value={newWtPrice}
              onChange={e => setNewWtPrice(e.target.value)}
              className={inputCls + ' w-32'}
              placeholder="Цена, ₽"
              min="0"
            />
            <button
              onClick={() => {
                if (!newWtName.trim() || !newWtPrice) return;
                addWorkType({ id: uid(), name: newWtName.trim(), price: parseFloat(newWtPrice) || 0 });
                setNewWtName('');
                setNewWtPrice('');
              }}
              className="px-3 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-sm transition-colors flex-shrink-0"
            >
              <Icon name="Plus" size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Статьи расходов */}
      <div>
        <h2 className="text-base font-semibold text-white flex items-center gap-2 mb-4">
          <Icon name="Tag" size={16} className="text-[#3b82f6]" />
          Статьи расходов
        </h2>
        <div className="bg-[#161b27] border border-[#252d3d] rounded-xl p-4 space-y-3">
          {expenseCategories.map((ec) => (
            <div key={ec.id} className="flex items-center gap-2">
              <span className="flex-1 text-sm text-white">{ec.name}</span>
              {ec.description && <span className="text-xs text-[#4b5568] truncate max-w-[160px]">{ec.description}</span>}
              <button onClick={() => deleteExpenseCategory(ec.id)} className="p-1.5 hover:bg-[#ef4444]/20 rounded text-[#4b5568] hover:text-[#ef4444]">
                <Icon name="Trash2" size={13} />
              </button>
            </div>
          ))}
          {expenseCategories.length === 0 && (
            <div className="text-sm text-[#4b5568] text-center py-3">Статьи не добавлены</div>
          )}
          <div className="flex gap-2 pt-2 border-t border-[#252d3d]">
            <input
              value={newEcName}
              onChange={e => setNewEcName(e.target.value)}
              className={inputCls}
              placeholder="Название статьи"
            />
            <button
              onClick={() => {
                if (!newEcName.trim()) return;
                addExpenseCategory({ id: uid(), name: newEcName.trim() });
                setNewEcName('');
              }}
              className="px-3 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-sm transition-colors flex-shrink-0"
            >
              <Icon name="Plus" size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Integration */}
      <div className="bg-[#161b27] border border-[#252d3d] rounded-xl p-4">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Icon name="Link" size={15} className="text-[#3b82f6]" />
          Интеграция с LightBilling
        </h3>
        <div className="space-y-3">
          <Field label="URL биллинга"><input className={inputCls} placeholder="https://billing.example.com/api" defaultValue="" /></Field>
          <Field label="API ключ"><input type="password" className={inputCls} placeholder="Введите API ключ" defaultValue="" /></Field>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#1e2637] hover:bg-[#252d3d] text-[#8892a4] hover:text-white rounded-lg text-sm transition-colors">
            <Icon name="RefreshCw" size={14} />Проверить подключение
          </button>
          <div className="flex items-center gap-2 text-xs text-[#4b5568]">
            <Icon name="Info" size={12} />
            В текущей версии используются демо-данные абонентов. Подключите реальный API биллинга.
          </div>
        </div>
      </div>
    </div>
  );
}