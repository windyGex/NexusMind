import React, { useState, useEffect, useRef } from 'react';
import { Layout, theme, ConfigProvider, App as AntApp } from 'antd';
import ChatInterface from './components/ChatInterface';
import Sidebar from './components/Sidebar';
import MCPConfig from './components/MCPConfig';
import { useWebSocket } from './hooks/useWebSocket';
import { useAgentStatus } from './hooks/useAgentStatus';
import { useTools } from './hooks/useTools';
import './App.css';

const { Content, Sider } = Layout;

function App() {
  const [collapsed, setCollapsed] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTool, setCurrentTool] = useState(null);
  const [thinking, setThinking] = useState('');
  const [currentView, setCurrentView] = useState('chat'); // 'chat' 或 'mcp-config'
  
  const { token } = theme.useToken();
  
  // WebSocket连接
  const { 
    isConnected, 
    sendMessage, 
    sendAbort,
    lastMessage, 
    isProcessing: wsIsProcessing,
    planSolveStatus,
    planSolveProgress,
    streamingMessage,
    multiAgentProgress,
    agentExecutionDetails,
    connect, 
    disconnect,
    resetPlanSolveProgress // 用于重置 Plan & Solve 执行进度状态
  } = useWebSocket('ws://localhost:3002');
  
  // Agent状态
  const { agentStatus, refreshStatus } = useAgentStatus();

  // 工具管理
  const { mcpTools, localTools, loading: toolsLoading, refreshTools } = useTools();

  // 处理WebSocket消息
  useEffect(() => {
    if (lastMessage) {
      const data = JSON.parse(lastMessage);
      
      // 移除了视图切换功能，所有消息都处理
      const shouldProcessMessage = (data) => {
        // 只处理非通用智能体的消息（因为已移除通用智能体功能）
        return data.agentType !== 'universal' && data.type !== 'workflow_update';
      };
      
      if (!shouldProcessMessage(data)) {
        return;
      }
      
      switch (data.type) {
        case 'connection':
          console.log('WebSocket连接成功:', data.message);
          break;
          
        case 'agent_start':
          setIsProcessing(true);
          setMessages(prev => [...prev, {
            id: Date.now(),
            type: 'system',
            content: data.message,
            timestamp: new Date()
          }]);
          break;
          
        case 'aborted':
          setIsProcessing(false);
          setCurrentTool(null);
          setThinking(''); // 清空思考状态
          setMessages(prev => [...prev, {
            id: Date.now(),
            type: 'system',
            content: '任务已被中止',
            timestamp: new Date()
          }]);
          break;
          
        case 'thinking':
          setThinking(data.content);
          break;
          
        case 'thinking_complete':
          setThinking('');
          setMessages(prev => [...prev, {
            id: Date.now(),
            type: 'thinking',
            content: data.content,
            timestamp: new Date()
          }]);
          break;
          
        case 'tool_start':
          console.log('🔧 收到 tool_start 消息:', data);
          setCurrentTool({
            name: data.tool,
            args: data.args,
            status: 'running'
          });
          setMessages(prev => [...prev, {
            id: `tool-${data.tool}-${Date.now()}`,
            type: 'tool_execution',
            tool: data.tool,
            args: data.args,
            status: 'running',
            timestamp: new Date()
          }]);
          break;
          
        case 'tool_result':
          console.log('✅ 收到 tool_result 消息:', data);
          setCurrentTool(prev => prev ? { ...prev, status: 'completed' } : null);
          setMessages(prev => {
            console.log('🔍 查找匹配的工具执行消息，当前消息列表:', prev.map(m => ({id: m.id, type: m.type, tool: m.tool, status: m.status})));
            
            // 找到最近的运行中的工具执行消息
            let foundIndex = -1;
            for (let i = prev.length - 1; i >= 0; i--) {
              const msg = prev[i];
              if (msg.type === 'tool_execution' && msg.status === 'running') {
                // 直接匹配或者柔性匹配（处理MCP工具名称映射问题）
                if (msg.tool === data.tool || 
                    (类型msg.tool === 'string' && msg.tool.includes(data.tool)) ||
                    (typeof data.tool === 'string' && data.tool.includes(msg.tool))) {
                  foundIndex = i;
                  break;
                }
              }
            }
            
            if (foundIndex >= 0) {
              console.log('🎯 找到匹配的工具执行消息，更新状态为completed');
              const updatedMessages = [...prev];
              updatedMessages[foundIndex] = {
                ...updatedMessages[foundIndex],
                status: 'completed',
                result: data.result,
                completedAt: new Date()
              };
              return updatedMessages;
            } else {
              console.log('⚠️ 未找到匹配的工具执行消息，可能存在名称映射问题');
              return prev;
            }
          });
          break;
          
        case 'tool_error':
          console.log('❌ 收到 tool_error 消息:', data);
          setCurrentTool(prev => prev ? { ...prev, status: 'error' } : null);
          setMessages(prev => {
            // 找到最近的运行中的工具执行消息
            let foundIndex = -1;
            for (let i = prev.length - 1; i >= 0; i--) {
              const msg = prev[i];
              if (msg.type === 'tool_execution' && msg.status === 'running') {
                // 直接匹配或者柔性匹配
                if (msg.tool === data.tool || 
                    (typeof msg.tool === 'string' && msg.tool.includes(data.tool)) ||
                    (typeof data.tool === 'string' && data.tool.includes(msg.tool))) {
                  foundIndex = i;
                  break;
                }
              }
            }
            
            if (foundIndex >= 0) {
              console.log('🎯 找到匹配的工具执行消息，更新状态为error');
              const updatedMessages = [...prev];
              updatedMessages[foundIndex] = {
                ...updatedMessages[foundIndex],
                status: 'error',
                error: data.error,
                completedAt: new Date()
              };
              return updatedMessages;
            } else {
              console.log('⚠️ 未找到匹配的工具执行消息，可能存在名称映射问题');
              return prev;
            }
          });
          break;
          
        case 'stream_complete':
          setIsProcessing(false);
          setCurrentTool(null);
          setThinking(''); // 清空思考状态
          setMessages(prev => [...prev, {
            id: data.messageId || Date.now(),
            type: 'assistant',
            content: data.content,
            timestamp: new Date(),
            isStreaming: false
          }]);
          break;
          
        case 'agent_response':
          setIsProcessing(false);
          setCurrentTool(null);
          setThinking(''); // 清空思考状态
          setMessages(prev => [...prev, {
            id: Date.now(),
            type: 'assistant',
            content: data.content,
            metadata: data.metadata,
            timestamp: new Date(data.timestamp)
          }]);
          break;
          
        case 'plan_solve_update':
          // 处理Plan & Solve状态更新消息
          console.log('📋 收到 plan_solve_update 消息:', data);
          
          if (data.phase === 'plan_execution' && data.data && data.data.steps) {
            // 对于plan_execution阶段，检查是否已经存在步骤清单消息
            setMessages(prev => {
              const existingPlanIndex = prev.findIndex(
                msg => msg.type === 'plan_solve_update' && msg.phase === 'plan_execution'
              );
              
              if (existingPlanIndex >= 0) {
                // 如果已存在，更新该消息的数据
                const updatedMessages = [...prev];
                updatedMessages[existingPlanIndex] = {
                  ...updatedMessages[existingPlanIndex],
                  data: data.data,
                  message: data.message,
                  timestamp: new Date(data.timestamp || new Date())
                };
                return updatedMessages;
              } else {
                // 如果不存在，创建新的消息
                return [...prev, {
                  id: `plan-solve-execution`,
                  type: 'plan_solve_update',
                  phase: data.phase,
                  message: data.message,
                  data: data.data,
                  timestamp: new Date(data.timestamp || new Date())
                }];
              }
            });
          } else {
            // 对于其他阶段（task_analysis、plan_creation、result_evaluation），不显示任何内容
            // 这些阶段的消息不会被添加到消息列表中
            console.log(`忽略 ${data.phase} 阶段的消息`);
          }
          break;
          
        case 'workflow_update':
          // 工作流更新消息已移除（通用智能体功能已删除）
          console.log('忽略工作流更新消息（已移除功能）:', data);
          break;
          
        case 'agent_progress':
          console.log('🤖 收到 agent_progress 消息:', data);
          // 创建或更新 agent_progress 消息条目
          setMessages(prev => {
            // 查找是否已存在 agent_progress 消息
            const existingIndex = prev.findIndex(msg => msg.id === 'agent-progress-details');
            
            if (existingIndex >= 0) {
              // 更新已存在的消息
              const updatedMessages = [...prev];
              updatedMessages[existingIndex] = {
                ...updatedMessages[existingIndex],
                data: data,
                timestamp: new Date()
              };
              return updatedMessages;
            } else {
              // 创建新的 agent_progress 消息
              return [...prev, {
                id: 'agent-progress-details',
                type: 'agent_progress',
                content: '智能体执行进度',
                data: data,
                timestamp: new Date()
              }];
            }
          });
          break;
          
        case 'multi_agent_start':
          console.log('🚀 收到 multi_agent_start 消息:', data);
          setMessages(prev => [...prev, {
            id: Date.now(),
            type: 'multi_agent_start',
            content: data.message,
            timestamp: new Date(data.timestamp)
          }]);
          break;
          
        case 'multi_agent_progress':
          console.log('📊 收到 multi_agent_progress 消息:', data);
          // 在消息列表中添加或更新MultiAgent进度卡片
          setMessages(prev => {
            // 查找是否已存在MultiAgent进度消息
            const existingIndex = prev.findIndex(msg => msg.id === 'multi-agent-progress');
            
            if (existingIndex >= 0) {
              // 更新已存在的进度消息
              const updatedMessages = [...prev];
              updatedMessages[existingIndex] = {
                ...updatedMessages[existingIndex],
                data: data,
                timestamp: new Date()
              };
              return updatedMessages;
            } else {
              // 创建新的进度消息
              return [...prev, {
                id: 'multi-agent-progress',
                type: 'multi_agent_progress',
                content: '多智能体协作进度',
                data: data,
                timestamp: new Date()
              }];
            }
          });
          break;
          
        case 'multi_agent_stage_complete':
          console.log('✅ 收到 multi_agent_stage_complete 消息:', data);
          setMessages(prev => [...prev, {
            id: Date.now(),
            type: 'multi_agent_stage',
            content: `阶段完成: ${data.stage || '未知阶段'}`,
            timestamp: new Date(),
            data: data
          }]);
          break;
          
        case 'multi_agent_error':
          console.log('❌ 收到 multi_agent_error 消息:', data);
          setMessages(prev => [...prev, {
            id: Date.now(),
            type: 'error',
            content: `多智能体协作出错: ${data.error || data.message}`,
            timestamp: new Date()
          }]);
          break;
          
        case 'error':
          setIsProcessing(false);
          setCurrentTool(null);
          setThinking(''); // 清空思考状态
          setMessages(prev => [...prev, {
            id: Date.now(),
            type: 'error',
            content: data.message,
            timestamp: new Date()
          }]);
          break;
      }
    }
  }, [lastMessage]);



  // 发送消息
  const handleSendMessage = (message) => {
    if (!isConnected) {
      console.error('WebSocket未连接');
      return;
    }
    
    // 添加用户消息到列表
    setMessages(prev => [...prev, {
      id: Date.now(),
      type: 'user',
      content: message,
      timestamp: new Date()
    }]);
    
    // 发送到WebSocket
    sendMessage(JSON.stringify({
      type: 'chat',
      message: message,
      context: {}
    }));
  };

  // 中止任务
  const handleAbort = () => {
    if (isProcessing) {
      sendAbort();
      setIsProcessing(false);
      setCurrentTool(null);
      setThinking('');
    }
  };

  // 重置对话
  const handleReset = async () => {
    try {
      const response = await fetch('/api/agent/reset', {
        method: 'POST'
      });
      
      if (response.ok) {
        setMessages([]);
        setThinking('');
        setCurrentTool(null);
        setIsProcessing(false);
        refreshStatus();
        refreshTools(); // 刷新工具列表
      }
    } catch (error) {
      console.error('重置失败:', error);
    }
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 6,
        },
      }}
    >
      <AntApp>
        <Layout style={{ height: '100vh', background: '#f5f5f5' }}>
          <Sider 
            trigger={null} 
            collapsible 
            collapsed={collapsed}
            width={320}
            style={{
              background: '#ffffff',
              borderRight: '1px solid #e5e7eb',
              boxShadow: '2px 0 8px rgba(0, 0, 0, 0.1)',
            }}
          >
                        <Sidebar
              collapsed={collapsed}
              agentStatus={agentStatus}
              isConnected={isConnected}
              onReset={handleReset}
              mcpTools={mcpTools}
              localTools={localTools}
              toolsLoading={toolsLoading}
              currentView={currentView}
              onViewChange={setCurrentView}
            />
          </Sider>
          
          <Layout>
            <Content style={{ 
              margin: 0, 
              padding: 0, 
              background: '#f5f5f5',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}>
              {currentView === 'chat' ? (
                <ChatInterface
                  messages={messages}
                  isProcessing={isProcessing}
                  thinking={thinking}
                  currentTool={currentTool}
                  planSolveStatus={planSolveStatus}
                  planSolveProgress={planSolveProgress}
                  streamingMessage={streamingMessage}
                  multiAgentProgress={multiAgentProgress}
                  agentExecutionDetails={agentExecutionDetails}
                  agentStatus={agentStatus}
                  onSendMessage={handleSendMessage}
                  onAbort={handleAbort}
                  onResetProgress={resetPlanSolveProgress}
                  isConnected={isConnected}
                  sidebarCollapsed={collapsed}
                />
              ) : currentView === 'mcp-config' ? (
                <MCPConfig />
              ) : null}
            </Content>
          </Layout>
        </Layout>
      </AntApp>
    </ConfigProvider>
  );
}

export default App; 