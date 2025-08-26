import React, { useState, useRef, useEffect } from 'react';
import { Input, Button, Card, Avatar, Typography, Space, Spin, Tag, Collapse } from 'antd';
import { SendOutlined, UserOutlined, RobotOutlined, ToolOutlined, ExclamationCircleOutlined, CheckCircleOutlined, ClockCircleOutlined, StopOutlined, DownOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import dayjs from 'dayjs';
import MarkdownRenderer from './MarkdownRenderer';

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
  streamingMessage,
  agentExecutionDetails,
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

  // 监听流式消息的变化，实时滚动到底部
  useEffect(() => {
    if (streamingMessage && streamingMessage.content) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [streamingMessage]);

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
              padding: '8px',
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
              padding: '8px',
              lineHeight: '1.6'
            }}
          >
            <MarkdownRenderer content={message.content} />
          </Card>
        );

      case 'thinking':
        return (
          <div style={{ 
            maxWidth: '95%',
            marginBottom: '8px'
          }}>
            <div style={{ 
              padding: '8px 12px',
              backgroundColor: '#f8fafc',
              borderLeft: '3px solid #3b82f6',
              borderRadius: '0 6px 6px 0',
              fontSize: '13px',
              color: '#374151',
              lineHeight: '1.5',
              fontStyle: 'italic'
            }}>
              <Text style={{ 
                fontSize: '13px',
                color: '#374151',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {message.content}
              </Text>
            </div>
          </div>
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
                    height: '20px',
                    marginRight: '20px'
                  }}
                >
                  详情
                </Button>
              )}
            </div>
            
            {expandedTools.has(message.id) && (
              <div className="tool-execution-details" style={{ 
                marginTop: '8px',
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
        
      case 'multi_agent_start':
        return (
          <Card 
            size="small" 
            style={{ 
              maxWidth: '95%', 
              backgroundColor: '#e6f3ff', 
              borderColor: '#1890ff',
              borderWidth: '2px'
            }}
            bodyStyle={{ 
              padding: '16px',
              lineHeight: '1.6'
            }}
          >
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RobotOutlined style={{ color: '#1890ff', fontSize: '16px' }} />
                <Text strong style={{ color: '#1890ff' }}>
                  多智能体协作模式启动
                </Text>
              </div>
              <div style={{ 
                whiteSpace: 'pre-line',
                fontSize: '13px',
                color: '#334155'
              }}>
                {message.content}
              </div>
            </Space>
          </Card>
        );
        
      case 'multi_agent_stage':
        return (
          <Card 
            size="small" 
            style={{ 
              maxWidth: '90%', 
              backgroundColor: '#f0f9ff', 
              borderColor: '#0ea5e9'
            }}
            bodyStyle={{ 
              padding: '12px 16px',
              lineHeight: '1.5'
            }}
          >
            <Space>
              <CheckCircleOutlined style={{ color: '#0ea5e9' }} />
              <Text style={{ fontSize: '13px', color: '#0369a1' }}>
                {message.content}
              </Text>
            </Space>
          </Card>
        );
        
      case 'multi_agent_progress':
        const { data: progressData } = message;
        if (!progressData) return null;
        
        const stageNames = {
          'workflow_start': '🚀 工作流启动',
          'task_breakdown': '📋 任务分解',
          'search': '🔍 网络搜索', 
          'search_complete': '🔍 网络搜索',
          'retrieval': '📚 信息检索',
          'retrieval_complete': '📚 信息检索',
          'analysis': '📊 数据分析',
          'analysis_complete': '📊 数据分析',
          'report': '📝 报告生成',
          'report_complete': '📝 报告生成'
        };
        
        const getStageStatus = (stageName, progressData) => {
          if (!progressData || !progressData.type) return 'pending';
          
          // 标准化阶段名称
          const normalizeStage = (stage) => stage.replace('_complete', '');
          const currentStage = normalizeStage(progressData.type);
          const targetStage = normalizeStage(stageName);
          
          // 定义阶段顺序
          const stageOrder = ['workflow_start', 'task_breakdown', 'search', 'retrieval', 'analysis', 'report'];
          const currentIndex = stageOrder.indexOf(currentStage);
          const targetIndex = stageOrder.indexOf(targetStage);
          
          if (currentIndex === -1) return 'pending'; // 未知阶段
          
          if (targetIndex < currentIndex || progressData.type.endsWith('_complete')) {
            return 'completed';
          } else if (targetIndex === currentIndex) {
            return progressData.type.endsWith('_complete') ? 'completed' : 'running';
          } else {
            return 'pending';
          }
        };
        
        const getProgressPercentage = (progressData) => {
          if (!progressData || !progressData.type) return 0;
          
          const progressMap = {
            'workflow_start': 5,
            'task_breakdown': 15,
            'search_complete': 35,
            'retrieval_complete': 55,
            'analysis_complete': 75,
            'report_complete': 100
          };
          
          return progressMap[progressData.type] || 0;
        };
        
        const getCurrentStageDescription = (progressData) => {
          if (!progressData || !progressData.type) return '正在初始化...';
          
          const descriptions = {
            'workflow_start': '正在启动多智能体协作模式...',
            'task_breakdown': '任务分解完成，准备开始网络搜索...',
            'search_complete': `网络搜索完成，找到 ${progressData.data?.resultsCount || 0} 条结果`,
            'retrieval_complete': `信息检索完成，获取 ${progressData.data?.dataCount || 0} 条数据`,
            'analysis_complete': `数据分析完成，生成 ${progressData.data?.analysisCount || 0} 项洞察`,
            'report_complete': `报告生成完成（${progressData.data?.reportLength || progressData.data?.reportSections || 0} 个章节）`
          };
          
          return descriptions[progressData.type] || `正在处理 ${progressData.type} 阶段...`;
        };
        
        return (
          <Card 
            size="small" 
            style={{ 
              maxWidth: '95%', 
              backgroundColor: '#f8fafc', 
              borderColor: '#3b82f6',
              borderWidth: '2px'
            }}
            bodyStyle={{ 
              padding: '16px',
              lineHeight: '1.6'
            }}
          >
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RobotOutlined style={{ color: '#3b82f6', fontSize: '16px' }} />
                <Text strong style={{ color: '#3b82f6' }}>
                  多智能体协作进度
                </Text>
              </div>
              
              {/* 当前阶段描述 */}
              <div style={{ 
                padding: '8px 12px',
                backgroundColor: '#eff6ff',
                borderRadius: '6px',
                border: '1px solid #bfdbfe'
              }}>
                <Text style={{ fontSize: '13px', color: '#1e40af' }}>
                  当前阶段: {getCurrentStageDescription(progressData)}
                </Text>
              </div>
              
              {/* 阶段列表 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {Object.entries(stageNames)
                  .filter(([stage]) => !stage.includes('_complete') && stage !== 'workflow_start')
                  .map(([stage, name], index) => {
                  const status = getStageStatus(stage, progressData);
                  const isCompleted = status === 'completed';
                  const isRunning = status === 'running';
                  
                  return (
                    <div key={stage} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      backgroundColor: isRunning ? '#eff6ff' : 
                                     isCompleted ? '#f0fdf4' : '#f8fafc',
                      border: isRunning ? '1px solid #3b82f6' :
                             isCompleted ? '1px solid #22c55e' : '1px solid #e2e8f0'
                    }}>
                      {/* 状态指示器 */}
                      <div style={{ 
                        width: '20px', 
                        height: '20px', 
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isCompleted ? '#22c55e' :
                                        isRunning ? '#3b82f6' : '#94a3b8',
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        {isCompleted ? '✓' : 
                         isRunning ? <Spin size="small" style={{ color: 'white' }} /> :
                         index + 1}
                      </div>
                      
                      {/* 阶段名称 */}
                      <div style={{ flex: 1 }}>
                        <Text style={{ 
                          fontSize: '14px',
                          fontWeight: isRunning ? 'bold' : 'normal',
                          color: isCompleted ? '#166534' :
                                 isRunning ? '#1d4ed8' : '#64748b'
                        }}>
                          {name}
                        </Text>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* 总体进度条 */}
              <div style={{ 
                width: '100%', 
                backgroundColor: '#e2e8f0', 
                borderRadius: '4px',
                height: '8px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${getProgressPercentage(progressData)}%`,
                  height: '100%',
                  backgroundColor: '#3b82f6',
                  borderRadius: '4px',
                  transition: 'width 0.3s ease'
                }} />
              </div>
              
              <Text type="secondary" style={{ fontSize: '12px', textAlign: 'center' }}>
                进度: {getProgressPercentage(progressData)}%
              </Text>
              
              {/* 智能体执行详情 */}
              {agentExecutionDetails && agentExecutionDetails.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <Text strong style={{ fontSize: '13px', color: '#374151', marginBottom: '8px', display: 'block' }}>
                    🤖 智能体执行详情
                  </Text>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {agentExecutionDetails
                      .slice(-5) // 显示最新的5条记录，不按阶段过滤
                      .map((detail, index) => {
                        const getStatusColor = (status) => {
                          switch (status) {
                            case 'start': return '#1890ff';
                            case 'analyzing': return '#722ed1';
                            case 'generating': return '#13c2c2';
                            case 'completed': return '#52c41a';
                            case 'failed': return '#ff4d4f';
                            default: return '#8c8c8c';
                          }
                        };
                        
                        const getStatusIcon = (status) => {
                          switch (status) {
                            case 'start': return '🚀';
                            case 'analyzing': return '🔍';
                            case 'generating': return '⚙️';
                            case 'completed': return '✅';
                            case 'failed': return '❌';
                            default: return '🔄';
                          }
                        };
                        
                        return (
                          <div key={detail.id} style={{
                            padding: '6px 10px',
                            backgroundColor: '#f9fafb',
                            borderLeft: `3px solid ${getStatusColor(detail.status)}`,
                            borderRadius: '0 6px 6px 0',
                            fontSize: '12px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                              <span>{getStatusIcon(detail.status)}</span>
                              <Text strong style={{ fontSize: '12px', color: getStatusColor(detail.status) }}>
                                {detail.agentName}
                              </Text>
                              <Text type="secondary" style={{ fontSize: '11px' }}>
                                {new Date(detail.timestamp).toLocaleTimeString()}
                              </Text>
                            </div>
                            
                            <Text style={{ fontSize: '12px', color: '#374151', display: 'block' }}>
                              {detail.task}
                            </Text>
                            
                            {detail.details && (
                              <Text type="secondary" style={{ fontSize: '11px', fontStyle: 'italic', display: 'block', marginTop: '2px' }}>
                                {detail.details}
                              </Text>
                            )}
                            
                            {detail.results && (
                              <div style={{ marginTop: '4px' }}>
                                <Text style={{ fontSize: '11px', color: '#059669' }}>
                                  ✓ {typeof detail.summary === 'string' ? detail.summary : 
                                     typeof detail.summary === 'object' && detail.summary ? 
                                     (detail.summary.execution_overview || JSON.stringify(detail.summary)) : 
                                     '执行完成'}
                                </Text>
                                {detail.results.llmCalls && (
                                  <Text type="secondary" style={{ fontSize: '10px', marginLeft: '8px' }}>
                                    LLM调用: {detail.results.llmCalls}次
                                  </Text>
                                )}
                              </div>
                            )}
                            
                            {detail.error && (
                              <Text type="danger" style={{ fontSize: '11px', display: 'block', marginTop: '2px' }}>
                                ✗ {detail.error}
                              </Text>
                            )}
                          </div>
                        );
                      })
                    }
                  </div>
                </div>
              )}
            </Space>
          </Card>
        );

      case 'plan_solve_update':
        // 只显示有步骤清单的执行阶段
        if (message.data && message.data.steps && message.phase === 'plan_execution') {
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
              {/* 执行步骤清单 */}
              <div>
                <Text type="secondary" style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', display: 'block' }}>
                  执行步骤清单:
                </Text>
                <div style={{ 
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #e9ecef',
                  borderRadius: '4px',
                  padding: '8px'
                }}>
                  {message.data.steps.map((step, index) => {
                    const isCurrentStep = message.data.currentStep === step.stepNumber;
                    const isCompleted = message.data.completedSteps >= step.stepNumber;
                    const isError = message.data.currentStepInfo?.status === 'error' && message.data.currentStep === step.stepNumber;
                    
                    return (
                      <div 
                        key={step.stepNumber} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          padding: '4px 0',
                          borderBottom: index < message.data.steps.length - 1 ? '1px solid #e9ecef' : 'none'
                        }}
                      >
                        <div style={{ 
                          width: '16px', 
                          height: '16px', 
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          marginRight: '8px',
                          backgroundColor: isError ? '#ef4444' : isCompleted ? '#10b981' : isCurrentStep ? '#3b82f6' : '#d1d5db',
                          color: 'white'
                        }}>
                          {isError ? '❌' : isCompleted ? '✓' : isCurrentStep ? '▶' : step.stepNumber}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Text style={{ 
                            fontSize: '11px', 
                            fontWeight: isCurrentStep ? 'bold' : 'normal',
                            color: isError ? '#ef4444' : isCurrentStep ? '#3b82f6' : '#374151'
                          }}>
                            {step.stepName}
                          </Text>
                          <Text type="secondary" style={{ fontSize: '10px', display: 'block' }}>
                            {step.type === 'tool_call' ? '📦 工具调用' : 
                             step.type === 'reasoning' ? '🧠 推理分析' : 
                             step.type === 'synthesis' ? '🔗 结果综合' : step.type}
                            {step.tool && ` - ${step.tool}`}
                          </Text>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* 进度条 */}
                <div style={{ 
                  width: '100%', 
                  backgroundColor: '#e2e8f0', 
                  borderRadius: '4px',
                  height: '6px',
                  marginTop: '8px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${((message.data.completedSteps || 0) / (message.data.totalSteps || 1)) * 100}%`,
                    height: '100%',
                    backgroundColor: message.data.currentStepInfo?.status === 'error' ? '#ef4444' : '#1890ff',
                    transition: 'width 0.3s ease',
                    borderRadius: '4px'
                  }} />
                </div>
              </div>
            </Card>
          );
        }
        // 其他阶段不显示任何内容
        return null;

      case 'agent_progress':
        // 显示单个智能体执行进度详情
        if (!message.data || !message.data.data) return null;
        
        const agentProgressData = message.data.data;
        
        const getAgentStatusColor = (status) => {
          switch (status) {
            case 'start': return '#1890ff';
            case 'analyzing': return '#722ed1';
            case 'generating': return '#13c2c2';
            case 'completed': return '#52c41a';
            case 'failed': return '#ff4d4f';
            default: return '#8c8c8c';
          }
        };
        
        const getAgentStatusIcon = (status) => {
          switch (status) {
            case 'start': return '🚀';
            case 'analyzing': return '🔍';
            case 'generating': return '⚙️';
            case 'completed': return '✅';
            case 'failed': return '❌';
            default: return '🔄';
          }
        };
        
        return (
          <Card 
            size="small" 
            style={{ 
              maxWidth: '90%', 
              backgroundColor: '#f9fafb',
              borderColor: getAgentStatusColor(agentProgressData.status),
              borderWidth: '2px'
            }}
            bodyStyle={{ 
              padding: '12px 16px',
              lineHeight: '1.5'
            }}
          >
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px' }}>{getAgentStatusIcon(agentProgressData.status)}</span>
                <Text strong style={{ color: getAgentStatusColor(agentProgressData.status) }}>
                  {agentProgressData.agentName || '智能体'}
                </Text>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {new Date(agentProgressData.timestamp).toLocaleTimeString()}
                </Text>
              </div>
              
              <div style={{ 
                padding: '8px 12px',
                backgroundColor: '#f0f9ff',
                borderRadius: '6px',
                border: '1px solid #bfdbfe'
              }}>
                <Text style={{ fontSize: '13px', color: '#1e40af' }}>
                  {agentProgressData.task || '正在执行任务...'}
                </Text>
                
                {agentProgressData.details && (
                  <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: '4px', fontStyle: 'italic' }}>
                    {agentProgressData.details}
                  </Text>
                )}
              </div>
              
              {agentProgressData.results && (
                <div style={{ 
                  padding: '6px 10px',
                  backgroundColor: '#f0fdf4',
                  borderRadius: '4px',
                  border: '1px solid #bbf7d0'
                }}>
                  <Text style={{ fontSize: '12px', color: '#059669' }}>
                    ✓ {typeof agentProgressData.summary === 'string' ? agentProgressData.summary : 
                       typeof agentProgressData.summary === 'object' && agentProgressData.summary ? 
                       (agentProgressData.summary.execution_overview || JSON.stringify(agentProgressData.summary)) : 
                       '执行完成'}
                  </Text>
                  {agentProgressData.results.llmCalls && (
                    <Text type="secondary" style={{ fontSize: '11px', marginLeft: '8px' }}>
                      LLM调用: {agentProgressData.results.llmCalls}次
                    </Text>
                  )}
                </div>
              )}
              
              {agentProgressData.error && (
                <div style={{ 
                  padding: '6px 10px',
                  backgroundColor: '#fef2f2',
                  borderRadius: '4px',
                  border: '1px solid #fecaca'
                }}>
                  <Text type="danger" style={{ fontSize: '12px' }}>
                    ✗ {agentProgressData.error}
                  </Text>
                </div>
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
      <div className="messages-container" style={{ 
        padding: '20px'
      }}>
        {messages.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px 20px',
            color: '#8c8c8c'
          }}>
            <RobotOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
            <div>
              <Text strong style={{ fontSize: '16px' }}>欢迎使用 Nexus Mind</Text>
              <br />
              <Text type="secondary">我可以帮助您完成各种任务，请告诉我您需要什么帮助。</Text>
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div key={message.id || index} style={{ marginBottom: '16px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: message.type === 'user' ? 'flex-end' : 'flex-start',
              gap: '12px'
            }}>
              {message.type !== 'user' && renderAvatar(message)}
              
              <div style={{ 
                maxWidth: message.type === 'user' ? '80%' : '100%',
                minWidth: message.type === 'user' ? 'auto' : '200px',
              }}>
                {message.type === 'user' ? (
                  <div style={{
                    backgroundColor: '#1890ff',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '18px',
                    fontSize: '14px',
                    lineHeight: '1.4'
                  }}>
                    {message.content}
                  </div>
                ) : (
                  renderMessageContent(message)
                )}
                
                {message.timestamp && (
                  <div style={{ 
                    textAlign: message.type === 'user' ? 'right' : 'left',
                    marginTop: '4px'
                  }}>
                    <Text type="secondary" style={{ fontSize: '11px' }}>
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </Text>
                  </div>
                )}
              </div>
              
              {message.type === 'user' && renderAvatar(message)}
            </div>
          </div>
        ))}

        {(isProcessing || (streamingMessage && streamingMessage.isStreaming)) && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'flex-start',
              gap: '12px'
            }}>
              <Avatar icon={<RobotOutlined />} style={{ backgroundColor: '#52c41a' }} />
              
              {/* 如果有流式消息内容，显示实时内容，否则显示状态提示 */}
              {streamingMessage && streamingMessage.content ? (
                <div style={{ 
                  maxWidth: '90%',
                  minWidth: '200px'
                }}>
                  <Card 
                    size="small" 
                    style={{ 
                      backgroundColor: '#f6f6f6',
                      padding: '8px 16px'
                    }}
                    bodyStyle={{ 
                      padding: '10px',
                      lineHeight: '1.6'
                    }}
                  >
                    <MarkdownRenderer 
                      content={streamingMessage.content} 
                      showCursor={true}
                    />
                  </Card>
                  
                  {/* 显示"正在生成..."状态 */}
                  <div style={{ 
                    marginTop: '4px',
                    textAlign: 'left'
                  }}>
                    <Text type="secondary" style={{ fontSize: '11px' }}>
                      <Spin size="small" style={{ marginRight: '4px' }} />
                      正在生成...
                    </Text>
                  </div>
                </div>
              ) : (
                <div style={{ 
                  padding: '8px 16px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <Spin size="small" />
                  <Text style={{ fontSize: '14px', color: '#666' }}>
                    {streamingMessage ? '正在回答...' : '正在思考...'}
                  </Text>
                </div>
              )}
            </div>
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
            placeholder="输入您的问题..."
            autoSize={{ minRows: 1, maxRows: 4 }}
            disabled={isProcessing}
            style={{ 
              resize: 'none',
              borderRadius: '20px 0 0 20px',
              borderRight: 'none'
            }}
          />
          
          <div style={{ display: 'flex', gap: '8px' }}>
            {streamingMessage && (
              <Button
                type="default"
                icon={<StopOutlined />}
                onClick={onAbort}
                style={{
                  borderRadius: '0',
                  borderLeft: 'none',
                  borderRight: 'none'
                }}
                title="停止生成"
              />
            )}
            
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSend}
              loading={isProcessing && !(streamingMessage && streamingMessage.isStreaming)}
              disabled={!inputValue.trim() || isProcessing}
              style={{
                borderRadius: streamingMessage ? '0 20px 20px 0' : '0 20px 20px 0',
                borderLeft: 'none'
              }}
            />
          </div>
        </Space.Compact>
        
        <div style={{ 
          marginTop: '8px', 
          textAlign: 'center'
        }}>
          <Button 
            type="text" 
            size="small" 
            style={{ fontSize: '12px', color: '#8c8c8c' }}
          >
            清空对话
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;