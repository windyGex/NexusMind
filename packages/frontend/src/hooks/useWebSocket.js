import { useState, useEffect, useRef, useCallback } from 'react';

export const useWebSocket = (url) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [planSolveStatus, setPlanSolveStatus] = useState(null);
  const [planSolveProgress, setPlanSolveProgress] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      wsRef.current = new WebSocket(url);
      
      wsRef.current.onopen = () => {
        console.log('WebSocket连接已建立');
        setIsConnected(true);
        reconnectAttempts.current = 0;
      };

      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        setLastMessage(event.data);
        
        // 更新处理状态
        if (data.type === 'agent_start') {
          setIsProcessing(true);
          setPlanSolveStatus(null); // 重置plan_solve状态
          // 不重置进度状态，保持显示
        } else if (data.type === 'agent_response' || data.type === 'error' || data.type === 'aborted') {
          setIsProcessing(false);
          setPlanSolveStatus(null); // 重置plan_solve状态
          // 不重置进度状态，保持显示
        } else if (data.type === 'plan_solve_update') {
          // 处理plan_solve状态更新
          setPlanSolveStatus(data);
          
          // 更新进度状态（保留之前的进度信息）
          if (data.data && (data.phase === 'plan_execution' || data.phase === 'step_start' || data.phase === 'step_complete' || data.phase === 'step_error')) {
            setPlanSolveProgress(prev => ({
              ...prev,
              ...data.data,
              phase: data.phase,
              message: data.message,
              timestamp: data.timestamp
            }));
          } else if (data.phase) {
            // 对于其他阶段，也更新进度状态以显示思考过程
            setPlanSolveProgress(prev => ({
              ...prev,
              phase: data.phase,
              message: data.message,
              timestamp: data.timestamp,
              data: data.data
            }));
          }
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('WebSocket连接已关闭:', event.code, event.reason);
        setIsConnected(false);
        
        // 自动重连
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            console.log(`尝试重连 (${reconnectAttempts.current}/${maxReconnectAttempts})`);
            connect();
          }, delay);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket错误:', error);
        setIsConnected(false);
      };

    } catch (error) {
      console.error('WebSocket连接失败:', error);
      setIsConnected(false);
    }
  }, [url]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
    reconnectAttempts.current = 0;
  }, []);

  const sendMessage = useCallback((message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(message);
    } else {
      console.error('WebSocket未连接，无法发送消息');
    }
  }, []);

  const sendAbort = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'abort' }));
    } else {
      console.error('WebSocket未连接，无法发送中止消息');
    }
  }, []);

  // 心跳检测
  useEffect(() => {
    if (!isConnected) return;

    const heartbeat = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        sendMessage(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // 30秒发送一次心跳

    return () => clearInterval(heartbeat);
  }, [isConnected, sendMessage]);

  // 组件挂载时连接
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    lastMessage,
    isProcessing,
    planSolveStatus,
    planSolveProgress,
    sendMessage,
    sendAbort,
    connect,
    disconnect
  };
}; 