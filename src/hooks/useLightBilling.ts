import { useState, useCallback } from 'react';

const LB_URL = 'https://functions.poehali.dev/4e05c064-e352-437c-b112-35fb77291a1a';

export interface LBSubscriber {
  id: string;
  lb_id: string;
  fullName: string;
  contractNumber: string;
  address: string;
  tariff: string;
  balance: number;
  status: 'active' | 'suspended' | 'terminated';
  phone: string;
  connectDate: string;
  ipAddress: string;
}

export interface LBDetail {
  id: string;
  fields: Record<string, string>;
  balance: string;
  title: string;
}

export interface LBTariff {
  id: string;
  name: string;
}

export interface LBCreateResult {
  success: boolean;
  lb_id: string;
  message: string;
}

export interface LBPaymentResult {
  success: boolean;
  lb_id: string;
  amount: number;
  message?: string;
}

export interface LBSubscriberTariff {
  id: string;
  name: string;
  price: string;
  date: string;
}

export interface LBPaymentHistory {
  date: string;
  amount: string;
  source: string;
  comment: string;
  raw: string[];
}

export interface LBPromisedInfo {
  sub_id: string;
  options: { value: string; label: string }[];
  current_promised: string;
}

interface UseLBReturn {
  loading: boolean;
  error: string | null;
  subscribers: LBSubscriber[];
  total: number;
  tariffs: LBTariff[];
  searchSubscribers: (query: string, limit?: number) => Promise<void>;
  loadSubscribers: (limit?: number) => Promise<void>;
  getDetail: (id: string) => Promise<LBDetail | null>;
  loadTariffs: () => Promise<LBTariff[]>;
  createSubscriber: (data: {
    fullName: string;
    address: string;
    phone: string;
    tariffId: string;
    contractNumber?: string;
  }) => Promise<LBCreateResult>;
  addPayment: (lbId: string, amount: number, comment?: string, contract?: string) => Promise<LBPaymentResult>;
  getSubscriberTariffs: (lbId: string) => Promise<LBSubscriberTariff[]>;
  addTariff: (lbId: string, tariffId: string) => Promise<{ success: boolean }>;
  getPromisedInfo: (lbId: string) => Promise<LBPromisedInfo | null>;
  makePromisedPayment: (lbId: string, days: string) => Promise<{ success: boolean }>;
  getLBPayments: (contract: string, lbId?: string) => Promise<LBPaymentHistory[]>;
}

export function useLightBilling(): UseLBReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscribers, setSubscribers] = useState<LBSubscriber[]>([]);
  const [total, setTotal] = useState(0);
  const [tariffs, setTariffs] = useState<LBTariff[]>([]);

  const fetchSubscribers = useCallback(async (search: string, limit = 100) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ action: 'subscribers', search, limit: String(limit) });
      const res = await fetch(`${LB_URL}?${params}`);
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setSubscribers([]);
      } else {
        setSubscribers(data.subscribers || []);
        setTotal(data.total || 0);
      }
    } catch {
      setError('Ошибка соединения с LightBilling');
    } finally {
      setLoading(false);
    }
  }, []);

  const searchSubscribers = useCallback(
    (query: string, limit = 100) => fetchSubscribers(query, limit),
    [fetchSubscribers]
  );

  const loadSubscribers = useCallback(
    (limit = 200) => fetchSubscribers('', limit),
    [fetchSubscribers]
  );

  const getDetail = useCallback(async (id: string): Promise<LBDetail | null> => {
    try {
      const res = await fetch(`${LB_URL}?action=subscriber_detail&id=${encodeURIComponent(id)}`);
      const data = await res.json();
      if (data.error) return null;
      return data as LBDetail;
    } catch {
      return null;
    }
  }, []);

  const loadTariffs = useCallback(async (): Promise<LBTariff[]> => {
    try {
      const res = await fetch(`${LB_URL}?action=tariffs`);
      const data = await res.json();
      const list: LBTariff[] = data.tariffs || [];
      setTariffs(list);
      return list;
    } catch {
      return [];
    }
  }, []);

  const createSubscriber = useCallback(async (payload: {
    fullName: string;
    address: string;
    phone: string;
    tariffId: string;
    contractNumber?: string;
    login?: string;
    password?: string;
    group?: string;
  }): Promise<LBCreateResult> => {
    try {
      const res = await fetch(`${LB_URL}?action=create_subscriber`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      return data as LBCreateResult;
    } catch {
      return { success: false, lb_id: '', message: 'Ошибка соединения' };
    }
  }, []);

  const addPayment = useCallback(async (lbId: string, amount: number, comment = 'Пополнение через CRM', contract?: string): Promise<LBPaymentResult> => {
    try {
      const res = await fetch(`${LB_URL}?action=add_payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lb_id: lbId, contract, amount, comment }),
      });
      const data = await res.json();
      return data as LBPaymentResult;
    } catch {
      return { success: false, lb_id: lbId, amount, message: 'Ошибка соединения с LightBilling' };
    }
  }, []);

  const getSubscriberTariffs = useCallback(async (lbId: string): Promise<LBSubscriberTariff[]> => {
    try {
      const res = await fetch(`${LB_URL}?action=subscriber_tariffs&id=${encodeURIComponent(lbId)}`);
      const data = await res.json();
      return data.tariffs || [];
    } catch { return []; }
  }, []);

  const addTariff = useCallback(async (lbId: string, tariffId: string): Promise<{ success: boolean }> => {
    try {
      const res = await fetch(`${LB_URL}?action=add_tariff&id=${encodeURIComponent(lbId)}&tariff_id=${encodeURIComponent(tariffId)}`);
      const data = await res.json();
      return { success: data.success ?? true };
    } catch { return { success: false }; }
  }, []);

  const getPromisedInfo = useCallback(async (lbId: string): Promise<LBPromisedInfo | null> => {
    try {
      const res = await fetch(`${LB_URL}?action=promised_payment&id=${encodeURIComponent(lbId)}`);
      const data = await res.json();
      return data as LBPromisedInfo;
    } catch { return null; }
  }, []);

  const makePromisedPayment = useCallback(async (lbId: string, days: string): Promise<{ success: boolean }> => {
    try {
      const res = await fetch(`${LB_URL}?action=promised_payment&id=${encodeURIComponent(lbId)}&days=${encodeURIComponent(days)}`);
      const data = await res.json();
      return { success: data.success ?? false };
    } catch { return { success: false }; }
  }, []);

  const getLBPayments = useCallback(async (contract: string, lbId?: string): Promise<LBPaymentHistory[]> => {
    try {
      const params = new URLSearchParams({ action: 'lb_payments', contract });
      if (lbId) params.set('id', lbId);
      const res = await fetch(`${LB_URL}?${params}`);
      const data = await res.json();
      return data.payments || [];
    } catch { return []; }
  }, []);

  return {
    loading, error, subscribers, total, tariffs,
    searchSubscribers, loadSubscribers, getDetail, loadTariffs, createSubscriber, addPayment,
    getSubscriberTariffs, addTariff, getPromisedInfo, makePromisedPayment, getLBPayments,
  };
}