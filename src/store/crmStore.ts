import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Office, Department, Position, Employee, User,
  Connection, ServiceTicket, PaidCall, CalendarSlotSettings,
  Warehouse, Category, Product, StockOperation, WarehouseStock,
  CashRegister, Sale, WorkAct, Subscriber, SalarySheet, CRMEvent,
  CashPayment, ExpenseCategory, Supplier,
} from '../types/crm';

interface CRMState {
  currentOfficeId: string;
  offices: Office[];
  departments: Department[];
  positions: Position[];
  employees: Employee[];
  users: User[];
  connections: Connection[];
  serviceTickets: ServiceTicket[];
  paidCalls: PaidCall[];
  calendarSettings: CalendarSlotSettings[];
  warehouses: Warehouse[];
  categories: Category[];
  products: Product[];
  stockOperations: StockOperation[];
  warehouseStock: WarehouseStock[];
  suppliers: Supplier[];
  cashRegisters: CashRegister[];
  cashPayments: CashPayment[];
  expenseCategories: ExpenseCategory[];
  sales: Sale[];
  workActs: WorkAct[];
  subscribers: Subscriber[];
  salarySheets: SalarySheet[];

  setCurrentOffice: (id: string) => void;
  addOffice: (office: Office) => void;
  updateOffice: (id: string, data: Partial<Office>) => void;
  deleteOffice: (id: string) => void;

  addDepartment: (dept: Department) => void;
  updateDepartment: (id: string, data: Partial<Department>) => void;
  deleteDepartment: (id: string) => void;

  addPosition: (pos: Position) => void;
  updatePosition: (id: string, data: Partial<Position>) => void;
  deletePosition: (id: string) => void;

  addEmployee: (emp: Employee) => void;
  updateEmployee: (id: string, data: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;

  addUser: (user: User) => void;
  updateUser: (id: string, data: Partial<User>) => void;
  deleteUser: (id: string) => void;

  addConnection: (conn: Connection) => void;
  updateConnection: (id: string, data: Partial<Connection>) => void;
  deleteConnection: (id: string) => void;

  updateCalendarSettings: (settings: CalendarSlotSettings) => void;

  addServiceTicket: (ticket: ServiceTicket) => void;
  updateServiceTicket: (id: string, data: Partial<ServiceTicket>) => void;
  deleteServiceTicket: (id: string) => void;

  addPaidCall: (call: PaidCall) => void;
  updatePaidCall: (id: string, data: Partial<PaidCall>) => void;
  deletePaidCall: (id: string) => void;

  addWarehouse: (wh: Warehouse) => void;
  updateWarehouse: (id: string, data: Partial<Warehouse>) => void;
  deleteWarehouse: (id: string) => void;

  addCategory: (cat: Category) => void;
  updateCategory: (id: string, data: Partial<Category>) => void;
  deleteCategory: (id: string) => void;

  addProduct: (prod: Product) => void;
  updateProduct: (id: string, data: Partial<Product>) => void;
  deleteProduct: (id: string) => void;

  addStockOperation: (op: StockOperation) => void;

  addSupplier: (s: Supplier) => void;
  updateSupplier: (id: string, data: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;

  addCashRegister: (cr: CashRegister) => void;
  updateCashRegister: (id: string, data: Partial<CashRegister>) => void;
  deleteCashRegister: (id: string) => void;

  addCashPayment: (payment: CashPayment) => void;

  addExpenseCategory: (cat: ExpenseCategory) => void;
  updateExpenseCategory: (id: string, data: Partial<ExpenseCategory>) => void;
  deleteExpenseCategory: (id: string) => void;

  addSale: (sale: Sale) => void;
  updateSale: (id: string, data: Partial<Sale>) => void;

  addWorkAct: (act: WorkAct) => void;
  updateWorkAct: (id: string, data: Partial<WorkAct>) => void;
  deleteWorkAct: (id: string) => void;

  addSubscriber: (sub: Subscriber) => void;
  updateSubscriber: (id: string, data: Partial<Subscriber>) => void;

  events: CRMEvent[];
  addEvent: (event: CRMEvent) => void;
  updateEvent: (id: string, data: Partial<CRMEvent>) => void;
  deleteEvent: (id: string) => void;

  addSalarySheet: (sheet: SalarySheet) => void;
  updateSalarySheet: (id: string, data: Partial<SalarySheet>) => void;
  deleteSalarySheet: (id: string) => void;

  appSettings: { promisedPaymentFee: number };
  updateAppSettings: (data: Partial<{ promisedPaymentFee: number }>) => void;
}

const INIT_OFFICES: Office[] = [
  { id: '1', name: 'Абакан', address: 'г. Абакан, ул. Ленина 1', phone: '+7 (3902) 00-00-01' },
  { id: '2', name: 'Шушенское', address: 'пгт. Шушенское, ул. Советская 5', phone: '+7 (3902) 00-00-02' },
];

const INIT_DEPARTMENTS: Department[] = [
  { id: '1', name: 'Технический отдел', description: 'Монтаж и обслуживание сети' },
  { id: '2', name: 'Офис продаж', description: 'Работа с клиентами и продажи' },
  { id: '3', name: 'Бухгалтерия', description: 'Финансовый учёт' },
];

const INIT_POSITIONS: Position[] = [
  { id: '1', name: 'Монтажник', departmentId: '1', salaryType: 'piece', baseSalary: 0, description: 'Монтаж подключений' },
  { id: '2', name: 'Менеджер продаж', departmentId: '2', salaryType: 'kpi', baseSalary: 30000, kpiBonus: 10000, description: 'Продажи услуг' },
  { id: '3', name: 'Бухгалтер', departmentId: '3', salaryType: 'fixed', baseSalary: 35000, description: 'Ведение бухучёта' },
  { id: '4', name: 'Техник поддержки', departmentId: '1', salaryType: 'fixed', baseSalary: 28000, description: 'Поддержка абонентов' },
];

const INIT_EMPLOYEES: Employee[] = [
  { id: '1', firstName: 'Иван', lastName: 'Петров', middleName: 'Сергеевич', positionId: '1', departmentId: '1', phone: '+7 (999) 111-22-33', email: 'petrov@crm.ru', hireDate: '2022-01-10', status: 'active', userId: '1' },
  { id: '2', firstName: 'Мария', lastName: 'Сидорова', middleName: 'Александровна', positionId: '2', departmentId: '2', phone: '+7 (999) 444-55-66', email: 'sidorova@crm.ru', hireDate: '2021-05-20', status: 'active', userId: '2' },
  { id: '3', firstName: 'Алексей', lastName: 'Козлов', middleName: 'Николаевич', positionId: '4', departmentId: '1', phone: '+7 (999) 777-88-99', email: 'kozlov@crm.ru', hireDate: '2023-03-15', status: 'active' },
];

const INIT_USERS: User[] = [
  { id: '1', employeeId: '1', login: 'petrov', role: 'technician', isActive: true, createdAt: '2022-01-10' },
  { id: '2', employeeId: '2', login: 'sidorova', role: 'manager', isActive: true, createdAt: '2021-05-20' },
  { id: 'admin', employeeId: '', login: 'admin', role: 'admin', isActive: true, createdAt: '2020-01-01' },
];

const INIT_SUBSCRIBERS: Subscriber[] = [
  { id: '1', fullName: 'Иванов Андрей Петрович', address: 'г. Абакан, ул. Пушкина 10, кв. 5', phone: '+7 (983) 111-22-33', email: 'ivanov@mail.ru', contractNumber: 'АБК-001234', tariff: 'Домашний 100', balance: 450, status: 'active', connectDate: '2020-03-15', ipAddress: '10.0.1.100' },
  { id: '2', fullName: 'Смирнова Ольга Дмитриевна', address: 'г. Абакан, пр. Дружбы народов 25, кв. 12', phone: '+7 (983) 444-55-66', contractNumber: 'АБК-001235', tariff: 'Домашний 200', balance: -120, status: 'suspended', connectDate: '2021-07-01', ipAddress: '10.0.1.101' },
  { id: '3', fullName: 'Кузнецов Виктор Иванович', address: 'г. Абакан, ул. Крылова 3, кв. 8', phone: '+7 (983) 777-88-99', contractNumber: 'АБК-001236', tariff: 'Бизнес 500', balance: 1200, status: 'active', connectDate: '2019-11-20', ipAddress: '10.0.2.50' },
  { id: '4', fullName: 'Попова Елена Сергеевна', address: 'пгт. Шушенское, ул. Советская 15, кв. 3', phone: '+7 (983) 222-33-44', contractNumber: 'ШШ-000123', tariff: 'Домашний 100', balance: 300, status: 'active', connectDate: '2022-01-10', ipAddress: '10.0.3.10' },
];

const INIT_CATEGORIES: Category[] = [
  { id: '1', name: 'Кабели и провода' },
  { id: '2', name: 'Оборудование' },
  { id: '3', name: 'Расходники' },
  { id: '4', name: 'Роутеры', parentId: '2' },
  { id: '5', name: 'Коммутаторы', parentId: '2' },
];

const INIT_PRODUCTS: Product[] = [
  { id: '1', categoryId: '1', name: 'Кабель витая пара CAT5e', sku: 'KB-CAT5E', unit: 'м', description: 'Кабель для прокладки сети', price: 18 },
  { id: '2', categoryId: '4', name: 'Роутер TP-Link TL-WR841N', sku: 'RT-TPWN841', unit: 'шт', description: 'Wi-Fi роутер 300 Мбит/с', price: 1200 },
  { id: '3', categoryId: '5', name: 'Коммутатор 8 портов', sku: 'SW-8P', unit: 'шт', description: 'Неуправляемый коммутатор', price: 850 },
  { id: '4', categoryId: '3', name: 'Клипсы монтажные', sku: 'CL-100', unit: 'уп', description: 'Упаковка 100 шт', price: 90 },
];

const defaultWeekdaySlots = () => [
  { id: 'w1', time: '09:00', brigades: 2 },
  { id: 'w2', time: '11:00', brigades: 2 },
  { id: 'w3', time: '13:00', brigades: 1 },
  { id: 'w4', time: '15:00', brigades: 2 },
  { id: 'w5', time: '17:00', brigades: 1 },
];
const defaultWeekendSlots = () => [
  { id: 'we1', time: '10:00', brigades: 1 },
  { id: 'we2', time: '14:00', brigades: 1 },
];

const INIT_CALENDAR_SETTINGS: CalendarSlotSettings[] = [
  { officeId: '1', weekdaySlots: defaultWeekdaySlots(), weekendSlots: defaultWeekendSlots(), specialDates: [] },
  { officeId: '2', weekdaySlots: defaultWeekdaySlots(), weekendSlots: defaultWeekendSlots(), specialDates: [] },
];

const INIT_CASH_REGISTERS: CashRegister[] = [
  { id: '1', officeId: '1', name: 'Касса 1 (Абакан)', isActive: true },
  { id: '2', officeId: '2', name: 'Касса 1 (Шушенское)', isActive: true },
];

const INIT_EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { id: '1', name: 'Аренда', description: 'Аренда помещений' },
  { id: '2', name: 'Зарплата', description: 'Выплаты сотрудникам' },
  { id: '3', name: 'Хозяйственные нужды', description: 'Расходы на офис' },
  { id: '4', name: 'Транспорт', description: 'Топливо, ремонт авто' },
  { id: '5', name: 'Связь', description: 'Телефония, интернет' },
  { id: '6', name: 'Оборудование', description: 'Закупка оборудования' },
];

const INIT_SUPPLIERS: Supplier[] = [];

const INIT_WAREHOUSES: Warehouse[] = [
  { id: '1', officeId: '1', name: 'Основной склад', address: 'г. Абакан, ул. Ленина 1', description: 'Главный склад Абакан' },
  { id: '2', officeId: '2', name: 'Склад Шушенское', address: 'пгт. Шушенское, ул. Советская 5', description: 'Склад Шушенское' },
];

const INIT_CONNECTIONS: Connection[] = [
  { id: '1', officeId: '1', subscriberId: '1', subscriberName: 'Иванов Андрей Петрович', subscriberAddress: 'г. Абакан, ул. Пушкина 10, кв. 5', subscriberPhone: '+7 (983) 111-22-33', date: new Date().toISOString().split('T')[0], timeSlot: '10:00', technicianId: '1', status: 'scheduled', notes: 'Первичное подключение', createdAt: new Date().toISOString() },
];

const INIT_TICKETS: ServiceTicket[] = [
  { id: '1', officeId: '1', subscriberId: '2', subscriberName: 'Смирнова Ольга Дмитриевна', subscriberAddress: 'г. Абакан, пр. Дружбы народов 25, кв. 12', subscriberPhone: '+7 (983) 444-55-66', technicianId: '3', problem: 'Нет интернета, абонент не выходит в сеть', status: 'new', priority: 'high', createdAt: new Date().toISOString(), notes: '' },
];

const INIT_PAID_CALLS: PaidCall[] = [
  { id: '1', officeId: '1', subscriberId: '3', subscriberName: 'Кузнецов Виктор Иванович', subscriberAddress: 'г. Абакан, ул. Крылова 3, кв. 8', subscriberPhone: '+7 (983) 777-88-99', technicianId: '1', description: 'Настройка роутера', amount: 500, status: 'done', date: new Date().toISOString().split('T')[0], createdAt: new Date().toISOString() },
];

const INIT_SALES: Sale[] = [
  { id: '1', officeId: '1', cashRegisterId: '1', items: [{ productId: '2', productName: 'Роутер TP-Link TL-WR841N', quantity: 1, price: 1200, amount: 1200 }], totalAmount: 1200, paymentMethod: 'cash', employeeId: '2', customerName: 'Иванов Андрей Петрович', status: 'completed', date: new Date().toISOString().split('T')[0], createdAt: new Date().toISOString() },
];

const INIT_WORK_ACTS: WorkAct[] = [
  { id: '1', officeId: '1', number: 'АКТ-2026-001', employeeId: '1', date: new Date().toISOString().split('T')[0], items: [{ description: 'Монтаж подключения', quantity: 2, price: 800, amount: 1600 }], totalAmount: 1600, status: 'approved', notes: '', createdAt: new Date().toISOString() },
];

export const useCRMStore = create<CRMState>()(
  persist(
    (set) => ({
      currentOfficeId: '1',
      offices: INIT_OFFICES,
      departments: INIT_DEPARTMENTS,
      positions: INIT_POSITIONS,
      employees: INIT_EMPLOYEES,
      users: INIT_USERS,
      connections: INIT_CONNECTIONS,
      serviceTickets: INIT_TICKETS,
      paidCalls: INIT_PAID_CALLS,
      calendarSettings: INIT_CALENDAR_SETTINGS,
      warehouses: INIT_WAREHOUSES,
      categories: INIT_CATEGORIES,
      products: INIT_PRODUCTS,
      stockOperations: [],
      warehouseStock: [],
      suppliers: INIT_SUPPLIERS,
      cashRegisters: INIT_CASH_REGISTERS,
      cashPayments: [],
      expenseCategories: INIT_EXPENSE_CATEGORIES,
      sales: INIT_SALES,
      workActs: INIT_WORK_ACTS,
      subscribers: INIT_SUBSCRIBERS,
      events: [],
      salarySheets: [],
      appSettings: { promisedPaymentFee: 30 },

      setCurrentOffice: (id) => set({ currentOfficeId: id }),

      addOffice: (office) => set((s) => ({ offices: [...s.offices, office] })),
      updateOffice: (id, data) => set((s) => ({ offices: s.offices.map((o) => o.id === id ? { ...o, ...data } : o) })),
      deleteOffice: (id) => set((s) => ({ offices: s.offices.filter((o) => o.id !== id) })),

      addDepartment: (dept) => set((s) => ({ departments: [...s.departments, dept] })),
      updateDepartment: (id, data) => set((s) => ({ departments: s.departments.map((d) => d.id === id ? { ...d, ...data } : d) })),
      deleteDepartment: (id) => set((s) => ({ departments: s.departments.filter((d) => d.id !== id) })),

      addPosition: (pos) => set((s) => ({ positions: [...s.positions, pos] })),
      updatePosition: (id, data) => set((s) => ({ positions: s.positions.map((p) => p.id === id ? { ...p, ...data } : p) })),
      deletePosition: (id) => set((s) => ({ positions: s.positions.filter((p) => p.id !== id) })),

      addEmployee: (emp) => set((s) => ({ employees: [...s.employees, emp] })),
      updateEmployee: (id, data) => set((s) => ({ employees: s.employees.map((e) => e.id === id ? { ...e, ...data } : e) })),
      deleteEmployee: (id) => set((s) => ({ employees: s.employees.filter((e) => e.id !== id) })),

      addUser: (user) => set((s) => ({ users: [...s.users, user] })),
      updateUser: (id, data) => set((s) => ({ users: s.users.map((u) => u.id === id ? { ...u, ...data } : u) })),
      deleteUser: (id) => set((s) => ({ users: s.users.filter((u) => u.id !== id) })),

      addConnection: (conn) => set((s) => ({ connections: [...s.connections, conn] })),
      updateConnection: (id, data) => set((s) => ({ connections: s.connections.map((c) => c.id === id ? { ...c, ...data } : c) })),
      deleteConnection: (id) => set((s) => ({ connections: s.connections.filter((c) => c.id !== id) })),

      updateCalendarSettings: (settings) => set((s) => {
        const exists = s.calendarSettings.find((c) => c.officeId === settings.officeId);
        if (exists) return { calendarSettings: s.calendarSettings.map((c) => c.officeId === settings.officeId ? settings : c) };
        return { calendarSettings: [...s.calendarSettings, settings] };
      }),

      addServiceTicket: (ticket) => set((s) => ({ serviceTickets: [...s.serviceTickets, ticket] })),
      updateServiceTicket: (id, data) => set((s) => ({ serviceTickets: s.serviceTickets.map((t) => t.id === id ? { ...t, ...data } : t) })),
      deleteServiceTicket: (id) => set((s) => ({ serviceTickets: s.serviceTickets.filter((t) => t.id !== id) })),

      addPaidCall: (call) => set((s) => ({ paidCalls: [...s.paidCalls, call] })),
      updatePaidCall: (id, data) => set((s) => ({ paidCalls: s.paidCalls.map((c) => c.id === id ? { ...c, ...data } : c) })),
      deletePaidCall: (id) => set((s) => ({ paidCalls: s.paidCalls.filter((c) => c.id !== id) })),

      addWarehouse: (wh) => set((s) => ({ warehouses: [...s.warehouses, wh] })),
      updateWarehouse: (id, data) => set((s) => ({ warehouses: s.warehouses.map((w) => w.id === id ? { ...w, ...data } : w) })),
      deleteWarehouse: (id) => set((s) => ({ warehouses: s.warehouses.filter((w) => w.id !== id) })),

      addCategory: (cat) => set((s) => ({ categories: [...s.categories, cat] })),
      updateCategory: (id, data) => set((s) => ({ categories: s.categories.map((c) => c.id === id ? { ...c, ...data } : c) })),
      deleteCategory: (id) => set((s) => ({ categories: s.categories.filter((c) => c.id !== id) })),

      addProduct: (prod) => set((s) => ({ products: [...s.products, prod] })),
      updateProduct: (id, data) => set((s) => ({ products: s.products.map((p) => p.id === id ? { ...p, ...data } : p) })),
      deleteProduct: (id) => set((s) => ({ products: s.products.filter((p) => p.id !== id) })),

      addStockOperation: (op) => set((s) => {
        const newStock = [...s.warehouseStock];

        const applyItems = (items: Array<{ productId: string; quantity: number; serialNumbers?: string[] }>, whId: string, toWhId?: string) => {
          for (const item of items) {
            const idx = newStock.findIndex((st) => st.warehouseId === whId && st.productId === item.productId);
            if (op.type === 'receipt' || op.type === 'return') {
              const newSerials = [...(newStock[idx]?.serialNumbers || []), ...(item.serialNumbers || [])];
              if (idx >= 0) newStock[idx] = { ...newStock[idx], quantity: newStock[idx].quantity + item.quantity, serialNumbers: newSerials };
              else newStock.push({ warehouseId: whId, productId: item.productId, quantity: item.quantity, serialNumbers: item.serialNumbers || [] });
            } else if (op.type === 'writeoff' || op.type === 'sale') {
              if (idx >= 0) {
                const removeSerials = item.serialNumbers || [];
                const remaining = (newStock[idx].serialNumbers || []).filter(sn => !removeSerials.includes(sn));
                newStock[idx] = { ...newStock[idx], quantity: Math.max(0, newStock[idx].quantity - item.quantity), serialNumbers: remaining };
              }
            } else if (op.type === 'transfer' && toWhId) {
              if (idx >= 0) {
                const removeSerials = item.serialNumbers || [];
                const remaining = (newStock[idx].serialNumbers || []).filter(sn => !removeSerials.includes(sn));
                newStock[idx] = { ...newStock[idx], quantity: Math.max(0, newStock[idx].quantity - item.quantity), serialNumbers: remaining };
              }
              const toIdx = newStock.findIndex((st) => st.warehouseId === toWhId && st.productId === item.productId);
              const addSerials = [...(newStock[toIdx]?.serialNumbers || []), ...(item.serialNumbers || [])];
              if (toIdx >= 0) newStock[toIdx] = { ...newStock[toIdx], quantity: newStock[toIdx].quantity + item.quantity, serialNumbers: addSerials };
              else newStock.push({ warehouseId: toWhId, productId: item.productId, quantity: item.quantity, serialNumbers: item.serialNumbers || [] });
            }
          }
        };

        if (op.items && op.items.length > 0) {
          applyItems(op.items, op.warehouseId, op.toWarehouseId);
        } else {
          applyItems([{ productId: op.productId, quantity: op.quantity, serialNumbers: [] }], op.warehouseId, op.toWarehouseId);
        }

        return { stockOperations: [...s.stockOperations, op], warehouseStock: newStock };
      }),

      addSupplier: (s_) => set((s) => ({ suppliers: [...s.suppliers, s_] })),
      updateSupplier: (id, data) => set((s) => ({ suppliers: s.suppliers.map((sup) => sup.id === id ? { ...sup, ...data } : sup) })),
      deleteSupplier: (id) => set((s) => ({ suppliers: s.suppliers.filter((sup) => sup.id !== id) })),

      addCashRegister: (cr) => set((s) => ({ cashRegisters: [...s.cashRegisters, cr] })),
      updateCashRegister: (id, data) => set((s) => ({ cashRegisters: s.cashRegisters.map((c) => c.id === id ? { ...c, ...data } : c) })),
      deleteCashRegister: (id) => set((s) => ({ cashRegisters: s.cashRegisters.filter((c) => c.id !== id) })),

      addCashPayment: (payment) => set((s) => ({ cashPayments: [...s.cashPayments, payment] })),

      addExpenseCategory: (cat) => set((s) => ({ expenseCategories: [...s.expenseCategories, cat] })),
      updateExpenseCategory: (id, data) => set((s) => ({ expenseCategories: s.expenseCategories.map((c) => c.id === id ? { ...c, ...data } : c) })),
      deleteExpenseCategory: (id) => set((s) => ({ expenseCategories: s.expenseCategories.filter((c) => c.id !== id) })),

      addSale: (sale) => set((s) => ({ sales: [...s.sales, sale] })),
      updateSale: (id, data) => set((s) => ({ sales: s.sales.map((sale) => sale.id === id ? { ...sale, ...data } : sale) })),

      addWorkAct: (act) => set((s) => ({ workActs: [...s.workActs, act] })),
      updateWorkAct: (id, data) => set((s) => ({ workActs: s.workActs.map((a) => a.id === id ? { ...a, ...data } : a) })),
      deleteWorkAct: (id) => set((s) => ({ workActs: s.workActs.filter((a) => a.id !== id) })),

      addSubscriber: (sub) => set((s) => ({ subscribers: [...s.subscribers, sub] })),
      updateSubscriber: (id, data) => set((s) => ({ subscribers: s.subscribers.map((su) => su.id === id ? { ...su, ...data } : su) })),

      addEvent: (event) => set((s) => ({ events: [...s.events, event] })),
      updateEvent: (id, data) => set((s) => ({ events: s.events.map((e) => e.id === id ? { ...e, ...data } : e) })),
      deleteEvent: (id) => set((s) => ({ events: s.events.filter((e) => e.id !== id) })),

      addSalarySheet: (sheet) => set((s) => ({ salarySheets: [...s.salarySheets, sheet] })),
      updateSalarySheet: (id, data) => set((s) => ({ salarySheets: s.salarySheets.map((sh) => sh.id === id ? { ...sh, ...data } : sh) })),
      deleteSalarySheet: (id) => set((s) => ({ salarySheets: s.salarySheets.filter((sh) => sh.id !== id) })),

      updateAppSettings: (data) => set((s) => ({ appSettings: { ...s.appSettings, ...data } })),
    }),
    { name: 'crm-storage' }
  )
);