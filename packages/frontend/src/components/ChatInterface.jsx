import React, { useState, useRef, useEffect } from 'react';
import { Input, Button, Card, Avatar, Typography, Space, Spin, Tag, Collapse } from 'antd';
import { SendOutlined, UserOutlined, RobotOutlined, ToolOutlined, ExclamationCircleOutlined, CheckCircleOutlined, ClockCircleOutlined, StopOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Text } = Typography;
const { Panel } = Collapse;

const ChatInterface = ({ 
  messages, 
  isProcessing, 
  thinking, 
  currentTool, 
  onSendMessage, 
  onAbort,
  isConnected 
}) => {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim() || !isConnected || isProcessing) return;
    onSendMessage(inputValue.trim());
    setInputValue('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderMessageContent = (message) => {
    switch (message.type) {
      case 'user':
        return (
          <div style={{ textAlign: 'right' }}>
            <Card 
              size="small" 
              style={{ 
                display: 'inline-block', 
                maxWidth: '80%', 
                backgroundColor: '#e6f7ff' 
              }}
              bodyStyle={{ 
                padding: '12px 16px',
                lineHeight: '1.5'
              }}
            >
              <Text style={{ fontSize: '14px', color: '#2c3e50' }}>
                {message.content}
              </Text>
            </Card>
          </div>
        );

      case 'assistant':
        return (
          <Card 
            size="small" 
            style={{ 
              maxWidth: '90%', 
              backgroundColor: '#f6ffed',
              padding: '8px 16px' // 增加内边距
            }}
            bodyStyle={{ 
              padding: '16px 20px', // Card body的内边距
              lineHeight: '1.6' // 改善行高
            }}
          >
            <ReactMarkdown
              components={{
                // 图片组件优化
                img({ node, src, alt, ...props }) {
                  return (
                    <img
                      src={src}
                      alt={alt}
                      {...props}
                      style={{
                        maxWidth: '100%',
                        maxHeight: '400px', // 限制图片最大高度
                        height: 'auto',
                        borderRadius: '8px',
                        marginTop: '8px',
                        marginBottom: '8px',
                        display: 'block',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                  );
                },
                // 代码块组件
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline && match ? (
                    <SyntaxHighlighter
                      style={tomorrow}
                      language={match[1]}
                      PreTag="div"
                      customStyle={{
                        margin: '12px 0',
                        borderRadius: '6px',
                        fontSize: '13px'
                      }}
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code 
                      className={className} 
                      style={{
                        backgroundColor: '#f5f5f5',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '13px',
                        border: '1px solid #e1e1e1'
                      }}
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
                // 段落组件
                p({ children }) {
                  return (
                    <p style={{ 
                      marginBottom: '12px', 
                      fontSize: '14px',
                      color: '#2c3e50'
                    }}>
                      {children}
                    </p>
                  );
                },
                // 列表组件
                ul({ children }) {
                  return (
                    <ul style={{ 
                      marginLeft: '20px', 
                      marginBottom: '12px',
                      fontSize: '14px'
                    }}>
                      {children}
                    </ul>
                  );
                },
                ol({ children }) {
                  return (
                    <ol style={{ 
                      marginLeft: '20px', 
                      marginBottom: '12px',
                      fontSize: '14px'
                    }}>
                      {children}
                    </ol>
                  );
                },
                // 标题组件
                h1({ children }) {
                  return (
                    <h1 style={{ 
                      fontSize: '20px', 
                      marginBottom: '16px',
                      color: '#1a202c',
                      borderBottom: '2px solid #e2e8f0',
                      paddingBottom: '8px'
                    }}>
                      {children}
                    </h1>
                  );
                },
                h2({ children }) {
                  return (
                    <h2 style={{ 
                      fontSize: '18px', 
                      marginBottom: '14px',
                      color: '#2d3748'
                    }}>
                      {children}
                    </h2>
                  );
                },
                h3({ children }) {
                  return (
                    <h3 style={{ 
                      fontSize: '16px', 
                      marginBottom: '12px',
                      color: '#4a5568'
                    }}>
                      {children}
                    </h3>
                  );
                },
                // 引用组件
                blockquote({ children }) {
                  return (
                    <blockquote style={{
                      borderLeft: '4px solid #4299e1',
                      paddingLeft: '16px',
                      margin: '12px 0',
                      backgroundColor: '#f7fafc',
                      padding: '12px 16px',
                      borderRadius: '0 6px 6px 0',
                      fontStyle: 'italic'
                    }}>
                      {children}
                    </blockquote>
                  );
                },
                // 表格组件
                table({ children }) {
                  return (
                    <div style={{ overflowX: 'auto', margin: '12px 0' }}>
                      <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        border: '1px solid #e2e8f0'
                      }}>
                        {children}
                      </table>
                    </div>
                  );
                },
                th({ children }) {
                  return (
                    <th style={{
                      border: '1px solid #e2e8f0',
                      padding: '8px 12px',
                      backgroundColor: '#f7fafc',
                      fontWeight: 'bold',
                      fontSize: '13px'
                    }}>
                      {children}
                    </th>
                  );
                },
                td({ children }) {
                  return (
                    <td style={{
                      border: '1px solid #e2e8f0',
                      padding: '8px 12px',
                      fontSize: '13px'
                    }}>
                      {children}
                    </td>
                  );
                }
              }}
            >
              {message.content}
            </ReactMarkdown>
          </Card>
        );

      case 'thinking':
        return (
          <Card 
            size="small" 
            style={{ 
              maxWidth: '90%', 
              backgroundColor: '#f0f9ff', 
              borderColor: '#bae6fd' 
            }}
            bodyStyle={{ 
              padding: '12px 16px',
              lineHeight: '1.5'
            }}
          >
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Space>
                <ClockCircleOutlined style={{ color: '#1890ff' }} />
                <Text type="secondary">思考过程</Text>
              </Space>
              <div className="json-viewer">
                <pre style={{ 
                  margin: 0, 
                  fontSize: '12px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  {message.content}
                </pre>
              </div>
            </Space>
          </Card>
        );

      case 'tool_start':
        return (
          <Card 
            size="small" 
            style={{ 
              maxWidth: '90%', 
              backgroundColor: '#fef3c7', 
              borderColor: '#fbbf24' 
            }}
            bodyStyle={{ 
              padding: '12px 16px',
              lineHeight: '1.5'
            }}
          >
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Space>
                <ToolOutlined style={{ color: '#f59e0b' }} />
                <Text strong>调用工具: {message.tool}</Text>
                <Tag color="processing" icon={<Spin size="small" />}>执行中</Tag>
              </Space>
              {message.args && (
                <div>
                  <Text type="secondary" style={{ fontSize: '13px' }}>参数:</Text>
                  <div className="json-viewer">
                    <pre style={{ 
                      margin: 0, 
                      fontSize: '12px',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}>
                      {JSON.stringify(message.args, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </Space>
          </Card>
        );

      case 'tool_result':
        return (
          <Card 
            size="small" 
            style={{ 
              maxWidth: '90%', 
              backgroundColor: '#dcfce7', 
              borderColor: '#22c55e' 
            }}
            bodyStyle={{ 
              padding: '12px 16px',
              lineHeight: '1.5'
            }}
          >
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Space>
                <CheckCircleOutlined style={{ color: '#16a34a' }} />
                <Text strong>工具结果: {message.tool}</Text>
                <Tag color="success">完成</Tag>
              </Space>
              <div className="json-viewer">
                <pre style={{ 
                  margin: 0, 
                  fontSize: '12px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  maxHeight: '300px',
                  overflowY: 'auto'
                }}>
                  {JSON.stringify(message.result, null, 2)}
                </pre>
              </div>
            </Space>
          </Card>
        );

      case 'tool_error':
        return (
          <Card 
            size="small" 
            style={{ 
              maxWidth: '90%', 
              backgroundColor: '#fee2e2', 
              borderColor: '#ef4444' 
            }}
            bodyStyle={{ 
              padding: '12px 16px',
              lineHeight: '1.5'
            }}
          >
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Space>
                <ExclamationCircleOutlined style={{ color: '#dc2626' }} />
                <Text strong type="danger">工具错误: {message.tool}</Text>
                <Tag color="error">失败</Tag>
              </Space>
              <Text type="danger" style={{ fontSize: '13px' }}>
                {message.error}
              </Text>
            </Space>
          </Card>
        );

      case 'system':
        return (
          <Card 
            size="small" 
            style={{ 
              maxWidth: '90%', 
              backgroundColor: '#f3f4f6', 
              borderColor: '#d1d5db' 
            }}
            bodyStyle={{ 
              padding: '12px 16px',
              lineHeight: '1.5'
            }}
          >
            <Text type="secondary" style={{ fontSize: '13px' }}>
              {message.content}
            </Text>
          </Card>
        );

      case 'error':
        return (
          <Card 
            size="small" 
            style={{ 
              maxWidth: '90%', 
              backgroundColor: '#fee2e2', 
              borderColor: '#ef4444' 
            }}
            bodyStyle={{ 
              padding: '12px 16px',
              lineHeight: '1.5'
            }}
          >
            <Space>
              <ExclamationCircleOutlined style={{ color: '#dc2626' }} />
              <Text type="danger" style={{ fontSize: '13px' }}>
                {message.content}
              </Text>
            </Space>
          </Card>
        );

      default:
        return <Text>{message.content}</Text>;
    }
  };

  const renderAvatar = (message) => {
    switch (message.type) {
      case 'user':
        return <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />;
      case 'assistant':
      case 'thinking':
      case 'tool_start':
      case 'tool_result':
      case 'tool_error':
        return <Avatar icon={<RobotOutlined />} style={{ backgroundColor: '#52c41a' }} />;
      case 'system':
      case 'error':
        return <Avatar icon={<ExclamationCircleOutlined />} style={{ backgroundColor: '#faad14' }} />;
      default:
        return <Avatar icon={<RobotOutlined />} />;
    }
  };

  return (
    <div className="chat-container">
      <div className="messages-container">
        {messages.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px 20px',
            color: '#8c8c8c'
          }}>
            <RobotOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
            <div>
              <Text strong style={{ fontSize: '16px' }}>欢迎使用 Auto Agent</Text>
              <br />
              <Text type="secondary">我可以帮助您完成各种任务，请告诉我您需要什么帮助。</Text>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id} className="message-item">
            <Space align="start" style={{ width: '100%' }}>
              {renderAvatar(message)}
              <div style={{ flex: 1 }}>
                {renderMessageContent(message)}
                <div style={{ marginTop: '4px' }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {dayjs(message.timestamp).format('HH:mm:ss')}
                  </Text>
                </div>
              </div>
            </Space>
          </div>
        ))}

        {/* 当前工具执行状态 */}
        {currentTool && (
          <div className="message-item">
            <Space align="start" style={{ width: '100%' }}>
              <Avatar icon={<ToolOutlined />} style={{ backgroundColor: '#faad14' }} />
              <div style={{ flex: 1 }}>
                <Card 
                  size="small" 
                  className={`tool-execution ${currentTool.status}`}
                >
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <Space>
                      {currentTool.status === 'running' && <Spin size="small" />}
                      <Text strong>
                        {currentTool.status === 'running' && '正在执行: '}
                        {currentTool.status === 'completed' && '执行完成: '}
                        {currentTool.status === 'error' && '执行失败: '}
                        {currentTool.name}
                      </Text>
                      <Tag color={currentTool.status === 'running' ? 'processing' : currentTool.status === 'completed' ? 'success' : 'error'}>
                        {currentTool.status === 'running' ? '执行中' : currentTool.status === 'completed' ? '完成' : '失败'}
                      </Tag>
                    </Space>
                    {currentTool.args && (
                      <div>
                        <Text type="secondary">参数:</Text>
                        <div className="json-viewer">
                          <pre>{JSON.stringify(currentTool.args, null, 2)}</pre>
                        </div>
                      </div>
                    )}
                  </Space>
                </Card>
              </div>
            </Space>
          </div>
        )}

        {/* 思考指示器 */}
        {thinking && (
          <div className="message-item thinking">
            <Space align="start" style={{ width: '100%' }}>
              <Avatar 
                icon={<RobotOutlined />} 
                style={{ 
                  backgroundColor: '#94a3b8', 
                  width: '24px', 
                  height: '24px',
                  fontSize: '12px'
                }} 
              />
              <div style={{ flex: 1 }}>
                <div className="thinking-indicator">
                  <Spin size="small" style={{ fontSize: '7px' }} />
                  <Text style={{ fontSize: '9px', color: '#9ca3af', fontStyle: 'italic' }}>{thinking}</Text>
                </div>
              </div>
            </Space>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        <Space.Compact style={{ width: '100%' }}>
          <TextArea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isConnected ? "输入您的问题..." : "连接中..."}
            disabled={!isConnected || isProcessing}
            autoSize={{ minRows: 1, maxRows: 4 }}
            style={{ 
              flex: 1,
              borderRadius: '8px 0 0 8px',
              border: '1px solid #d1d5db',
              fontSize: '14px'
            }}
          />
          {isProcessing ? (
            <Button
              danger
              icon={<StopOutlined />}
              onClick={onAbort}
              style={{
                borderRadius: '0 8px 8px 0',
                height: 'auto',
                padding: '8px 16px'
              }}
            >
              中止
            </Button>
          ) : (
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSend}
              disabled={!inputValue.trim() || !isConnected}
              style={{
                borderRadius: '0 8px 8px 0',
                height: 'auto',
                padding: '8px 16px'
              }}
            >
              发送
            </Button>
          )}
        </Space.Compact>
        
        {/* 连接状态 */}
        <div style={{ marginTop: '12px', textAlign: 'center' }}>
          <Tag 
            color={isConnected ? 'success' : 'error'}
            style={{ 
              borderRadius: '16px',
              padding: '4px 12px',
              fontSize: '12px'
            }}
          >
            {isConnected ? '已连接' : '未连接'}
          </Tag>
          {isProcessing && (
            <Tag 
              color="processing" 
              icon={<Spin size="small" />}
              style={{ 
                borderRadius: '16px',
                padding: '4px 12px',
                fontSize: '12px',
                marginLeft: '8px'
              }}
            >
              处理中
            </Tag>
          )}
          {isProcessing && (
            <Tag 
              color="warning"
              style={{ 
                borderRadius: '16px',
                padding: '4px 12px',
                fontSize: '12px',
                marginLeft: '8px',
                cursor: 'pointer'
              }}
              onClick={onAbort}
            >
              点击中止
            </Tag>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatInterface; 