import React, { useState, useRef, useEffect } from 'react';
import { Input, Button, Card, Avatar, Typography, Space, Spin, Tag, Collapse } from 'antd';
import { SendOutlined, UserOutlined, RobotOutlined, ToolOutlined, ExclamationCircleOutlined, CheckCircleOutlined, ClockCircleOutlined, StopOutlined, DownOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
  planSolveStatus,
  planSolveProgress,
  toolExecutionData,
  agentStatus,
  onSendMessage, 
  onAbort,
  onResetProgress,
  isConnected,
  sidebarCollapsed = false
}) => {
  const [inputValue, setInputValue] = useState('');
  const [expandedTools, setExpandedTools] = useState(new Set());
  const [showJsonData, setShowJsonData] = useState(false);
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
          <Card 
            size="small" 
            style={{ 
              maxWidth: '90%', 
              backgroundColor: '#e6f7ff',
              marginLeft: 'auto',
              marginRight: 0
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
        );

      case 'assistant':
        return (
          <Card 
            size="small" 
            style={{ 
              maxWidth: '90%', 
              backgroundColor: '#f6ffed',
              padding: '8px 16px'
            }}
            bodyStyle={{ 
              padding: '16px 20px',
              lineHeight: '1.6'
            }}
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                img({ node, src, alt, ...props }) {
                  return (
                    <img
                      src={src}
                      alt={alt}
                      {...props}
                      style={{
                        maxWidth: '100%',
                        maxHeight: '400px',
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
              maxWidth: '95%',
              backgroundColor: '#f0f9ff',
              borderColor: '#bae6fd'
            }}
            bodyStyle={{ 
              padding: '10px 16px',
              lineHeight: '1.4',
              minWidth: '400px'
            }}
          >
            <Collapse 
              ghost
              size="small"
              items={[
                {
                  key: '1',
                  label: (
                    <Space>
                      <ClockCircleOutlined style={{ color: '#1890ff' }} />
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        思考过程
                      </Text>
                    </Space>
                  ),
                  children: (
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
                  )
                }
              ]}
              style={{
                backgroundColor: 'transparent',
                border: 'none'
              }}
            />
          </Card>
        );

      case 'tool_execution':
        const { status, result, error, args, tool, timestamp, completedAt } = message;
        const isCompleted = status === 'completed';
        const isError = status === 'error';
        const isRunning = status === 'running';
        
        const cardStyle = isError 
          ? { backgroundColor: '#f0f9ff', borderColor: '#ef4444' }
          : isCompleted 
          ? { backgroundColor: '#f0f9ff', borderColor: '#bae6fd' }
          : { backgroundColor: '#f0f9ff', borderColor: '#fbbf24' };
        
        const iconStyle = isError 
          ? { color: '#dc2626' }
          : isCompleted 
          ? { color: '#16a34a' }
          : { color: '#f59e0b' };
        
        const titleIcon = isError 
          ? <ExclamationCircleOutlined style={iconStyle} />
          : isCompleted 
          ? <CheckCircleOutlined style={iconStyle} />
          : <ToolOutlined style={iconStyle} />;
        
        const statusTag = isError 
          ? <Tag color="error">失败</Tag>
          : isCompleted 
          ? <Tag color="success">完成</Tag>
          : <Tag color="processing" icon={<Spin size="small" />}>执行中</Tag>;
        
        return (
          <Card 
            size="small" 
            style={{ 
              maxWidth: '95%',
              ...cardStyle
            }}
            bodyStyle={{ 
              padding: '8px 12px',
              lineHeight: '1.2',
              minWidth: '400px',
              height: expandedTools.has(message.id) ? 'auto' : '45px',
              overflow: 'hidden'
            }}
          >
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              height: '100%'
            }}>
              <Space>
                {titleIcon}
                <Text strong className={isError ? 'danger' : ''} style={{ fontSize: '13px' }}>
                  工具执行: {tool}
                </Text>
                {statusTag}
              </Space>
              
              {(args || (isCompleted && result) || (isError && error)) && (
                <Button 
                  type="text" 
                  size="small"
                  icon={<DownOutlined style={{ 
                    transform: expandedTools.has(message.id) ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease'
                  }} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    const newExpanded = new Set(expandedTools);
                    if (newExpanded.has(message.id)) {
                      newExpanded.delete(message.id);
                    } else {
                      newExpanded.add(message.id);
                    }
                    setExpandedTools(newExpanded);
                  }}
                  style={{ 
                    fontSize: '11px', 
                    color: '#8c8c8c',
                    padding: '2px 4px',
                    height: '20px'
                  }}
                >
                  详情
                </Button>
              )}
            </div>
            
            {expandedTools.has(message.id) && (
              <div className="tool-execution-details" style={{ 
                marginTop: '8px',
                paddingTop: '8px',
                borderTop: '1px solid #e2e8f0'
              }}>
                {args && (
                  <Collapse 
                    ghost
                    size="small"
                    defaultActiveKey={[]}
                    items={[
                      {
                        key: 'args',
                        label: (
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            工具参数
                          </Text>
                        ),
                        children: (
                          <div className="json-viewer">
                            <pre style={{ 
                              margin: 0, 
                              fontSize: '12px',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word'
                            }}>
                              {JSON.stringify(args, null, 2)}
                            </pre>
                          </div>
                        )
                      }
                    ]}
                    style={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      marginTop: '4px'
                    }}
                  />
                )}
                
                {isCompleted && result && (
                  <Collapse 
                    ghost
                    size="small"
                    defaultActiveKey={[]}
                    items={[
                      {
                        key: 'result',
                        label: (
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            执行结果
                          </Text>
                        ),
                        children: (
                          <div className="json-viewer">
                            <pre style={{ 
                              margin: 0, 
                              fontSize: '12px',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              maxHeight: '300px',
                              overflowY: 'auto'
                            }}>
                              {JSON.stringify(result, null, 2)}
                            </pre>
                          </div>
                        )
                      }
                    ]}
                    style={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      marginTop: '4px'
                    }}
                  />
                )}
                
                {isError && error && (
                  <div style={{ 
                    backgroundColor: '#fef2f2',
                    padding: '6px 10px',
                    borderRadius: '4px',
                    border: '1px solid #fecaca',
                    marginTop: '4px'
                  }}>
                    <Text type="danger" style={{ fontSize: '12px' }}>
                      {error}
                    </Text>
                  </div>
                )}
                
                {completedAt && (
                  <Text type="secondary" style={{ fontSize: '10px', display: 'block', marginTop: '4px' }}>
                    执行耗时: {Math.round((completedAt - timestamp) / 1000 * 100) / 100}秒
                  </Text>
                )}
              </div>
            )}
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

      case 'plan_solve_update':
        return (
          <Card 
            size="small" 
            style={{ 
              maxWidth: '95%',
              backgroundColor: '#f0f9ff',
              borderColor: '#bae6fd'
            }}
            bodyStyle={{ 
              padding: '10px 16px',
              lineHeight: '1.4',
              minWidth: '400px'
            }}
          >
            <Space direction="vertical" size="small" style={{ width: '100%', gap: '6px' }}>
              <Space>
                <ClockCircleOutlined style={{ color: '#1890ff' }} />
                <Text strong style={{ fontSize: '13px' }}>
                  Plan & Solve 执行状态
                </Text>
                {message.phase === 'task_analysis' && <Tag color="processing">任务分析</Tag>}
                {message.phase === 'plan_creation' && <Tag color="processing">计划制定</Tag>}
                {message.phase === 'plan_execution' && <Tag color="processing">计划执行</Tag>}
                {message.phase === 'result_evaluation' && <Tag color="processing">结果评估</Tag>}
                {message.phase === 'step_start' && <Tag color="processing">步骤执行</Tag>}
                {message.phase === 'step_complete' && <Tag color="success">步骤完成</Tag>}
                {message.phase === 'step_error' && <Tag color="error">步骤失败</Tag>}
              </Space>
              
              <Text style={{ fontSize: '12px', color: '#4a5568' }}>
                {message.message}
              </Text>
              
              {message.data && (message.phase === 'step_start' || message.phase === 'step_complete' || message.phase === 'step_error') && (
                <div style={{ marginTop: '8px' }}>
                  <Text type="secondary" style={{ fontSize: '11px' }}>
                    步骤 {message.data.stepNumber}/{message.data.totalSteps}: {message.data.stepName}
                  </Text>
                  {message.data.stepType && (
                    <Tag size="small" style={{ marginLeft: '8px' }}>
                      {message.data.stepType === 'tool_call' ? '工具调用' : 
                       message.data.stepType === 'reasoning' ? '推理分析' : 
                       message.data.stepType === 'synthesis' ? '结果综合' : message.data.stepType}
                    </Tag>
                  )}
                </div>
              )}
              
              {message.data && message.phase === 'plan_creation' && message.data.steps && (
                <Collapse 
                  ghost
                  size="small"
                  defaultActiveKey={[]}
                  items={[
                    {
                      key: 'plan',
                      label: (
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          执行计划 ({message.data.steps.length} 个步骤)
                        </Text>
                      ),
                      children: (
                        <div style={{ marginTop: '8px' }}>
                          {message.data.steps.map((step, index) => (
                            <div key={index} style={{ 
                              marginBottom: '8px', 
                              padding: '6px 8px',
                              backgroundColor: '#f8fafc',
                              borderRadius: '4px',
                              border: '1px solid #e2e8f0'
                            }}>
                              <Text style={{ fontSize: '11px', fontWeight: 'bold' }}>
                                步骤 {step.stepNumber}: {step.stepName}
                              </Text>
                              <br />
                              <Text type="secondary" style={{ fontSize: '10px' }}>
                                {step.description}
                              </Text>
                              {step.type === 'tool_call' && (
                                <div style={{ marginTop: '4px' }}>
                                  <Tag size="small" color="blue">
                                    工具: {step.tool}
                                  </Tag>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )
                    }
                  ]}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    marginTop: '8px'
                  }}
                />
              )}
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
      case 'tool_execution':
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
      {/* Plan & Solve 执行状态和任务组合卡片 - 悬浮顶部 */}
      {planSolveProgress && (
        <div className="plan-solve-floating" style={{ 
          position: 'fixed',
          top: '0',
          left: sidebarCollapsed ? '80px' : '320px', // 根据Sidebar折叠状态调整
          right: '0',
          zIndex: 1000,
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          padding: '12px 16px',
          transition: 'left 0.2s ease' // 添加过渡动画
        }}>
          <div style={{ 
            display: 'flex', 
            gap: '16px', 
            alignItems: 'flex-start',
            width: '100%'
          }}>
            {/* 左侧：执行状态 */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Space>
                    <Text strong style={{ fontSize: '14px' }}>
                      执行状态
                    </Text>
                    <Tag color="processing">
                      {planSolveProgress.completedSteps || 0}/{planSolveProgress.totalSteps || 0}
                    </Tag>
                    {planSolveProgress.phase === 'step_start' && <Tag color="processing">执行中</Tag>}
                    {planSolveProgress.phase === 'step_complete' && <Tag color="success">完成</Tag>}
                    {planSolveProgress.phase === 'step_error' && <Tag color="error">失败</Tag>}
                  </Space>
                  <Button 
                    size="small" 
                    type="text" 
                    onClick={onResetProgress}
                    style={{ fontSize: '11px', color: '#8c8c8c' }}
                  >
                    清除
                  </Button>
                </Space>
                
                {/* 进度条 */}
                <div style={{ 
                  width: '100%', 
                  backgroundColor: '#e2e8f0', 
                  borderRadius: '4px',
                  height: '8px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${((planSolveProgress.completedSteps || 0) / (planSolveProgress.totalSteps || 1)) * 100}%`,
                    height: '100%',
                    backgroundColor: planSolveProgress.phase === 'step_error' ? '#ef4444' : '#1890ff',
                    transition: 'width 0.3s ease',
                    borderRadius: '4px'
                  }} />
                </div>
                
                {/* 当前步骤信息 */}
                {planSolveProgress.currentStep && (
                  <div style={{ marginTop: '8px' }}>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      当前步骤: {planSolveProgress.currentStep} - {planSolveProgress.stepName}
                    </Text>
                    {planSolveProgress.stepType && (
                      <Tag size="small" style={{ marginLeft: '8px' }}>
                        {planSolveProgress.stepType === 'tool_call' ? '工具调用' : 
                         planSolveProgress.stepType === 'reasoning' ? '推理分析' : 
                         planSolveProgress.stepType === 'synthesis' ? '结果综合' : planSolveProgress.stepType}
                      </Tag>
                    )}
                  </div>
                )}
                
                {/* 执行步骤清单 */}
                {planSolveProgress.data && planSolveProgress.data.steps && (
                  <div style={{ marginTop: '12px' }}>
                    <Text type="secondary" style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', display: 'block' }}>
                      执行步骤清单:
                    </Text>
                    <div style={{ 
                      backgroundColor: '#f8f9fa',
                      border: '1px solid #e9ecef',
                      borderRadius: '4px',
                      padding: '8px'
                    }}>
                      {planSolveProgress.data.steps.map((step, index) => {
                        const isCurrentStep = planSolveProgress.currentStep === step.stepNumber;
                        const isCompleted = planSolveProgress.completedSteps >= step.stepNumber;
                        const isError = planSolveProgress.phase === 'step_error' && planSolveProgress.currentStep === step.stepNumber;
                        
                        // 获取工具执行数据
                        const toolData = step.type === 'tool_call' && step.tool ? toolExecutionData?.get(step.tool) : null;
                        
                        return (
                          <div 
                            key={step.stepNumber} 
                            style={{ 
                              padding: '8px 0',
                              borderBottom: index < planSolveProgress.data.steps.length - 1 ? '1px solid #e9ecef' : 'none'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                              <div style={{ 
                                width: '16px', 
                                height: '16px', 
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '10px',
                                marginRight: '8px',
                                marginTop: '2px',
                                backgroundColor: isError ? '#ef4444' : isCompleted ? '#10b981' : isCurrentStep ? '#3b82f6' : '#d1d5db',
                                color: 'white',
                                flexShrink: 0
                              }}>
                                {isError ? '❌' : isCompleted ? '✓' : isCurrentStep ? '▶' : step.stepNumber}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <Text style={{ 
                                  fontSize: '11px', 
                                  fontWeight: isCurrentStep ? 'bold' : 'normal',
                                  color: isError ? '#ef4444' : isCurrentStep ? '#3b82f6' : '#374151',
                                  display: 'block'
                                }}>
                                  {step.stepName}
                                </Text>
                                <Text type="secondary" style={{ fontSize: '10px', display: 'block' }}>
                                  {step.type === 'tool_call' ? '📦 工具调用' : 
                                   step.type === 'reasoning' ? '🧠 推理分析' : 
                                   step.type === 'synthesis' ? '🔗 结果综合' : step.type}
                                  {step.tool && ` - ${step.tool}`}
                                </Text>
                                
                                {/* 工具调用详细信息 */}
                                {step.type === 'tool_call' && toolData && (
                                  <div style={{ marginTop: '6px' }}>
                                    {/* 工具参数 */}
                                    {toolData.args && (
                                      <Collapse 
                                        ghost
                                        size="small"
                                        items={[
                                          {
                                            key: 'args',
                                            label: (
                                              <Text type="secondary" style={{ fontSize: '10px' }}>
                                                🔧 调用参数
                                              </Text>
                                            ),
                                            children: (
                                              <div style={{
                                                backgroundColor: '#f1f5f9',
                                                border: '1px solid #e2e8f0',
                                                borderRadius: '3px',
                                                padding: '6px',
                                                fontSize: '9px',
                                                fontFamily: 'monospace',
                                                whiteSpace: 'pre-wrap',
                                                wordBreak: 'break-all',
                                                maxHeight: '80px',
                                                overflowY: 'auto'
                                              }}>
                                                {JSON.stringify(toolData.args, null, 2)}
                                              </div>
                                            )
                                          }
                                        ]}
                                        style={{ marginTop: '4px' }}
                                      />
                                    )}
                                    
                                    {/* 执行结果 */}
                                    {toolData.status === 'completed' && toolData.result && (
                                      <Collapse 
                                        ghost
                                        size="small"
                                        items={[
                                          {
                                            key: 'result',
                                            label: (
                                              <Text type="secondary" style={{ fontSize: '10px' }}>
                                                ✅ 执行结果
                                              </Text>
                                            ),
                                            children: (
                                              <div style={{
                                                backgroundColor: '#f0f9ff',
                                                border: '1px solid #bae6fd',
                                                borderRadius: '3px',
                                                padding: '6px',
                                                fontSize: '9px',
                                                fontFamily: 'monospace',
                                                whiteSpace: 'pre-wrap',
                                                wordBreak: 'break-all',
                                                maxHeight: '100px',
                                                overflowY: 'auto'
                                              }}>
                                                {typeof toolData.result === 'string' ? toolData.result : JSON.stringify(toolData.result, null, 2)}
                                              </div>
                                            )
                                          }
                                        ]}
                                        style={{ marginTop: '4px' }}
                                      />
                                    )}
                                    
                                    {/* 错误信息 */}
                                    {toolData.status === 'error' && toolData.error && (
                                      <div style={{ marginTop: '4px' }}>
                                        <Text type="danger" style={{ fontSize: '9px', display: 'block' }}>
                                          ❌ 错误: {toolData.error}
                                        </Text>
                                      </div>
                                    )}
                                    
                                    {/* 执行时间 */}
                                    {toolData.completedAt && (
                                      <Text type="secondary" style={{ fontSize: '9px', display: 'block', marginTop: '2px' }}>
                                        执行耗时: {Math.round((toolData.completedAt - toolData.timestamp) / 1000 * 100) / 100}秒
                                      </Text>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* 状态消息 */}
                {planSolveProgress.message && (
                  <Text type="secondary" style={{ fontSize: '11px', fontStyle: 'italic' }}>
                    {planSolveProgress.message}
                  </Text>
                )}
              </Space>
            </div>
            
            {/* 右侧：思考过程 */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <Text strong style={{ fontSize: '14px' }}>
                  思考过程
                </Text>
                
                {/* 思考过程内容 */}
                <div style={{ 
                  backgroundColor: '#ffffff', 
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '12px',
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}>
                  {(() => {
                    const phase = planSolveProgress.phase;
                    const data = planSolveProgress.data || planSolveProgress;
                    
                    switch (phase) {
                      case 'task_analysis':
                        return (
                          <div>
                            <Text style={{ fontSize: '12px', fontWeight: 'bold' }}>
                              🔍 任务分析阶段
                            </Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: '11px' }}>
                              正在分析任务类型、复杂度和所需工具...
                            </Text>
                            {data && data.taskType && (
                              <>
                                <br />
                                <Text type="secondary" style={{ fontSize: '10px' }}>
                                  任务类型: {data.taskType}, 复杂度: {data.complexity || '未知'}
                                </Text>
                              </>
                            )}
                            {data && (
                              <>
                                <br />
                                <Button 
                                  type="text" 
                                  size="small" 
                                  style={{ 
                                    padding: '2px 8px', 
                                    fontSize: '11px', 
                                    color: '#1890ff',
                                    marginTop: '4px'
                                  }}
                                  onClick={() => setShowJsonData(!showJsonData)}
                                >
                                  {showJsonData ? '隐藏' : '显示'} JSON数据
                                </Button>
                                {showJsonData && (
                                  <div style={{
                                    backgroundColor: '#f8f9fa',
                                    border: '1px solid #e9ecef',
                                    borderRadius: '4px',
                                    padding: '8px',
                                    fontSize: '10px',
                                    fontFamily: 'monospace',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-all',
                                    maxHeight: '120px',
                                    overflowY: 'auto',
                                    color: '#495057',
                                    marginTop: '4px'
                                  }}>
                                    {JSON.stringify(data, null, 2)}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        );
                      case 'plan_creation':
                        return (
                          <div>
                            <Text style={{ fontSize: '12px', fontWeight: 'bold' }}>
                              📋 计划制定阶段
                            </Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: '11px' }}>
                              正在制定详细的执行计划...
                            </Text>
                            {data && data.steps && (
                              <>
                                <br />
                                <Text type="secondary" style={{ fontSize: '10px' }}>
                                  计划包含 {data.steps.length} 个步骤
                                </Text>
                                <br />
                                <div style={{ 
                                  marginTop: '8px',
                                  backgroundColor: '#f8f9fa',
                                  border: '1px solid #e9ecef',
                                  borderRadius: '4px',
                                  padding: '8px'
                                }}>
                                  {data.steps.map((step, index) => (
                                    <div 
                                      key={step.stepNumber} 
                                      style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        padding: '2px 0',
                                        borderBottom: index < data.steps.length - 1 ? '1px solid #e9ecef' : 'none'
                                      }}
                                    >
                                      <div style={{ 
                                        width: '14px', 
                                        height: '14px', 
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '9px',
                                        marginRight: '6px',
                                        backgroundColor: '#d1d5db',
                                        color: 'white'
                                      }}>
                                        {step.stepNumber}
                                      </div>
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <Text style={{ fontSize: '10px', color: '#374151' }}>
                                          {step.stepName}
                                        </Text>
                                        <Text type="secondary" style={{ fontSize: '9px', display: 'block' }}>
                                          {step.type === 'tool_call' ? '📦 工具调用' : 
                                           step.type === 'reasoning' ? '🧠 推理分析' : 
                                           step.type === 'synthesis' ? '🔗 结果综合' : step.type}
                                        </Text>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </>
                            )}
                            {data && (
                              <>
                                <br />
                                <Button 
                                  type="text" 
                                  size="small" 
                                  style={{ 
                                    padding: '2px 8px', 
                                    fontSize: '11px', 
                                    color: '#1890ff',
                                    marginTop: '4px'
                                  }}
                                  onClick={() => setShowJsonData(!showJsonData)}
                                >
                                  {showJsonData ? '隐藏' : '显示'} JSON数据
                                </Button>
                                {showJsonData && (
                                  <div style={{
                                    backgroundColor: '#f8f9fa',
                                    border: '1px solid #e9ecef',
                                    borderRadius: '4px',
                                    padding: '8px',
                                    fontSize: '10px',
                                    fontFamily: 'monospace',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-all',
                                    maxHeight: '120px',
                                    overflowY: 'auto',
                                    color: '#495057',
                                    marginTop: '4px'
                                  }}>
                                    {JSON.stringify(data, null, 2)}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        );
                      case 'plan_execution':
                        return (
                          <div>
                            <Text style={{ fontSize: '12px', fontWeight: 'bold' }}>
                              ⚡ 计划执行阶段
                            </Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: '11px' }}>
                              正在按计划执行任务...
                            </Text>
                            {data && (
                              <>
                                <br />
                                <Text type="secondary" style={{ fontSize: '10px' }}>
                                  总步骤数: {data.totalSteps || 0}, 已完成: {data.completedSteps || 0}
                                </Text>
                              </>
                            )}
                            {data && (
                              <>
                                <br />
                                <Button 
                                  type="text" 
                                  size="small" 
                                  style={{ 
                                    padding: '2px 8px', 
                                    fontSize: '11px', 
                                    color: '#1890ff',
                                    marginTop: '4px'
                                  }}
                                  onClick={() => setShowJsonData(!showJsonData)}
                                >
                                  {showJsonData ? '隐藏' : '显示'} JSON数据
                                </Button>
                                {showJsonData && (
                                  <div style={{
                                    backgroundColor: '#f8f9fa',
                                    border: '1px solid #e9ecef',
                                    borderRadius: '4px',
                                    padding: '8px',
                                    fontSize: '10px',
                                    fontFamily: 'monospace',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-all',
                                    maxHeight: '120px',
                                    overflowY: 'auto',
                                    color: '#495057',
                                    marginTop: '4px'
                                  }}>
                                    {JSON.stringify(data, null, 2)}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        );
                      case 'step_start':
                        return (
                          <div>
                            <Text style={{ fontSize: '12px', fontWeight: 'bold' }}>
                              🔄 步骤执行
                            </Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: '11px' }}>
                              开始执行步骤 {planSolveProgress.currentStep}: {planSolveProgress.stepName}
                            </Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: '10px' }}>
                              {planSolveProgress.stepType === 'tool_call' ? '📦 调用工具获取信息' : 
                               planSolveProgress.stepType === 'reasoning' ? '🧠 进行逻辑推理和分析' : 
                               planSolveProgress.stepType === 'synthesis' ? '🔗 整合多个步骤的结果' : '处理数据'}
                            </Text>
                            {data && (
                              <>
                                <br />
                                <Button 
                                  type="text" 
                                  size="small" 
                                  style={{ 
                                    padding: '2px 8px', 
                                    fontSize: '11px', 
                                    color: '#1890ff',
                                    marginTop: '4px'
                                  }}
                                  onClick={() => setShowJsonData(!showJsonData)}
                                >
                                  {showJsonData ? '隐藏' : '显示'} JSON数据
                                </Button>
                                {showJsonData && (
                                  <div style={{
                                    backgroundColor: '#f8f9fa',
                                    border: '1px solid #e9ecef',
                                    borderRadius: '4px',
                                    padding: '8px',
                                    fontSize: '10px',
                                    fontFamily: 'monospace',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-all',
                                    maxHeight: '120px',
                                    overflowY: 'auto',
                                    color: '#495057',
                                    marginTop: '4px'
                                  }}>
                                    {JSON.stringify(data, null, 2)}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        );
                      case 'step_complete':
                        return (
                          <div>
                            <Text style={{ fontSize: '12px', fontWeight: 'bold' }}>
                              ✅ 步骤完成
                            </Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: '11px' }}>
                              步骤 {planSolveProgress.currentStep} 执行完成: {planSolveProgress.stepName}
                            </Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: '10px' }}>
                              {planSolveProgress.stepType === 'tool_call' ? '📦 工具调用成功，已获取所需信息' : 
                               planSolveProgress.stepType === 'reasoning' ? '🧠 推理分析完成，得出相关结论' : 
                               planSolveProgress.stepType === 'synthesis' ? '🔗 结果整合完成，准备下一步' : '处理完成'}
                            </Text>
                            {data && (
                              <>
                                <br />
                                <Button 
                                  type="text" 
                                  size="small" 
                                  style={{ 
                                    padding: '2px 8px', 
                                    fontSize: '11px', 
                                    color: '#1890ff',
                                    marginTop: '4px'
                                  }}
                                  onClick={() => setShowJsonData(!showJsonData)}
                                >
                                  {showJsonData ? '隐藏' : '显示'} JSON数据
                                </Button>
                                {showJsonData && (
                                  <div style={{
                                    backgroundColor: '#f8f9fa',
                                    border: '1px solid #e9ecef',
                                    borderRadius: '4px',
                                    padding: '8px',
                                    fontSize: '10px',
                                    fontFamily: 'monospace',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-all',
                                    maxHeight: '120px',
                                    overflowY: 'auto',
                                    color: '#495057',
                                    marginTop: '4px'
                                  }}>
                                    {JSON.stringify(data, null, 2)}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        );
                      case 'step_error':
                        return (
                          <div>
                            <Text style={{ fontSize: '12px', fontWeight: 'bold' }}>
                              ❌ 步骤失败
                            </Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: '11px' }}>
                              步骤 {planSolveProgress.currentStep} 执行失败: {planSolveProgress.stepName}
                            </Text>
                            <br />
                            <Text type="danger" style={{ fontSize: '10px' }}>
                              错误: {planSolveProgress.message}
                            </Text>
                            {data && (
                              <>
                                <br />
                                <Button 
                                  type="text" 
                                  size="small" 
                                  style={{ 
                                    padding: '2px 8px', 
                                    fontSize: '11px', 
                                    color: '#1890ff',
                                    marginTop: '4px'
                                  }}
                                  onClick={() => setShowJsonData(!showJsonData)}
                                >
                                  {showJsonData ? '隐藏' : '显示'} JSON数据
                                </Button>
                                {showJsonData && (
                                  <div style={{
                                    backgroundColor: '#f8f9fa',
                                    border: '1px solid #e9ecef',
                                    borderRadius: '4px',
                                    padding: '8px',
                                    fontSize: '10px',
                                    fontFamily: 'monospace',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-all',
                                    maxHeight: '120px',
                                    overflowY: 'auto',
                                    color: '#495057',
                                    marginTop: '4px'
                                  }}>
                                    {JSON.stringify(data, null, 2)}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        );
                      case 'result_evaluation':
                        return (
                          <div>
                            <Text style={{ fontSize: '12px', fontWeight: 'bold' }}>
                              📊 结果评估阶段
                            </Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: '11px' }}>
                              正在评估最终结果的质量和完整性...
                            </Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: '10px' }}>
                              检查结果的准确性、完整性和实用性
                            </Text>
                            {data && (
                              <>
                                <br />
                                <Button 
                                  type="text" 
                                  size="small" 
                                  style={{ 
                                    padding: '2px 8px', 
                                    fontSize: '11px', 
                                    color: '#1890ff',
                                    marginTop: '4px'
                                  }}
                                  onClick={() => setShowJsonData(!showJsonData)}
                                >
                                  {showJsonData ? '隐藏' : '显示'} JSON数据
                                </Button>
                                {showJsonData && (
                                  <div style={{
                                    backgroundColor: '#f8f9fa',
                                    border: '1px solid #e9ecef',
                                    borderRadius: '4px',
                                    padding: '8px',
                                    fontSize: '10px',
                                    fontFamily: 'monospace',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-all',
                                    maxHeight: '120px',
                                    overflowY: 'auto',
                                    color: '#495057',
                                    marginTop: '4px'
                                  }}>
                                    {JSON.stringify(data, null, 2)}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        );
                      default:
                        return (
                          <Text type="secondary" style={{ fontSize: '11px' }}>
                            ⏳ 正在处理...
                          </Text>
                        );
                    }
                  })()}
                </div>
              </Space>
            </div>
          </div>
        </div>
      )}

      <div className="messages-container" style={{ 
        paddingTop: planSolveProgress ? '120px' : '0' // 为悬浮卡片留出空间
      }}>
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

        {messages
          .filter((message) => {
            // 在 plan_solve 模式下，过滤掉工具执行消息
            if (agentStatus?.thinkingMode === 'plan_solve' && message.type === 'tool_execution') {
              return false;
            }
            return true;
          })
          .map((message) => (
          <div key={message.id} className="message-item">
            {message.type === 'user' ? (
              <Space align="start" style={{ width: '100%', justifyContent: 'flex-end' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  {renderMessageContent(message)}
                  <div style={{ marginTop: '4px' }}>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {dayjs(message.timestamp).format('HH:mm:ss')}
                    </Text>
                  </div>
                </div>
                {renderAvatar(message)}
              </Space>
            ) : (
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
            )}
          </div>
        ))}

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