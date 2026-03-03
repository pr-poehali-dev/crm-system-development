import { useState } from 'react';
import { CRMEvent, TimeSlot } from '@/types/crm';
import Icon from '@/components/ui/icon';
import { useCRMStore } from '@/store/crmStore';
import { useLightBilling, LBTariff } from '@/hooks/useLightBilling';
import { STATUS_MAP, inputCls, labelCls } from './CalendarConstants';

interface ConnectionFormProps {
  date: string;
  slot: TimeSlot;
  event?: CRMEvent;
  employees: ReturnType<typeof useCRMStore>['employees'];
  onSave: (data: Omit<CRMEvent, 'id' | 'officeId' | 'createdAt'>) => void;
  onDelete?: () => void;
  onCancel: () => void;
}

export default function ConnectionForm({ date, slot, event, employees, onSave, onDelete, onCancel }: ConnectionFormProps) {
  const lb = useLightBilling();
  const [name, setName] = useState(event?.subscriberName || '');
  const [address, setAddress] = useState(event?.subscriberAddress || '');
  const [phone, setPhone] = useState(event?.subscriberPhone || '');
  const [technicianId, setTechnicianId] = useState(event?.technicianId || '');
  const [status, setStatus] = useState<CRMEvent['status']>(event?.status || 'new');
  const [notes, setNotes] = useState(event?.notes || '');
  const [tariffId, setTariffId] = useState('');
  const [tariffs, setTariffs] = useState<LBTariff[]>([]);
  const [tariffsLoaded, setTariffsLoaded] = useState(false);
  const [selectedTariffs, setSelectedTariffs] = useState<{ id: string; name: string }[]>(
    event?.tariffs || (event?.tariffId ? [{ id: event.tariffId, name: event.tariffName || '' }] : [])
  );
  const [newSubGroup, setNewSubGroup] = useState('Физические лица');
  const [newSubContract, setNewSubContract] = useState('');
  const [newSubLogin, setNewSubLogin] = useState('');
  const [newSubPassword, setNewSubPassword] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createResult, setCreateResult] = useState('');
  const [subLbId, setSubLbId] = useState(event?.subscriberLbId || '');

  useState(() => {
    lb.loadTariffs().then(list => { setTariffs(list); setTariffsLoaded(true); });
  });

  const handleAddTariff = (id: string) => {
    if (!id || selectedTariffs.find(t => t.id === id)) return;
    const t = tariffs.find(t => t.id === id);
    if (t) setSelectedTariffs(prev => [...prev, { id: t.id, name: t.name }]);
    setTariffId('');
  };

  const handleRemoveTariff = (id: string) => setSelectedTariffs(prev => prev.filter(t => t.id !== id));

  const handleCreateSubscriber = async () => {
    if (!name || !address) {
      setCreateResult('Заполните ФИО и адрес');
      return;
    }
    setCreateLoading(true);
    setCreateResult('');
    const firstTariff = selectedTariffs[0];
    const result = await lb.createSubscriber({
      fullName: name, address, phone, tariffId: firstTariff?.id || '',
      contractNumber: newSubContract,
      login: newSubLogin,
      password: newSubPassword,
      group: newSubGroup,
    });
    setCreateLoading(false);
    if (result.success) {
      const newLbId = result.lb_id || '';
      setSubLbId(newLbId);
      setCreateResult(`✓ Создан в LightBilling${newLbId ? ` (ID: ${newLbId})` : ''}`);
      if (newLbId && selectedTariffs.length > 1) {
        for (const t of selectedTariffs.slice(1)) {
          await lb.addTariff(newLbId, t.id);
        }
      }
    } else {
      setCreateResult(`Ошибка: ${result.message}`);
    }
  };

  const handleSave = () => {
    if (!name) return;
    onSave({
      type: 'connection',
      status,
      priority: 'medium',
      subscriberName: name,
      subscriberAddress: address,
      subscriberPhone: phone,
      subscriberLbId: subLbId,
      technicianId,
      date,
      timeSlot: slot.time,
      tariffId: selectedTariffs[0]?.id || '',
      tariffName: selectedTariffs[0]?.name || '',
      tariffs: selectedTariffs,
      notes,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs font-medium text-[#10b981] bg-[#10b981]/10 border border-[#10b981]/20 rounded-lg px-3 py-2">
        <Icon name="Wifi" size={13} />
        Подключение · {date} · {slot.time}
      </div>

      <div>
        <label className={labelCls}>Группа *</label>
        <select value={newSubGroup} onChange={e => setNewSubGroup(e.target.value)} className={inputCls + ' cursor-pointer'}>
          <option value="Физические лица">Физические лица</option>
          <option value="Юридические лица">Юридические лица</option>
        </select>
      </div>

      <div>
        <label className={labelCls}>ФИО *</label>
        <input value={name} onChange={e => setName(e.target.value)} className={inputCls} placeholder="Фамилия Имя Отчество" />
      </div>

      <div>
        <label className={labelCls}>Адрес *</label>
        <input value={address} onChange={e => setAddress(e.target.value)} className={inputCls} placeholder="Улица, дом, квартира" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Телефон</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} className={inputCls} placeholder="+7..." />
        </div>
        <div>
          <label className={labelCls}>Договор</label>
          <input value={newSubContract} onChange={e => setNewSubContract(e.target.value)} className={inputCls} placeholder="Номер" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Логин</label>
          <input value={newSubLogin} onChange={e => setNewSubLogin(e.target.value)} className={inputCls} placeholder="Авто" />
        </div>
        <div>
          <label className={labelCls}>Пароль</label>
          <input value={newSubPassword} onChange={e => setNewSubPassword(e.target.value)} className={inputCls} placeholder="Авто" />
        </div>
      </div>

      <div>
        <label className={labelCls}>Тарифы</label>
        {selectedTariffs.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {selectedTariffs.map(t => (
              <span key={t.id} className="flex items-center gap-1 px-2 py-1 bg-[#10b981]/10 border border-[#10b981]/30 text-[#10b981] text-xs rounded-lg">
                {t.name}
                <button onClick={() => handleRemoveTariff(t.id)} className="hover:text-white transition-colors ml-0.5">
                  <Icon name="X" size={10} />
                </button>
              </span>
            ))}
          </div>
        )}
        {!tariffsLoaded ? (
          <div className="flex items-center gap-2 text-xs text-[#4b5568] py-2">
            <Icon name="Loader" size={12} className="animate-spin" />Загрузка тарифов...
          </div>
        ) : (
          <div className="flex gap-2">
            <select value={tariffId} onChange={e => setTariffId(e.target.value)} className={inputCls + ' cursor-pointer flex-1'}>
              <option value="">— Добавить тариф —</option>
              {tariffs.filter(t => !selectedTariffs.find(s => s.id === t.id)).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <button onClick={() => handleAddTariff(tariffId)} disabled={!tariffId} className="px-3 py-2 bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-40 text-white rounded-lg text-sm transition-colors flex-shrink-0">
              <Icon name="Plus" size={14} />
            </button>
          </div>
        )}
      </div>

      {!event && (
        <>
          <button
            onClick={handleCreateSubscriber}
            disabled={createLoading || !name || !address}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#10b981] hover:bg-[#059669] disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {createLoading
              ? <><Icon name="Loader" size={14} className="animate-spin" />Создание в LightBilling...</>
              : <><Icon name="UserPlus" size={14} />Создать абонента в LightBilling</>}
          </button>
          {createResult && (
            <div className={`text-xs px-3 py-2 rounded-lg ${createResult.startsWith('✓') ? 'bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20' : 'bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20'}`}>
              {createResult}
            </div>
          )}
        </>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Статус</label>
          <select value={status} onChange={e => setStatus(e.target.value as CRMEvent['status'])} className={inputCls + ' cursor-pointer'}>
            {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Исполнитель</label>
          <select value={technicianId} onChange={e => setTechnicianId(e.target.value)} className={inputCls + ' cursor-pointer'}>
            <option value="">— Выберите —</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.lastName} {e.firstName}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className={labelCls}>Заметки</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={inputCls} />
      </div>

      <div className="flex gap-2 pt-2">
        <button onClick={handleSave} disabled={!name} className="flex-1 py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
          {event ? 'Сохранить' : 'Создать подключение'}
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
