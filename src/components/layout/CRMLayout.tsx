import { useState } from 'react';
import { useCRMStore } from '@/store/crmStore';
import Icon from '@/components/ui/icon';

type Module =
  | 'dashboard'
  | 'employees'
  | 'events'
  | 'calendar'
  | 'warehouse'
  | 'cash'
  | 'acts'
  | 'reports'
  | 'salary'
  | 'contacts'
  | 'settings';

interface NavItem {
  id: Module;
  label: string;
  icon: string;
  group?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Главная', icon: 'LayoutDashboard' },
  { id: 'events', label: 'Заявки', icon: 'ClipboardList', group: 'Сервис' },
  { id: 'calendar', label: 'Календарь подключений', icon: 'CalendarDays', group: 'Сервис' },
  { id: 'warehouse', label: 'Склад', icon: 'Package', group: 'Склад' },
  { id: 'cash', label: 'Касса', icon: 'Receipt', group: 'Финансы' },
  { id: 'acts', label: 'Акты работ', icon: 'FileCheck', group: 'Финансы' },
  { id: 'salary', label: 'Зарплата', icon: 'Wallet', group: 'Финансы' },
  { id: 'reports', label: 'Отчёты', icon: 'BarChart2', group: 'Финансы' },
  { id: 'contacts', label: 'Контакты', icon: 'Users', group: 'Клиенты' },
  { id: 'employees', label: 'Сотрудники', icon: 'UserCog', group: 'Компания' },
  { id: 'settings', label: 'Настройки', icon: 'Settings', group: 'Компания' },
];

interface Props {
  activeModule: string;
  onModuleChange: (m: string) => void;
  children: React.ReactNode;
  rightPanel?: React.ReactNode;
  rightPanelTitle?: string;
  onCloseRightPanel?: () => void;
}

export default function CRMLayout({ activeModule, onModuleChange, children, rightPanel, rightPanelTitle, onCloseRightPanel }: Props) {
  const { offices, currentOfficeId, setCurrentOffice } = useCRMStore();
  const [officeDropdown, setOfficeDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const currentOffice = offices.find((o) => o.id === currentOfficeId);

  const groups = ['', 'Сервис', 'Склад', 'Финансы', 'Клиенты', 'Компания'];

  const handleModuleChange = (m: string) => {
    onModuleChange(m);
    setMobileMenuOpen(false);
  };

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-[#252d3d] flex-shrink-0">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-7 h-7 rounded-lg bg-[#3b82f6] flex items-center justify-center">
            <Icon name="Zap" size={14} className="text-white" />
          </div>
          <span className="font-semibold text-sm text-white">NetCRM</span>
        </div>
        {/* Close button — mobile only */}
        <button
          className="md:hidden p-1.5 rounded-lg text-[#8892a4] hover:text-white"
          onClick={() => setMobileMenuOpen(false)}
        >
          <Icon name="X" size={18} />
        </button>
      </div>

      {/* Office Switcher */}
      <div className="px-3 py-3 border-b border-[#252d3d] relative flex-shrink-0">
        <button
          onClick={() => setOfficeDropdown(!officeDropdown)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1e2637] hover:bg-[#252d3d] transition-colors text-left group"
        >
          <div className="w-6 h-6 rounded-md bg-[#3b82f6]/20 flex items-center justify-center flex-shrink-0">
            <Icon name="Building2" size={12} className="text-[#3b82f6]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-[#8892a4] leading-none mb-0.5">Офис</div>
            <div className="text-sm font-medium text-white truncate">{currentOffice?.name}</div>
          </div>
          <Icon name="ChevronsUpDown" size={14} className="text-[#8892a4] group-hover:text-white transition-colors flex-shrink-0" />
        </button>

        {officeDropdown && (
          <div className="absolute left-3 right-3 top-full mt-1 z-50 bg-[#1e2637] border border-[#252d3d] rounded-lg shadow-xl py-1">
            {offices.map((office) => (
              <button
                key={office.id}
                onClick={() => { setCurrentOffice(office.id); setOfficeDropdown(false); }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-[#252d3d] transition-colors flex items-center gap-2 ${office.id === currentOfficeId ? 'text-[#3b82f6]' : 'text-white'}`}
              >
                <Icon name={office.id === currentOfficeId ? 'CheckCircle2' : 'Circle'} size={14} />
                {office.name}
              </button>
            ))}
            <div className="border-t border-[#252d3d] mt-1 pt-1">
              <button
                onClick={() => { handleModuleChange('settings'); setOfficeDropdown(false); }}
                className="w-full px-3 py-2 text-left text-xs text-[#8892a4] hover:text-white hover:bg-[#252d3d] transition-colors flex items-center gap-2"
              >
                <Icon name="Plus" size={12} />
                Добавить офис
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {groups.map((group) => {
          const items = NAV_ITEMS.filter((i) => (i.group || '') === group);
          if (items.length === 0) return null;
          return (
            <div key={group} className="mb-1">
              {group && (
                <div className="px-3 py-1.5 text-[10px] font-semibold text-[#4b5568] uppercase tracking-wider mt-2">{group}</div>
              )}
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleModuleChange(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                    activeModule === item.id
                      ? 'bg-[#3b82f6] text-white font-medium shadow-lg shadow-blue-500/20'
                      : 'text-[#8892a4] hover:text-white hover:bg-[#1e2637]'
                  }`}
                >
                  <Icon name={item.icon} size={15} />
                  <span className="truncate">{item.label}</span>
                </button>
              ))}
            </div>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-[#252d3d] flex-shrink-0">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="w-7 h-7 rounded-full bg-[#3b82f6] flex items-center justify-center text-xs font-semibold">А</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white truncate">Администратор</div>
            <div className="text-xs text-[#4b5568]">admin</div>
          </div>
          <button className="text-[#4b5568] hover:text-white transition-colors">
            <Icon name="LogOut" size={14} />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-[#0f1117] text-white font-['Golos_Text'] overflow-hidden">

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-56 flex-shrink-0 bg-[#161b27] border-r border-[#252d3d] flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] bg-[#161b27] border-r border-[#252d3d] flex flex-col h-full z-10">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 bg-[#161b27] border-b border-[#252d3d] flex items-center px-4 gap-3 flex-shrink-0">
          {/* Burger — mobile only */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-[#1e2637] text-[#8892a4] hover:text-white transition-colors flex-shrink-0"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Icon name="Menu" size={18} />
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-white truncate">
              {NAV_ITEMS.find((i) => i.id === activeModule)?.label || 'Главная'}
            </h1>
            <div className="text-xs text-[#4b5568] truncate hidden sm:block">{currentOffice?.name} • {new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button className="p-2 rounded-lg hover:bg-[#1e2637] transition-colors text-[#8892a4] hover:text-white">
              <Icon name="Bell" size={16} />
            </button>
            <button className="p-2 rounded-lg hover:bg-[#1e2637] transition-colors text-[#8892a4] hover:text-white">
              <Icon name="Search" size={16} />
            </button>
          </div>
        </header>

        {/* Content + Right Panel */}
        <div className="flex-1 flex overflow-hidden">
          <main className="flex-1 overflow-y-auto p-3 md:p-6">
            {children}
          </main>

          {/* Right Panel — fullscreen on mobile, fixed width on desktop */}
          {rightPanel && (
            <div className="fixed md:relative inset-0 md:inset-auto md:w-[420px] flex-shrink-0 bg-[#161b27] md:border-l border-[#252d3d] flex flex-col animate-slide-in-right z-40">
              <div className="h-14 flex items-center px-5 border-b border-[#252d3d] flex-shrink-0">
                <span className="font-semibold text-sm text-white flex-1 truncate">{rightPanelTitle || 'Детали'}</span>
                <button onClick={onCloseRightPanel} className="p-1.5 rounded-lg hover:bg-[#252d3d] text-[#8892a4] hover:text-white transition-colors">
                  <Icon name="X" size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 md:p-5">
                {rightPanel}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}