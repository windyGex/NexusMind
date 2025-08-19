import React, { useState, useEffect, useRef } from 'react';
import { Layout, theme, ConfigProvider, App as AntApp } from 'antd';
import ChatInterface from './components/ChatInterface';
import Sidebar from './components/Sidebar';
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
  // 移除了视图切换功能，只保留智能对话
  
  const { token } = theme.useToken();
  
  // WebSocket连接
  const { 
    isConnected, 
    sendMessage, 
    sendAbort,
    lastMessage, 
    isProcessing: wsIsProcessing,
    connect, 
    disconnect 
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
          setCurrentTool(prev => prev ? { ...prev, status: 'completed' } : null);
          setMessages(prev => prev.map(msg => {
            // 找到对应的工具执行消息并更新
            if (msg.type === 'tool_execution' && msg.tool === data.tool && msg.status === 'running') {
              return {
                ...msg,
                status: 'completed',
                result: data.result,
                completedAt: new Date()
              };
            }
            return msg;
          }));
          break;
          
        case 'tool_error':
          setCurrentTool(prev => prev ? { ...prev, status: 'error' } : null);
          setMessages(prev => prev.map(msg => {
            // 找到对应的工具执行消息并更新
            if (msg.type === 'tool_execution' && msg.tool === data.tool && msg.status === 'running') {
              return {
                ...msg,
                status: 'error',
                error: data.error,
                completedAt: new Date()
              };
            }
            return msg;
          }));
          break;
          
        case 'agent_response':
          setIsProcessing(false);
          setCurrentTool(null);
          setMessages(prev => [...prev, {
            id: Date.now(),
            type: 'assistant',
            content: data.content,
            metadata: data.metadata,
            timestamp: new Date(data.timestamp)
          }]);
          break;
          
        case 'workflow_update':
          // 工作流更新消息已移除（通用智能体功能已删除）
          console.log('忽略工作流更新消息（已移除功能）:', data);
          break;
          
        case 'error':
          setIsProcessing(false);
          setCurrentTool(null);
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

  // 管理currentTool的自动清理
  useEffect(() => {
    if (currentTool && (currentTool.status === 'completed' || currentTool.status === 'error')) {
      const delay = currentTool.status === 'error' ? 3000 : 2000; // 错误状态显示更久
      const timer = setTimeout(() => {
        setCurrentTool(null);
      }, delay);
      
      return () => clearTimeout(timer); // 清理定时器
    }
  }, [currentTool]);

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
              <ChatInterface
                messages={messages}
                isProcessing={isProcessing}
                thinking={thinking}
                currentTool={currentTool}
                onSendMessage={handleSendMessage}
                onAbort={handleAbort}
                isConnected={isConnected}
              />
            </Content>
          </Layout>
        </Layout>
      </AntApp>
    </ConfigProvider>
  );
}

export default App; 