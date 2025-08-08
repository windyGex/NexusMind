import { useState, useEffect, useCallback } from 'react';

export const useAgentStatus = () => {
  const [agentStatus, setAgentStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/agent/status');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setAgentStatus(data);
    } catch (err) {
      console.error('获取Agent状态失败:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshStatus = useCallback(() => {
    fetchStatus();
  }, [fetchStatus]);

  // 初始加载
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // 定期刷新状态
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading) {
        fetchStatus();
      }
    }, 10000); // 每10秒刷新一次

    return () => clearInterval(interval);
  }, [fetchStatus, loading]);

  return {
    agentStatus,
    loading,
    error,
    refreshStatus
  };
}; 