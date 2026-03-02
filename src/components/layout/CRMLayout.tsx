import { useState } from 'react';
import { useCRMStore } from '@/store/crmStore';
import Icon from '@/components/ui/icon';
import { useTheme } from '@/contexts/ThemeContext';

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
  const { theme, toggleTheme } = useTheme();
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
      <div className="h-14 flex items-center px-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <Icon name="Zap" size={14} className="text-white" />
          </div>
          <span className="font-semibold text-sm text-foreground">NetCRM</span>
        </div>
        {/* Close button — mobile only */}
        <button
          className="md:hidden p-1.5 rounded-lg text-muted-foreground hover:text-foreground"
          onClick={() => setMobileMenuOpen(false)}
        >
          <Icon name="X" size={18} />
        </button>
      </div>

      {/* Office Switcher */}
      <div className="px-3 py-3 border-b border-border relative flex-shrink-0">
        <button
          onClick={() => setOfficeDropdown(!officeDropdown)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-muted hover:bg-accent transition-colors text-left group"
        >
          <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Icon name="Building2" size={12} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground leading-none mb-0.5">Офис</div>
            <div className="text-sm font-medium text-foreground truncate">{currentOffice?.name}</div>
          </div>
          <Icon name="ChevronsUpDown" size={14} className="text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
        </button>

        {officeDropdown && (
          <div className="absolute left-3 right-3 top-full mt-1 z-50 bg-card border border-border rounded-lg shadow-xl py-1">
            {offices.map((office) => (
              <button
                key={office.id}
                onClick={() => { setCurrentOffice(office.id); setOfficeDropdown(false); }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors flex items-center gap-2 ${office.id === currentOfficeId ? 'text-primary' : 'text-foreground'}`}
              >
                <Icon name={office.id === currentOfficeId ? 'CheckCircle2' : 'Circle'} size={14} />
                {office.name}
              </button>
            ))}
            <div className="border-t border-border mt-1 pt-1">
              <button
                onClick={() => { handleModuleChange('settings'); setOfficeDropdown(false); }}
                className="w-full px-3 py-2 text-left text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center gap-2"
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
                <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-2">{group}</div>
              )}
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleModuleChange(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                    activeModule === item.id
                      ? 'bg-primary text-white font-medium shadow-lg shadow-primary/20'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
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
      <div className="p-3 border-t border-border flex-shrink-0">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-xs font-semibold text-white">А</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-foreground truncate">Администратор</div>
            <div className="text-xs text-muted-foreground">admin</div>
          </div>
          <button className="text-muted-foreground hover:text-foreground transition-colors">
            <Icon name="LogOut" size={14} />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-background text-foreground font-['Golos_Text'] overflow-hidden">

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-56 flex-shrink-0 bg-card border-r border-border flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] bg-card border-r border-border flex flex-col h-full z-10">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 bg-card border-b border-border flex items-center px-4 gap-3 flex-shrink-0">
          {/* Burger — mobile only */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Icon name="Menu" size={18} />
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-foreground truncate">
              {NAV_ITEMS.find((i) => i.id === activeModule)?.label || 'Главная'}
            </h1>
            <div className="text-xs text-muted-foreground truncate hidden sm:block">{currentOffice?.name} • {new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
              <Icon name="Bell" size={16} />
            </button>
            <button className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
              <Icon name="Search" size={16} />
            </button>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
            >
              <Icon name={theme === 'dark' ? 'Sun' : 'Moon'} size={16} />
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
            <div className="fixed md:relative inset-0 md:inset-auto md:w-[420px] flex-shrink-0 bg-card md:border-l border-border flex flex-col animate-slide-in-right z-40">
              <div className="h-14 flex items-center px-5 border-b border-border flex-shrink-0">
                <span className="font-semibold text-sm text-foreground flex-1 truncate">{rightPanelTitle || 'Детали'}</span>
                <button onClick={onCloseRightPanel} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
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