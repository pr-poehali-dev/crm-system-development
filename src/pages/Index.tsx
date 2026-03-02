import { useState, useCallback } from 'react';
import CRMLayout from '@/components/layout/CRMLayout';
import Dashboard from '@/components/modules/Dashboard';
import Employees from '@/components/modules/Employees';
import Events from '@/components/modules/Events';
import Warehouse from '@/components/modules/Warehouse';
import Cash from '@/components/modules/Cash';
import WorkActs from '@/components/modules/WorkActs';
import Reports from '@/components/modules/Reports';
import Salary from '@/components/modules/Salary';
import Contacts from '@/components/modules/Contacts';
import Settings from '@/components/modules/Settings';
import ServiceCalendar from '@/components/modules/ServiceCalendar';

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

interface RightPanel {
  title: string;
  content: React.ReactNode;
}

interface PendingTicket {
  name: string;
  address: string;
  phone: string;
  lbId?: string;
  contract?: string;
}

export default function Index() {
  const [module, setModule] = useState<Module>('dashboard');
  const [rightPanel, setRightPanel] = useState<RightPanel | null>(null);
  const [pendingTicket, setPendingTicket] = useState<PendingTicket | null>(null);

  const openPanel = useCallback((title: string, content: React.ReactNode) => {
    setRightPanel({ title, content });
  }, []);

  const closePanel = useCallback(() => {
    setRightPanel(null);
  }, []);

  const handleModuleChange = (m: string) => {
    setModule(m as Module);
    setRightPanel(null);
  };

  const handleCreateTicketFromContact = useCallback((sub: PendingTicket) => {
    setPendingTicket(sub);
    setModule('events');
    setRightPanel(null);
  }, []);

  const renderModule = () => {
    const props = { onOpenPanel: openPanel, onClosePanel: closePanel };
    switch (module) {
      case 'dashboard': return <Dashboard />;
      case 'employees': return <Employees {...props} />;
      case 'calendar': return <ServiceCalendar {...props} />;
      case 'events': {
        const prefill = pendingTicket || undefined;
        return (
          <Events
            {...props}
            prefilledSubscriber={prefill}
            key={prefill ? `ticket-${prefill.name}-${prefill.lbId}` : 'events'}
          />
        );
      }
      case 'warehouse': return <Warehouse {...props} />;
      case 'cash': return <Cash {...props} />;
      case 'acts': return <WorkActs {...props} />;
      case 'reports': return <Reports />;
      case 'salary': return <Salary {...props} />;
      case 'contacts': return (
        <Contacts
          {...props}
          onCreateTicket={handleCreateTicketFromContact}
        />
      );
      case 'settings': return <Settings {...props} />;
      default: return <Dashboard />;
    }
  };

  return (
    <CRMLayout
      activeModule={module}
      onModuleChange={handleModuleChange}
      rightPanel={rightPanel?.content}
      rightPanelTitle={rightPanel?.title}
      onCloseRightPanel={closePanel}
    >
      {renderModule()}
    </CRMLayout>
  );
}