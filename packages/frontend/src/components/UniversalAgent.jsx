import React, { useState, useEffect, useRef } from 'react';
import { Button, Input, Card, Progress, Steps, message, Spin, Tag, Space, Typography, Divider } from 'antd';
import { SendOutlined, ReloadOutlined, SettingOutlined, FileTextOutlined, SearchOutlined, BarChartOutlined, CheckCircleOutlined } from '@ant-design/icons';
import './UniversalAgent.css';

const { TextArea } = Input;
const { Title, Paragraph, Text } = Typography;
const { Step } = Steps;

/**
 * 通用智能体组件
 * 支持多Agent协作的研究和分析任务
 */
const UniversalAgent = ({ 
  isConnected, 
  sendMessage, 
  sendAbort, 
  messages = [], 
  isProcessing = false,
  thinking = '',
  currentTool = null
}) => {
  const [input, setInput] = useState('');
  const [workflowStatus, setWorkflowStatus] = useState({
    currentPhase: 'idle',
    progress: 0,
    agents: {},
    stats: {}
  });
  const [agentStatus, setAgentStatus] = useState({});
  const [currentReport, setCurrentReport] = useState(null);
  const messagesEndRef = useRef(null);

  // 工作流阶段配置
  const workflowSteps = [
    { key: 'planning', title: '任务规划', icon: <SettingOutlined /> },
    { key: 'searching', title: '信息搜索', icon: <SearchOutlined /> },
    { key: 'analyzing', title: '数据分析', icon: <BarChartOutlined /> },
    { key: 'reporting', title: '报告生成', icon: <FileTextOutlined /> },
    { key: 'completed', title: '任务完成', icon: <CheckCircleOutlined /> }
  ];

  // 监听WebSocket连接状态
  useEffect(() => {
    if (isConnected) {
      message.success('已连接到服务器');
    } else {
      message.warning('与服务器的连接已断开');
    }
  }, [isConnected]);

  // 处理WebSocket消息 - 现在由App.jsx统一处理
  // 这里可以添加UniversalAgent特有的消息处理逻辑

  // 转换消息格式以适配UniversalAgent的显示
  const convertMessageFormat = (message) => {
    switch (message.type) {
      case 'user':
        return { role: 'user', content: message.content };
      case 'assistant':
        return { role: 'assistant', content: message.content, metadata: message.metadata };
      case 'system':
        return { role: 'system', content: message.content };
      case 'thinking':
        return { role: 'thinking', content: message.content };
      case 'tool_start':
        return { role: 'tool', content: `调用工具: ${message.tool}` };
      case 'tool_result':
        return { role: 'tool', content: `工具结果: ${message.tool}` };
      case 'tool_error':
        return { role: 'error', content: `工具错误: ${message.tool} - ${message.error}` };
      case 'error':
        return { role: 'error', content: message.content };
      default:
        return { role: 'system', content: message.content };
    }
  };

  // 发送消息
  const handleSendMessage = () => {
    if (!input.trim() || isProcessing || !isConnected) return;

    const userMessage = input.trim();
    setInput('');

    // 发送到WebSocket
    sendMessage(JSON.stringify({
      type: 'chat',
      message: userMessage,
      agentType: 'universal',
      context: {
        taskType: 'research',
        priority: 'high',
        outputFormat: 'markdown'
      }
    }));
  };

  // 中止任务
  const abortTask = () => {
    if (isConnected) {
      sendAbort();
    }
  };

  // 重置工作流
  const resetWorkflow = async () => {
    try {
      const response = await fetch('/api/universal-agent/reset', {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.message) {
        message.success(data.message);
        setWorkflowStatus({
          currentPhase: 'idle',
          progress: 0,
          agents: {},
          stats: {}
        });
        setCurrentReport(null);
      }
    } catch (error) {
      message.error('重置失败');
    }
  };

  // 获取Agent状态
  const fetchAgentStatus = async () => {
    try {
      const response = await fetch('/api/universal-agent/status');
      const data = await response.json();
      
      if (data.status === 'active') {
        setAgentStatus(data.agents);
        setWorkflowStatus(data.workflow);
      }
    } catch (error) {
      console.error('获取Agent状态失败:', error);
    }
  };

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 处理工作流状态更新
  useEffect(() => {
    // 检查最后一条消息是否是工作流更新
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.metadata && lastMessage.metadata.workflow) {
        setWorkflowStatus(prev => ({
          ...prev,
          ...lastMessage.metadata.workflow
        }));
      }
    }
  }, [messages]);

  // 定期获取状态
  useEffect(() => {
    const interval = setInterval(fetchAgentStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  // 渲染消息
  const renderMessage = (message) => {
    const convertedMessage = convertMessageFormat(message);
    const { role, content, metadata } = convertedMessage;
    const timestamp = message.timestamp;

    switch (role) {
      case 'user':
        return (
          <div key={message.id} className="message user-message">
            <div className="message-content">
              <Text strong>您:</Text>
              <Paragraph>{content}</Paragraph>
            </div>
            <div className="message-time">
              {timestamp.toLocaleTimeString()}
            </div>
          </div>
        );

      case 'assistant':
        return (
          <div key={message.id} className="message assistant-message">
            <div className="message-content">
              <Text strong>智能体:</Text>
              {metadata && metadata.report ? (
                <div className="report-content">
                  <div className="report-header">
                    <Title level={4}>📄 分析报告</Title>
                    <Space>
                      <Tag color="blue">字数: {metadata.report.metadata?.wordCount || 0}</Tag>
                      <Tag color="green">生成时间: {new Date(metadata.report.metadata?.generatedAt).toLocaleString()}</Tag>
                    </Space>
                  </div>
                  <Divider />
                  <div className="markdown-content">
                    <pre>{content}</pre>
                  </div>
                </div>
              ) : (
                <Paragraph>{content}</Paragraph>
              )}
            </div>
            <div className="message-time">
              {timestamp.toLocaleTimeString()}
            </div>
          </div>
        );

      case 'system':
        return (
          <div key={message.id} className="message system-message">
            <div className="message-content">
              <Text type="secondary">💬 {content}</Text>
            </div>
          </div>
        );

      case 'thinking':
        return (
          <div key={message.id} className="message thinking-message">
            <div className="message-content">
              <Text type="secondary">🤔 {content}</Text>
            </div>
          </div>
        );

      case 'tool':
        return (
          <div key={message.id} className="message tool-message">
            <div className="message-content">
              <Text type="secondary">🔧 {content}</Text>
            </div>
          </div>
        );

      case 'workflow':
        return (
          <div key={message.id} className="message workflow-message">
            <div className="message-content">
              <Text type="secondary">⚙️ {content}</Text>
            </div>
          </div>
        );

      case 'error':
        return (
          <div key={message.id} className="message error-message">
            <div className="message-content">
              <Text type="danger">❌ {content}</Text>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // 获取当前步骤索引
  const getCurrentStepIndex = () => {
    return workflowSteps.findIndex(step => step.key === workflowStatus.currentPhase);
  };

  return (
    <div className="universal-agent-container">
      <div className="universal-agent-header">
        <Title level={2}>🤖 通用智能体</Title>
        <Paragraph>
          多Agent协作系统，支持规划、搜索、分析和报告生成
        </Paragraph>
      </div>

      <div className="universal-agent-content">
        {/* 工作流状态 */}
        <Card title="工作流状态" className="workflow-card">
          <Steps current={getCurrentStepIndex()} size="small">
            {workflowSteps.map(step => (
              <Step key={step.key} title={step.title} icon={step.icon} />
            ))}
          </Steps>
          
          <div className="progress-section">
            <Progress 
              percent={workflowStatus.progress} 
              status={isProcessing ? 'active' : 'normal'}
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
            />
            <Text type="secondary">
              当前阶段: {workflowStatus.currentPhase}
            </Text>
          </div>

          <div className="agent-status">
            <Space wrap>
              {Object.entries(agentStatus).map(([agentId, status]) => (
                <Tag key={agentId} color={status.status === 'busy' ? 'orange' : 'green'}>
                  {status.role}: {status.status}
                </Tag>
              ))}
            </Space>
          </div>
        </Card>

        {/* 消息区域 */}
        <Card title="对话记录" className="messages-card">
          <div className="messages-container">
            {messages.length === 0 ? (
              <div className="empty-messages">
                <Text type="secondary">
                  开始您的第一个研究任务吧！例如：
                </Text>
                <ul>
                  <li>"分析2024年人工智能技术发展趋势"</li>
                  <li>"研究新能源汽车行业现状和前景"</li>
                  <li>"对比分析主流AI助手的功能特点"</li>
                </ul>
              </div>
            ) : (
              messages.map(renderMessage)
            )}
            <div ref={messagesEndRef} />
          </div>
        </Card>

        {/* 输入区域 */}
        <Card className="input-card">
          <div className="input-container">
            <TextArea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="请输入您的研究需求..."
              autoSize={{ minRows: 2, maxRows: 6 }}
              onPressEnter={(e) => {
                if (!e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={isProcessing}
            />
            <div className="input-actions">
              <Space>
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={handleSendMessage}
                  loading={isProcessing}
                  disabled={!input.trim() || !isConnected}
                >
                  发送
                </Button>
                {isProcessing && (
                  <Button
                    danger
                    onClick={abortTask}
                  >
                    中止
                  </Button>
                )}
                <Button
                  icon={<ReloadOutlined />}
                  onClick={resetWorkflow}
                  disabled={isProcessing}
                >
                  重置
                </Button>
              </Space>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default UniversalAgent; 