import { useState } from 'react';
import { useCRMStore } from '@/store/crmStore';
import { Employee, Department, Position, User } from '@/types/crm';
import Icon from '@/components/ui/icon';

type Tab = 'employees' | 'departments' | 'positions' | 'users';

interface Props {
  onOpenPanel: (title: string, content: React.ReactNode) => void;
  onClosePanel: () => void;
}

const SALARY_TYPE_LABELS: Record<string, string> = {
  fixed: 'Оклад', piece: 'Сдельная', kpi: 'КПИ', mixed: 'Смешанная',
};
const STATUS_LABELS: Record<string, string> = {
  active: 'Активен', fired: 'Уволен', vacation: 'Отпуск',
};
const ROLE_LABELS: Record<string, string> = {
  admin: 'Администратор', manager: 'Менеджер', technician: 'Техник', cashier: 'Кассир', warehouse: 'Кладовщик',
};

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

export default function Employees({ onOpenPanel, onClosePanel }: Props) {
  const { employees, departments, positions, users, addEmployee, updateEmployee, deleteEmployee, addDepartment, updateDepartment, deleteDepartment, addPosition, updatePosition, deletePosition, addUser, updateUser, deleteUser } = useCRMStore();
  const [tab, setTab] = useState<Tab>('employees');
  const [search, setSearch] = useState('');

  const openEmployeeForm = (emp?: Employee) => {
    const isNew = !emp;
    let form = {
      firstName: emp?.firstName || '', lastName: emp?.lastName || '', middleName: emp?.middleName || '',
      positionId: emp?.positionId || '', departmentId: emp?.departmentId || '', phone: emp?.phone || '',
      email: emp?.email || '', hireDate: emp?.hireDate || new Date().toISOString().split('T')[0], status: emp?.status || 'active' as Employee['status'],
    };

    const save = () => {
      if (isNew) addEmployee({ ...form, id: uid(), avatar: undefined, userId: undefined });
      else updateEmployee(emp!.id, form);
      onClosePanel();
    };

    onOpenPanel(isNew ? 'Новый сотрудник' : 'Редактировать сотрудника', (
      <EmployeeForm form={form} onChange={(f) => { form = f; }} departments={departments} positions={positions} onSave={save} onCancel={onClosePanel} />
    ));
  };

  const openDeptForm = (dept?: Department) => {
    const isNew = !dept;
    let form = { name: dept?.name || '', description: dept?.description || '' };
    const save = () => {
      if (isNew) addDepartment({ id: uid(), ...form });
      else updateDepartment(dept!.id, form);
      onClosePanel();
    };
    onOpenPanel(isNew ? 'Новый отдел' : 'Редактировать отдел', (
      <GenericForm fields={[{ key: 'name', label: 'Название', type: 'text' }, { key: 'description', label: 'Описание', type: 'text' }]} form={form} onChange={(f) => { form = f as typeof form; }} onSave={save} onCancel={onClosePanel} />
    ));
  };

  const openPositionForm = (pos?: Position) => {
    const isNew = !pos;
    let form = { name: pos?.name || '', departmentId: pos?.departmentId || '', salaryType: pos?.salaryType || 'fixed' as Position['salaryType'], baseSalary: pos?.baseSalary || 0, kpiBonus: pos?.kpiBonus || 0, description: pos?.description || '' };
    const save = () => {
      if (isNew) addPosition({ id: uid(), ...form });
      else updatePosition(pos!.id, form);
      onClosePanel();
    };
    onOpenPanel(isNew ? 'Новая должность' : 'Редактировать должность', (
      <PositionForm form={form} onChange={(f) => { form = f; }} departments={departments} onSave={save} onCancel={onClosePanel} />
    ));
  };

  const openUserForm = (user?: User) => {
    const isNew = !user;
    let form = { employeeId: user?.employeeId || '', login: user?.login || '', role: user?.role || 'manager' as User['role'], isActive: user?.isActive ?? true, password: '' };
    const save = () => {
      if (isNew) addUser({ id: uid(), createdAt: new Date().toISOString(), employeeId: form.employeeId, login: form.login, role: form.role, isActive: form.isActive });
      else updateUser(user!.id, { employeeId: form.employeeId, login: form.login, role: form.role, isActive: form.isActive });
      onClosePanel();
    };
    onOpenPanel(isNew ? 'Новый пользователь' : 'Редактировать пользователя', (
      <UserForm form={form} onChange={(f) => { form = f; }} employees={employees} onSave={save} onCancel={onClosePanel} />
    ));
  };

  const filteredEmployees = employees.filter((e) =>
    `${e.lastName} ${e.firstName} ${e.middleName}`.toLowerCase().includes(search.toLowerCase())
  );

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'employees', label: 'Сотрудники', icon: 'Users' },
    { id: 'departments', label: 'Отделы', icon: 'Building' },
    { id: 'positions', label: 'Должности', icon: 'Briefcase' },
    { id: 'users', label: 'Пользователи', icon: 'KeyRound' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-[#252d3d] pb-4">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${tab === t.id ? 'bg-[#3b82f6] text-white' : 'text-[#8892a4] hover:text-white hover:bg-[#1e2637]'}`}>
            <Icon name={t.icon} size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'employees' && (
        <>
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4b5568]" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск сотрудника..." className="w-full bg-[#1e2637] border border-[#252d3d] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-[#4b5568] focus:outline-none focus:border-[#3b82f6]" />
            </div>
            <button onClick={() => openEmployeeForm()} className="flex items-center gap-2 px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-sm font-medium transition-colors">
              <Icon name="Plus" size={14} />
              Добавить
            </button>
          </div>
          <div className="bg-[#161b27] border border-[#252d3d] rounded-xl overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b border-[#252d3d]">
                {['Сотрудник', 'Должность', 'Отдел', 'Телефон', 'Статус', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#4b5568] uppercase tracking-wider">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filteredEmployees.map((emp) => {
                  const pos = positions.find((p) => p.id === emp.positionId);
                  const dept = departments.find((d) => d.id === emp.departmentId);
                  return (
                    <tr key={emp.id} className="border-b border-[#252d3d] last:border-0 hover:bg-[#1e2637] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#3b82f6]/20 flex items-center justify-center text-xs font-semibold text-[#3b82f6]">
                            {emp.lastName[0]}{emp.firstName[0]}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">{emp.lastName} {emp.firstName}</div>
                            <div className="text-xs text-[#4b5568]">{emp.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#8892a4]">{pos?.name || '—'}</td>
                      <td className="px-4 py-3 text-sm text-[#8892a4]">{dept?.name || '—'}</td>
                      <td className="px-4 py-3 text-sm text-[#8892a4]">{emp.phone}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${emp.status === 'active' ? 'bg-[#10b981]/20 text-[#10b981]' : emp.status === 'fired' ? 'bg-[#ef4444]/20 text-[#ef4444]' : 'bg-[#f59e0b]/20 text-[#f59e0b]'}`}>
                          {STATUS_LABELS[emp.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEmployeeForm(emp)} className="p-1.5 hover:bg-[#252d3d] rounded text-[#4b5568] hover:text-white transition-colors"><Icon name="Pencil" size={13} /></button>
                          <button onClick={() => deleteEmployee(emp.id)} className="p-1.5 hover:bg-[#ef4444]/20 rounded text-[#4b5568] hover:text-[#ef4444] transition-colors"><Icon name="Trash2" size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredEmployees.length === 0 && <div className="py-12 text-center text-[#4b5568] text-sm">Сотрудники не найдены</div>}
          </div>
        </>
      )}

      {tab === 'departments' && (
        <>
          <div className="flex justify-end">
            <button onClick={() => openDeptForm()} className="flex items-center gap-2 px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-sm font-medium transition-colors">
              <Icon name="Plus" size={14} />Добавить отдел
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {departments.map((dept) => {
              const count = employees.filter((e) => e.departmentId === dept.id).length;
              return (
                <div key={dept.id} className="bg-[#161b27] border border-[#252d3d] rounded-xl p-4 hover:border-[#3b82f6]/30 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="w-9 h-9 rounded-lg bg-[#8b5cf6]/10 flex items-center justify-center">
                      <Icon name="Building" size={16} className="text-[#8b5cf6]" />
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openDeptForm(dept)} className="p-1.5 hover:bg-[#252d3d] rounded text-[#4b5568] hover:text-white transition-colors"><Icon name="Pencil" size={13} /></button>
                      <button onClick={() => deleteDepartment(dept.id)} className="p-1.5 hover:bg-[#ef4444]/20 rounded text-[#4b5568] hover:text-[#ef4444] transition-colors"><Icon name="Trash2" size={13} /></button>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-white mb-1">{dept.name}</div>
                  <div className="text-xs text-[#4b5568] mb-3">{dept.description}</div>
                  <div className="text-xs text-[#8892a4]">{count} сотр.</div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === 'positions' && (
        <>
          <div className="flex justify-end">
            <button onClick={() => openPositionForm()} className="flex items-center gap-2 px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-sm font-medium transition-colors">
              <Icon name="Plus" size={14} />Добавить должность
            </button>
          </div>
          <div className="bg-[#161b27] border border-[#252d3d] rounded-xl overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b border-[#252d3d]">
                {['Должность', 'Отдел', 'Тип оплаты', 'Оклад', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#4b5568] uppercase">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {positions.map((pos) => {
                  const dept = departments.find((d) => d.id === pos.departmentId);
                  return (
                    <tr key={pos.id} className="border-b border-[#252d3d] last:border-0 hover:bg-[#1e2637] transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-white">{pos.name}</td>
                      <td className="px-4 py-3 text-sm text-[#8892a4]">{dept?.name || '—'}</td>
                      <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full bg-[#3b82f6]/20 text-[#3b82f6]">{SALARY_TYPE_LABELS[pos.salaryType]}</span></td>
                      <td className="px-4 py-3 text-sm text-[#8892a4]">{pos.baseSalary > 0 ? `${pos.baseSalary.toLocaleString('ru-RU')} ₽` : '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => openPositionForm(pos)} className="p-1.5 hover:bg-[#252d3d] rounded text-[#4b5568] hover:text-white transition-colors"><Icon name="Pencil" size={13} /></button>
                          <button onClick={() => deletePosition(pos.id)} className="p-1.5 hover:bg-[#ef4444]/20 rounded text-[#4b5568] hover:text-[#ef4444] transition-colors"><Icon name="Trash2" size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'users' && (
        <>
          <div className="flex justify-end">
            <button onClick={() => openUserForm()} className="flex items-center gap-2 px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-sm font-medium transition-colors">
              <Icon name="Plus" size={14} />Добавить пользователя
            </button>
          </div>
          <div className="bg-[#161b27] border border-[#252d3d] rounded-xl overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b border-[#252d3d]">
                {['Логин', 'Сотрудник', 'Роль', 'Статус', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#4b5568] uppercase">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {users.map((u) => {
                  const emp = employees.find((e) => e.id === u.employeeId);
                  return (
                    <tr key={u.id} className="border-b border-[#252d3d] last:border-0 hover:bg-[#1e2637] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#3b82f6]/20 flex items-center justify-center text-xs font-semibold text-[#3b82f6]">{u.login[0].toUpperCase()}</div>
                          <span className="text-sm font-medium text-white">{u.login}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#8892a4]">{emp ? `${emp.lastName} ${emp.firstName}` : '—'}</td>
                      <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full bg-[#8b5cf6]/20 text-[#8b5cf6]">{ROLE_LABELS[u.role]}</span></td>
                      <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${u.isActive ? 'bg-[#10b981]/20 text-[#10b981]' : 'bg-[#ef4444]/20 text-[#ef4444]'}`}>{u.isActive ? 'Активен' : 'Заблокирован'}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => openUserForm(u)} className="p-1.5 hover:bg-[#252d3d] rounded text-[#4b5568] hover:text-white transition-colors"><Icon name="Pencil" size={13} /></button>
                          <button onClick={() => deleteUser(u.id)} className="p-1.5 hover:bg-[#ef4444]/20 rounded text-[#4b5568] hover:text-[#ef4444] transition-colors"><Icon name="Trash2" size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#8892a4] mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full bg-[#0f1117] border border-[#252d3d] rounded-lg px-3 py-2 text-sm text-white placeholder-[#4b5568] focus:outline-none focus:border-[#3b82f6] transition-colors";
const selectCls = `${inputCls} cursor-pointer`;

function FormActions({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
  return (
    <div className="flex gap-3 pt-4 border-t border-[#252d3d] mt-6">
      <button onClick={onSave} className="flex-1 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-sm font-medium transition-colors">Сохранить</button>
      <button onClick={onCancel} className="px-4 py-2 bg-[#1e2637] hover:bg-[#252d3d] text-[#8892a4] hover:text-white rounded-lg text-sm transition-colors">Отмена</button>
    </div>
  );
}

function EmployeeForm({ form: initial, onChange, departments, positions, onSave, onCancel }: { form: Partial<Employee>; onChange: (f: Partial<Employee>) => void; departments: Department[]; positions: Position[]; onSave: () => void; onCancel: () => void }) {
  const [form, setForm] = useState(initial);
  const update = (key: string, val: string) => { const next = { ...form, [key]: val }; setForm(next); onChange(next); };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Фамилия"><input value={form.lastName || ''} onChange={(e) => update('lastName', e.target.value)} className={inputCls} placeholder="Иванов" /></Field>
        <Field label="Имя"><input value={form.firstName || ''} onChange={(e) => update('firstName', e.target.value)} className={inputCls} placeholder="Иван" /></Field>
      </div>
      <Field label="Отчество"><input value={form.middleName || ''} onChange={(e) => update('middleName', e.target.value)} className={inputCls} placeholder="Иванович" /></Field>
      <Field label="Отдел">
        <select value={form.departmentId || ''} onChange={(e) => update('departmentId', e.target.value)} className={selectCls}>
          <option value="">Выберите отдел</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </Field>
      <Field label="Должность">
        <select value={form.positionId || ''} onChange={(e) => update('positionId', e.target.value)} className={selectCls}>
          <option value="">Выберите должность</option>
          {positions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Телефон"><input value={form.phone || ''} onChange={(e) => update('phone', e.target.value)} className={inputCls} placeholder="+7 (999) 000-00-00" /></Field>
        <Field label="Email"><input value={form.email || ''} onChange={(e) => update('email', e.target.value)} className={inputCls} placeholder="email@company.ru" /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Дата приёма"><input type="date" value={form.hireDate || ''} onChange={(e) => update('hireDate', e.target.value)} className={inputCls} /></Field>
        <Field label="Статус">
          <select value={form.status || 'active'} onChange={(e) => update('status', e.target.value)} className={selectCls}>
            <option value="active">Активен</option>
            <option value="vacation">Отпуск</option>
            <option value="fired">Уволен</option>
          </select>
        </Field>
      </div>
      <FormActions onSave={onSave} onCancel={onCancel} />
    </div>
  );
}

function PositionForm({ form: initial, onChange, departments, onSave, onCancel }: { form: Partial<Position>; onChange: (f: Partial<Position>) => void; departments: Department[]; onSave: () => void; onCancel: () => void }) {
  const [form, setForm] = useState(initial);
  const update = (key: string, val: string | number) => { const next = { ...form, [key]: val }; setForm(next); onChange(next); };
  return (
    <div className="space-y-4">
      <Field label="Название должности"><input value={form.name || ''} onChange={(e) => update('name', e.target.value)} className={inputCls} placeholder="Монтажник" /></Field>
      <Field label="Отдел">
        <select value={form.departmentId || ''} onChange={(e) => update('departmentId', e.target.value)} className={selectCls}>
          <option value="">Выберите отдел</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </Field>
      <Field label="Тип оплаты">
        <select value={form.salaryType || 'fixed'} onChange={(e) => update('salaryType', e.target.value)} className={selectCls}>
          <option value="fixed">Оклад</option>
          <option value="piece">Сдельная</option>
          <option value="kpi">КПИ</option>
          <option value="mixed">Смешанная</option>
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Базовый оклад (₽)"><input type="number" value={form.baseSalary || 0} onChange={(e) => update('baseSalary', +e.target.value)} className={inputCls} /></Field>
        <Field label="КПИ бонус (₽)"><input type="number" value={form.kpiBonus || 0} onChange={(e) => update('kpiBonus', +e.target.value)} className={inputCls} /></Field>
      </div>
      <Field label="Описание"><input value={form.description || ''} onChange={(e) => update('description', e.target.value)} className={inputCls} /></Field>
      <FormActions onSave={onSave} onCancel={onCancel} />
    </div>
  );
}

function GenericForm({ fields, form: initial, onChange, onSave, onCancel }: { fields: { key: string; label: string; type: string }[]; form: Record<string, string>; onChange: (f: Record<string, string>) => void; onSave: () => void; onCancel: () => void }) {
  const [form, setForm] = useState(initial);
  const update = (key: string, val: string) => { const next = { ...form, [key]: val }; setForm(next); onChange(next); };
  return (
    <div className="space-y-4">
      {fields.map((f) => (
        <Field key={f.key} label={f.label}><input type={f.type} value={form[f.key] || ''} onChange={(e) => update(f.key, e.target.value)} className={inputCls} /></Field>
      ))}
      <FormActions onSave={onSave} onCancel={onCancel} />
    </div>
  );
}

function UserForm({ form: initial, onChange, employees, onSave, onCancel }: { form: Partial<User> & { password?: string }; onChange: (f: Partial<User> & { password?: string }) => void; employees: Employee[]; onSave: () => void; onCancel: () => void }) {
  const [form, setForm] = useState(initial);
  const update = (key: string, val: string | boolean) => { const next = { ...form, [key]: val }; setForm(next); onChange(next); };
  return (
    <div className="space-y-4">
      <Field label="Сотрудник">
        <select value={form.employeeId || ''} onChange={(e) => update('employeeId', e.target.value)} className={selectCls}>
          <option value="">Без привязки</option>
          {employees.map((e) => <option key={e.id} value={e.id}>{e.lastName} {e.firstName}</option>)}
        </select>
      </Field>
      <Field label="Логин"><input value={form.login || ''} onChange={(e) => update('login', e.target.value)} className={inputCls} placeholder="user_login" /></Field>
      <Field label="Пароль"><input type="password" value={form.password || ''} onChange={(e) => update('password', e.target.value)} className={inputCls} placeholder="Введите пароль" /></Field>
      <Field label="Роль">
        <select value={form.role || 'manager'} onChange={(e) => update('role', e.target.value)} className={selectCls}>
          <option value="admin">Администратор</option>
          <option value="manager">Менеджер</option>
          <option value="technician">Техник</option>
          <option value="cashier">Кассир</option>
          <option value="warehouse">Кладовщик</option>
        </select>
      </Field>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={form.isActive ?? true} onChange={(e) => update('isActive', e.target.checked)} className="w-4 h-4 rounded border-[#252d3d] bg-[#0f1117] accent-[#3b82f6]" />
        <span className="text-sm text-[#8892a4]">Активен</span>
      </label>
      <FormActions onSave={onSave} onCancel={onCancel} />
    </div>
  );
}
