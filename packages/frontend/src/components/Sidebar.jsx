import React, { useState, useEffect } from 'react';
import { Card, Typography, Space, Button, Tag, Divider, List, Tooltip, Collapse, Spin, Select, message } from 'antd';
import { 
  RobotOutlined, 
  ToolOutlined, 
  ReloadOutlined, 
  CheckCircleOutlined, 
  ExclamationCircleOutlined,
  WifiOutlined,
  WifiOutlined as WifiOffOutlined,
  ApiOutlined,
  DatabaseOutlined,
  GlobalOutlined,
  MessageOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  ProjectOutlined
} from '@ant-design/icons';

const { Text, Title } = Typography;
const { Panel } = Collapse;

const Sidebar = ({ collapsed, agentStatus, isConnected, onReset, mcpTools, localTools, toolsLoading }) => {
  const [activeKeys, setActiveKeys] = useState(['1', '2']);
  const [thinkingModes, setThinkingModes] = useState(null);
  const [changingMode, setChangingMode] = useState(false);

  // 加载思维模式信息
  useEffect(() => {
    const fetchThinkingModes = async () => {
      try {
        const response = await fetch('/api/agent/thinking-modes');
        if (response.ok) {
          const data = await response.json();
          setThinkingModes(data);
        }
      } catch (error) {
        console.error('获取思维模式失败:', error);
      }
    };
    
    if (isConnected && agentStatus) {
      fetchThinkingModes();
    }
  }, [isConnected, agentStatus]);

  // 切换思维模式
  const handleModeChange = async (newMode) => {
    setChangingMode(true);
    try {
      const response = await fetch('/api/agent/thinking-mode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mode: newMode })
      });

      if (response.ok) {
        const result = await response.json();
        message.success(result.message);
        // 更新本地状态
        if (thinkingModes) {
          setThinkingModes({
            ...thinkingModes,
            currentMode: newMode
          });
        }
      } else {
        const error = await response.json();
        message.error(error.message || '切换思维模式失败');
      }
    } catch (error) {
      message.error('切换思维模式失败: ' + error.message);
    } finally {
      setChangingMode(false);
    }
  };

  if (collapsed) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center',
        background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <RobotOutlined style={{ 
          fontSize: '28px', 
          color: '#ffffff',
          filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))'
        }} />
      </div>
    );
  }

  const handlePanelChange = (keys) => {
    setActiveKeys(keys);
  };

  return (
    <div className="sidebar-content">
      {/* 功能介绍 */}
      <div className="sidebar-section">
        <Title level={5}>智能对话</Title>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div className="stat-item">
            <Text className="stat-label">功能特性</Text>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Tag icon={<MessageOutlined />} color="blue">智能对话</Tag>
              <Tag icon={<GlobalOutlined />} color="green">联网搜索</Tag>
              <Tag icon={<ThunderboltOutlined />} color="orange">实时分析</Tag>
            </Space>
          </div>
        </Space>
      </div>

      <Divider />

      {/* 连接状态 */}
      <div className="sidebar-section">
        <Title level={5}>连接状态</Title>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div className="stat-item">
            <Text className="stat-label">WebSocket</Text>
            <Tag 
              color={isConnected ? 'success' : 'error'}
              icon={isConnected ? <WifiOutlined /> : <WifiOffOutlined />}
            >
              {isConnected ? '已连接' : '未连接'}
            </Tag>
          </div>
        </Space>
      </div>

      <Divider />

      {/* Agent状态 */}
      {agentStatus && (
        <>
          <div className="sidebar-section">
            <Title level={5}>Agent状态</Title>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div className="stat-item">
                <Text className="stat-label">名称</Text>
                <Text className="stat-value">{agentStatus.name}</Text>
              </div>
              
              {/* 思维模式选择器 */}
              <div className="stat-item" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                <Text className="stat-label" style={{ marginBottom: '8px' }}>思考模式</Text>
                {thinkingModes ? (
                  <Select
                    value={thinkingModes.currentMode}
                    onChange={handleModeChange}
                    loading={changingMode}
                    style={{ width: '100%' }}
                    size="small"
                  >
                    {thinkingModes.supportedModes?.map((mode) => (
                      <Select.Option key={mode.mode} value={mode.mode}>
                        <Space>
                          {mode.mode === 'react' ? (
                            <ThunderboltOutlined style={{ color: '#1890ff' }} />
                          ) : (
                            <ProjectOutlined style={{ color: '#52c41a' }} />
                          )}
                          <div>
                            <div style={{ fontWeight: 'bold' }}>{mode.name}</div>
                            <div style={{ fontSize: '11px', color: '#8c8c8c' }}>
                              {mode.description}
                            </div>
                          </div>
                        </Space>
                      </Select.Option>
                    ))}
                  </Select>
                ) : (
                  <Text className="stat-value">{agentStatus.thinkingMode}</Text>
                )}
              </div>
              
              <div className="stat-item">
                <Text className="stat-label">记忆大小</Text>
                <Text className="stat-value">{agentStatus.memorySize}</Text>
              </div>
              <div className="stat-item">
                <Text className="stat-label">对话历史</Text>
                <Text className="stat-value">{agentStatus.conversationHistoryLength}</Text>
              </div>
              <div className="stat-item">
                <Text className="stat-label">可用工具</Text>
                <Text className="stat-value">{agentStatus.availableTools}</Text>
              </div>
              
              {/* 显示当前计划信息（Plan & Solve模式） */}
              {agentStatus.thinkingMode === 'plan_solve' && agentStatus.currentPlan && (
                <div className="stat-item" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                  <Text className="stat-label" style={{ marginBottom: '4px' }}>当前计划</Text>
                  <Tag color="green" size="small">
                    {agentStatus.currentPlan.steps?.length || 0} 个步骤
                  </Tag>
                </div>
              )}
            </Space>
          </div>

          <Divider />
        </>
      )}

      {/* 工具列表 */}
      <div className="sidebar-section">
        <Title level={5}>工具管理</Title>
        <Collapse 
          activeKey={activeKeys} 
          onChange={handlePanelChange}
          size="small"
          style={{ marginBottom: '16px' }}
        >
          {/* MCP工具 */}
          <Panel 
            header={
              <Space>
                <ApiOutlined style={{ color: '#1890ff' }} />
                <Text strong>MCP工具</Text>
                {mcpTools && (
                  <Tag color="blue" size="small">
                    {mcpTools.totalTools || 0}
                  </Tag>
                )}
              </Space>
            } 
            key="1"
          >
            {toolsLoading ? (
              <div style={{ textAlign: 'center', padding: '8px' }}>
                <Spin size="small" />
                <Text type="secondary" style={{ marginLeft: '8px' }}>加载中...</Text>
              </div>
            ) : mcpTools && mcpTools.servers ? (
              <div>
                {mcpTools.servers.map((server, index) => (
                  <div key={server.serverId} style={{ marginBottom: '12px' }}>
                    <div style={{ 
                      background: '#f0f9ff', 
                      padding: '6px 8px', 
                      borderRadius: '4px',
                      marginBottom: '6px'
                    }}>
                      <Text strong style={{ fontSize: '12px' }}>
                        {server.serverName} ({server.tools.length})
                      </Text>
                    </div>
                    <div className="tool-list">
                      {server.tools.slice(0, 5).map((tool, toolIndex) => (
                        <div key={toolIndex} className="tool-item mcp">
                          <Tooltip title={tool.description} placement="left">
                            <Text style={{ fontSize: '11px' }}>{tool.name}</Text>
                          </Tooltip>
                        </div>
                      ))}
                      {server.tools.length > 5 && (
                        <div className="tool-item mcp">
                          <Text style={{ fontSize: '11px', color: '#8c8c8c' }}>
                            +{server.tools.length - 5} 更多...
                          </Text>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                暂无MCP工具
              </Text>
            )}
          </Panel>

          {/* 本地工具 */}
          <Panel 
            header={
              <Space>
                <DatabaseOutlined style={{ color: '#52c41a' }} />
                <Text strong>本地工具</Text>
                {localTools && (
                  <Tag color="green" size="small">
                    {localTools.totalTools || 0}
                  </Tag>
                )}
              </Space>
            } 
            key="2"
          >
            {toolsLoading ? (
              <div style={{ textAlign: 'center', padding: '8px' }}>
                <Spin size="small" />
                <Text type="secondary" style={{ marginLeft: '8px' }}>加载中...</Text>
              </div>
            ) : localTools && localTools.tools ? (
              <div className="tool-list">
                {localTools.tools.map((tool, index) => (
                  <div key={index} className="tool-item local">
                    <Tooltip title={tool.description} placement="left">
                      <Text style={{ fontSize: '11px' }}>{tool.name}</Text>
                    </Tooltip>
                  </div>
                ))}
              </div>
            ) : (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                暂无本地工具
              </Text>
            )}
          </Panel>
        </Collapse>
      </div>

      <Divider />

      {/* 操作按钮 */}
      <div className="sidebar-section">
        <Title level={5}>操作</Title>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button 
            type="primary" 
            icon={<ReloadOutlined />}
            onClick={onReset}
            style={{ width: '100%' }}
          >
            重置对话
          </Button>
        </Space>
      </div>

      <Divider />

      {/* 系统信息 */}
      <div className="sidebar-section">
        <Title level={5}>系统信息</Title>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div className="stat-item">
            <Text className="stat-label">版本</Text>
            <Text className="stat-value">1.0.0</Text>
          </div>
          <div className="stat-item">
            <Text className="stat-label">状态</Text>
            <Tag color="processing">运行中</Tag>
          </div>
        </Space>
      </div>
    </div>
  );
};

export default Sidebar; 