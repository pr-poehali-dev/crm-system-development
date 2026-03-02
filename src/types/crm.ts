export interface Office {
  id: string;
  name: string;
  address: string;
  phone: string;
}

export interface Department {
  id: string;
  name: string;
  description: string;
}

export interface Position {
  id: string;
  name: string;
  departmentId: string;
  salaryType: 'fixed' | 'piece' | 'kpi' | 'mixed';
  baseSalary: number;
  kpiBonus?: number;
  description: string;
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  middleName: string;
  positionId: string;
  departmentId: string;
  phone: string;
  email: string;
  hireDate: string;
  status: 'active' | 'fired' | 'vacation';
  avatar?: string;
  userId?: string;
}

export interface User {
  id: string;
  employeeId: string;
  login: string;
  role: 'admin' | 'manager' | 'technician' | 'cashier' | 'warehouse';
  isActive: boolean;
  createdAt: string;
}

export type ConnectionStatus = 'scheduled' | 'in_progress' | 'done' | 'cancelled';
export type TicketStatus = 'new' | 'in_progress' | 'done' | 'cancelled';
export type CallStatus = 'new' | 'in_progress' | 'done' | 'cancelled';

export interface CalendarSlotSettings {
  officeId: string;
  slotsPerDay: number;
  workDays: number[];
  startTime: string;
  endTime: string;
}

export interface Connection {
  id: string;
  officeId: string;
  subscriberId?: string;
  subscriberName: string;
  subscriberAddress: string;
  subscriberPhone: string;
  date: string;
  timeSlot: string;
  technicianId: string;
  status: ConnectionStatus;
  notes: string;
  createdAt: string;
}

export interface ServiceTicket {
  id: string;
  officeId: string;
  subscriberId?: string;
  subscriberName: string;
  subscriberAddress: string;
  subscriberPhone: string;
  technicianId: string;
  problem: string;
  status: TicketStatus;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  resolvedAt?: string;
  notes: string;
}

export interface PaidCall {
  id: string;
  officeId: string;
  subscriberId?: string;
  subscriberName: string;
  subscriberAddress: string;
  subscriberPhone: string;
  technicianId: string;
  description: string;
  amount: number;
  status: CallStatus;
  date: string;
  createdAt: string;
}

export interface Warehouse {
  id: string;
  officeId: string;
  name: string;
  address: string;
  description: string;
}

export interface Category {
  id: string;
  name: string;
  parentId?: string;
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  sku: string;
  unit: string;
  description: string;
  price: number;
}

export type StockOperationType = 'receipt' | 'writeoff' | 'transfer' | 'sale' | 'return';

export interface StockOperation {
  id: string;
  officeId: string;
  warehouseId: string;
  toWarehouseId?: string;
  type: StockOperationType;
  productId: string;
  quantity: number;
  price: number;
  amount: number;
  employeeId: string;
  date: string;
  notes: string;
  createdAt: string;
}

export interface WarehouseStock {
  warehouseId: string;
  productId: string;
  quantity: number;
}

export interface CashRegister {
  id: string;
  officeId: string;
  name: string;
  isActive: boolean;
}

export type SaleStatus = 'completed' | 'refunded' | 'cancelled';

export interface Sale {
  id: string;
  officeId: string;
  cashRegisterId: string;
  items: SaleItem[];
  totalAmount: number;
  paymentMethod: 'cash' | 'card' | 'transfer';
  employeeId: string;
  subscriberId?: string;
  customerName: string;
  status: SaleStatus;
  date: string;
  createdAt: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  amount: number;
}

export interface WorkAct {
  id: string;
  officeId: string;
  number: string;
  employeeId: string;
  date: string;
  items: WorkActItem[];
  totalAmount: number;
  status: 'draft' | 'approved' | 'paid';
  notes: string;
  createdAt: string;
}

export interface WorkActItem {
  description: string;
  quantity: number;
  price: number;
  amount: number;
  connectionId?: string;
}

export interface Subscriber {
  id: string;
  fullName: string;
  address: string;
  phone: string;
  email?: string;
  contractNumber: string;
  tariff: string;
  balance: number;
  status: 'active' | 'suspended' | 'terminated';
  connectDate: string;
  ipAddress?: string;
}

export interface SalaryRecord {
  id: string;
  officeId: string;
  month: string;
  year: number;
  employeeId: string;
  baseSalary: number;
  actAmount: number;
  salesBonus: number;
  kpiBonus: number;
  deductions: number;
  totalAmount: number;
  status: 'draft' | 'approved' | 'paid';
  createdAt: string;
}

export interface SalarySheet {
  id: string;
  officeId: string;
  name: string;
  month: string;
  year: number;
  records: SalaryRecord[];
  totalAmount: number;
  status: 'draft' | 'approved' | 'paid';
  createdAt: string;
}
