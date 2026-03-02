import { useState, useCallback } from 'react';
import CRMLayout from '@/components/layout/CRMLayout';
import Dashboard from '@/components/modules/Dashboard';
import Employees from '@/components/modules/Employees';
import ServiceCalendar from '@/components/modules/ServiceCalendar';
import ServiceTickets from '@/components/modules/ServiceTickets';
import PaidCalls from '@/components/modules/PaidCalls';
import Warehouse from '@/components/modules/Warehouse';
import Cash from '@/components/modules/Cash';
import WorkActs from '@/components/modules/WorkActs';
import Reports from '@/components/modules/Reports';
import Salary from '@/components/modules/Salary';
import Contacts from '@/components/modules/Contacts';
import Settings from '@/components/modules/Settings';

type Module =
  | 'dashboard'
  | 'employees'
  | 'service-calendar'
  | 'service-tickets'
  | 'paid-calls'
  | 'warehouse'
  | 'cash'
  | 'acts'
  | 'reports'
  | 'salary'
  | 'contacts'
  | 'settings';

interface RightPanel {
  title: string;
  content: React.ReactNode;
}

export default function Index() {
  const [module, setModule] = useState<Module>('dashboard');
  const [rightPanel, setRightPanel] = useState<RightPanel | null>(null);

  const openPanel = useCallback((title: string, content: React.ReactNode) => {
    setRightPanel({ title, content });
  }, []);

  const closePanel = useCallback(() => {
    setRightPanel(null);
  }, []);

  const handleModuleChange = (m: Module) => {
    setModule(m as Module);
    setRightPanel(null);
  };

  const renderModule = () => {
    const props = { onOpenPanel: openPanel, onClosePanel: closePanel };
    switch (module) {
      case 'dashboard': return <Dashboard />;
      case 'employees': return <Employees {...props} />;
      case 'service-calendar': return <ServiceCalendar {...props} />;
      case 'service-tickets': return <ServiceTickets {...props} />;
      case 'paid-calls': return <PaidCalls {...props} />;
      case 'warehouse': return <Warehouse {...props} />;
      case 'cash': return <Cash {...props} />;
      case 'acts': return <WorkActs {...props} />;
      case 'reports': return <Reports />;
      case 'salary': return <Salary {...props} />;
      case 'contacts': return <Contacts {...props} />;
      case 'settings': return <Settings {...props} />;
      default: return <Dashboard />;
    }
  };

  return (
    <CRMLayout
      activeModule={module}
      onModuleChange={handleModuleChange as (m: string) => void}
      rightPanel={rightPanel?.content}
      rightPanelTitle={rightPanel?.title}
      onCloseRightPanel={closePanel}
    >
      {renderModule()}
    </CRMLayout>
  );
}
