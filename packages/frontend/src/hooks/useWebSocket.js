// WebSocket Hook 用于处理实时通信和 Plan & Solve 执行状态管理
import { useState, useEffect, useRef, useCallback } from 'react';

export const useWebSocket = (url) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [planSolveStatus, setPlanSolveStatus] = useState(null);
  const [planSolveProgress, setPlanSolveProgress] = useState(null);
  const [streamingMessage, setStreamingMessage] = useState(null); // 流式消息状态
  const [multiAgentProgress, setMultiAgentProgress] = useState(null); // MultiAgent进度状态
  const [agentExecutionDetails, setAgentExecutionDetails] = useState([]); // 智能体执行详情
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
        
        // 处理流式消息
        if (data.type === 'stream_start') {
          setStreamingMessage({ 
            id: data.messageId || Date.now(), 
            content: '', 
            isStreaming: true 
          });
          return; // 不设置 lastMessage，避免触发重复处理
        } else if (data.type === 'stream_chunk') {
          setStreamingMessage(prev => prev ? {
            ...prev,
            content: data.fullContent || (prev.content + data.content)
          } : null);
          return; // 不设置 lastMessage
        } else if (data.type === 'stream_end') {
          // 先获取当前streamingMessage的id
          const currentStreamingMessage = streamingMessage;
          // 清除streamingMessage状态
          setStreamingMessage(null);
          // 流式结束后，设置 lastMessage 触发最终处理
          setLastMessage(JSON.stringify({
            type: 'stream_complete',
            content: data.content,
            messageId: currentStreamingMessage?.id
          }));
          return;
        }
        
        setLastMessage(event.data);
        
        // 更新处理状态
        if (data.type === 'agent_start') {
          setIsProcessing(true);
          setPlanSolveStatus(null); // 重置plan_solve状态
          setPlanSolveProgress(null); // 新对话开始时重置进度状态
          setMultiAgentProgress(null); // 重置MultiAgent状态
          setAgentExecutionDetails([]); // 重置智能体执行详情
        } else if (data.type === 'multi_agent_start') {
          // MultiAgent模式启动，初始化进度状态
          setMultiAgentProgress({
            workflowId: data.workflowId,
            query: data.query,
            currentStage: 'task_breakdown',
            completedStages: [],
            totalStages: 5, // task_breakdown, search, retrieval, analysis, report
            startTime: data.timestamp,
            status: 'running'
          });
        } else if (data.type === 'multi_agent_progress') {
          // 更新MultiAgent进度
          setMultiAgentProgress(prev => {
            // 直接使用数据更新进度，不需要复杂的状态管理
            return {
              ...prev,
              currentProgress: data,
              lastUpdate: new Date()
            };
          });
        } else if (data.type === 'agent_progress') {
          // 处理智能体执行进度消息
          setAgentExecutionDetails(prev => {
            const newDetail = {
              id: Date.now() + Math.random(),
              stage: data.data.stage,
              status: data.data.status,
              agentName: data.data.agentName,
              task: data.data.task,
              details: data.data.details,
              results: data.data.results,
              summary: data.data.summary,
              error: data.data.error,
              timestamp: data.data.timestamp
            };
            
            // 如果是同一阶段的更新，替换最新的记录
            const existingIndex = prev.findIndex(item => 
              item.stage === data.data.stage && 
              item.agentName === data.data.agentName
            );
            
            if (existingIndex >= 0) {
              const updated = [...prev];
              updated[existingIndex] = newDetail;
              return updated;
            } else {
              return [...prev, newDetail];
            }
          });
        } else if (data.type === 'multi_agent_stage_complete') {
          // 阶段完成，更新相应状态
          setMultiAgentProgress(prev => {
            if (!prev) return null;
            
            const stageName = data.stageName;
            if (!prev.completedStages.includes(stageName)) {
              return {
                ...prev,
                completedStages: [...prev.completedStages, stageName]
              };
            }
            return prev;
          });
        } else if (data.type === 'agent_response' || data.type === 'error' || data.type === 'aborted') {
          setIsProcessing(false);
          setPlanSolveStatus(null); // 重置plan_solve状态
          // 任务完成后保持进度状态显示，不重置MultiAgent状态
        } else if (data.type === 'plan_solve_update') {
          // 处理plan_solve状态更新
          setPlanSolveStatus(data);
          
          // 更新进度状态（保留之前的进度信息）
          if (data.data && data.phase === 'plan_execution') {
            setPlanSolveProgress(prev => ({
              ...prev,
              ...data.data,
              phase: data.phase,
              message: data.message,
              timestamp: data.timestamp
            }));
          } else if (data.phase) {
            // 对于其他阶段，保留之前的执行步骤数据
            setPlanSolveProgress(prev => {
              const newState = {
                ...prev,
                phase: data.phase,
                message: data.message,
                timestamp: data.timestamp,
                data: data.data
              };
              
              // 如果新数据中没有步骤信息，但之前状态中有，则保留之前的步骤信息
              if (prev && prev.data && prev.data.steps && (!data.data || !data.data.steps)) {
                newState.data = {
                  ...newState.data,
                  steps: prev.data.steps,
                  totalSteps: prev.totalSteps,
                  completedSteps: prev.completedSteps,
                  currentStep: prev.currentStep,
                  stepName: prev.stepName,
                  stepType: prev.stepType
                };
                // 保留进度相关字段到顶层
                newState.totalSteps = prev.totalSteps;
                newState.completedSteps = prev.completedSteps;
                newState.currentStep = prev.currentStep;
                newState.stepName = prev.stepName;
                newState.stepType = prev.stepType;
              }
              
              // 更新顶层字段
              if (data.data) {
                if (data.data.totalSteps !== undefined) newState.totalSteps = data.data.totalSteps;
                if (data.data.completedSteps !== undefined) newState.completedSteps = data.data.completedSteps;
                if (data.data.currentStep !== undefined) newState.currentStep = data.data.currentStep;
                if (data.data.stepName !== undefined) newState.stepName = data.data.stepName;
                if (data.data.stepType !== undefined) newState.stepType = data.data.stepType;
              }
              
              return newState;
            });
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

  const resetPlanSolveProgress = useCallback(() => {
    setPlanSolveProgress(null);
  }, []);

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
    streamingMessage,
    multiAgentProgress,
    agentExecutionDetails,
    sendMessage,
    sendAbort,
    connect,
    disconnect,
    resetPlanSolveProgress
  };
}; 