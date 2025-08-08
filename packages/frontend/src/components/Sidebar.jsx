import React, { useState } from 'react';
import { Card, Typography, Space, Button, Tag, Divider, List, Tooltip, Collapse, Spin } from 'antd';
import { 
  RobotOutlined, 
  ToolOutlined, 
  ReloadOutlined, 
  CheckCircleOutlined, 
  ExclamationCircleOutlined,
  WifiOutlined,
  WifiOutlined as WifiOffOutlined,
  ApiOutlined,
  DatabaseOutlined
} from '@ant-design/icons';

const { Text, Title } = Typography;
const { Panel } = Collapse;

const Sidebar = ({ collapsed, agentStatus, isConnected, onReset, mcpTools, localTools, toolsLoading }) => {
  const [activeKeys, setActiveKeys] = useState(['1', '2']);

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
              <div className="stat-item">
                <Text className="stat-label">思考模式</Text>
                <Text className="stat-value">{agentStatus.thinkingMode}</Text>
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