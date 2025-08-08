import { useState, useEffect, useCallback } from 'react';

export const useTools = () => {
  const [mcpTools, setMcpTools] = useState(null);
  const [localTools, setLocalTools] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchMcpTools = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/agent/mcp-tools');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setMcpTools(data);
    } catch (err) {
      console.error('获取MCP工具失败:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLocalTools = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/agent/local-tools');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setLocalTools(data);
    } catch (err) {
      console.error('获取本地工具失败:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshTools = useCallback(() => {
    fetchMcpTools();
    fetchLocalTools();
  }, [fetchMcpTools, fetchLocalTools]);

  // 初始加载
  useEffect(() => {
    refreshTools();
  }, [refreshTools]);

  // 定期刷新工具列表
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading) {
        refreshTools();
      }
    }, 30000); // 每30秒刷新一次

    return () => clearInterval(interval);
  }, [refreshTools, loading]);

  return {
    mcpTools,
    localTools,
    loading,
    error,
    refreshTools
  };
}; 