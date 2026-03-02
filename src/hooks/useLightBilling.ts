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

interface UseLBReturn {
  loading: boolean;
  error: string | null;
  subscribers: LBSubscriber[];
  total: number;
  searchSubscribers: (query: string, limit?: number) => Promise<void>;
  loadSubscribers: (limit?: number) => Promise<void>;
  getDetail: (id: string) => Promise<LBDetail | null>;
}

export function useLightBilling(): UseLBReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscribers, setSubscribers] = useState<LBSubscriber[]>([]);
  const [total, setTotal] = useState(0);

  const fetchSubscribers = useCallback(async (search: string, limit = 100) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        action: 'subscribers',
        search,
        limit: String(limit),
      });
      const res = await fetch(`${LB_URL}?${params}`);
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setSubscribers([]);
      } else {
        setSubscribers(data.subscribers || []);
        setTotal(data.total || 0);
      }
    } catch (e) {
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

  return { loading, error, subscribers, total, searchSubscribers, loadSubscribers, getDetail };
}
