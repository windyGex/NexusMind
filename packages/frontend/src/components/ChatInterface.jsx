import React, { useState, useRef, useEffect } from 'react';
import { Input, Button, Card, Avatar, Typography, Space, Spin, Tag, Collapse, Upload, message, Dropdown, Menu } from 'antd';
import { SendOutlined, UserOutlined, RobotOutlined, ToolOutlined, ExclamationCircleOutlined, CheckCircleOutlined, ClockCircleOutlined, StopOutlined, DownOutlined, UploadOutlined, FileOutlined, FolderOutlined, ReloadOutlined } from '@ant-design/icons';
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
  const [fileList, setFileList] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]); // 添加已上传文件列表状态
  const [loadingFiles, setLoadingFiles] = useState(false); // 添加加载状态
  const messagesEndRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  // 优化滚动函数，避免频繁滚动导致的界面跳跃
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView();
    }
  };

  // 节流滚动函数，避免频繁触发
  const throttledScrollToBottom = () => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      scrollToBottom();
    }, 50); // 50ms节流
  };

  useEffect(() => {
    throttledScrollToBottom();
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [messages]);

  // 监听流式消息的变化，实时滚动到底部
  useEffect(() => {
    if (streamingMessage && streamingMessage.content) {
      throttledScrollToBottom();
    }
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
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

  // 文件上传处理
  const handleFileUpload = async () => {
    if (fileList.length === 0) {
      message.warning('请先选择文件');
      return;
    }

    setUploading(true);
    try {
      // 创建FormData对象
      const formData = new FormData();
      fileList.forEach((file) => {
        formData.append('files', file.originFileObj);
      });

      // 发送文件到后端
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        message.success(`成功上传 ${result.uploadedCount} 个文件`);
        setFileList([]);
        
        // 刷新文件列表
        await fetchUploadedFiles();
        
        // 不再发送消息到后端，只在当前会话展示
        // const fileNames = result.files.map(f => f.originalName).join(', ');
        // onSendMessage(`我已上传了以下文件到.nexus-mind目录: ${fileNames}`);
      } else {
        const error = await response.json();
        message.error(`上传失败: ${error.message}`);
      }
    } catch (error) {
      console.error('上传错误:', error);
      message.error('文件上传失败');
    } finally {
      setUploading(false);
    }
  };

  // 文件选择处理
  const handleFileChange = ({ fileList: newFileList }) => {
    setFileList(newFileList);
  };

  // 获取已上传文件列表
  const fetchUploadedFiles = async () => {
    setLoadingFiles(true);
    try {
      const response = await fetch('/api/files/list');
      if (response.ok) {
        const result = await response.json();
        setUploadedFiles(result.files || []);
      } else {
        message.error('获取文件列表失败');
      }
    } catch (error) {
      console.error('获取文件列表错误:', error);
      message.error('获取文件列表失败');
    } finally {
      setLoadingFiles(false);
    }
  };

  // 组件挂载时获取文件列表
  useEffect(() => {
    fetchUploadedFiles();
  }, []);

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
            <MarkdownRenderer content={message.content} isStreaming={message.isStreaming} />
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
              <>
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
                          width: '20px', 
                          height: '20px', 
                          borderRadius: '50%', 
                          backgroundColor: isError 
                            ? '#dc2626' 
                            : isCompleted 
                            ? '#16a34a' 
                            : isCurrentStep 
                            ? '#f59e0b' 
                            : '#d1d5db',
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          marginRight: '8px',
                          fontSize: '10px',
                          color: 'white'
                        }}>
                          {isError ? '✗' : isCompleted ? '✓' : isCurrentStep ? '●' : index + 1}
                        </div>
                        <Text 
                          type={isError ? 'danger' : isCompleted ? 'success' : isCurrentStep ? 'warning' : 'secondary'} 
                          style={{ 
                            fontSize: '12px',
                            textDecoration: isCompleted ? 'line-through' : 'none'
                          }}
                        >
                          {step.description}
                        </Text>
                      </div>
                    );
                  })}
                </div>
                
                {/* 当前步骤信息 */}
                {message.data.currentStepInfo && (
                  <div style={{ 
                    marginTop: '8px',
                    padding: '8px',
                    backgroundColor: '#e0f2fe',
                    borderRadius: '4px',
                    border: '1px solid #bae6fd'
                  }}>
                    <Text type="secondary" style={{ fontSize: '11px' }}>
                      当前步骤: {message.data.currentStepInfo.description}
                    </Text>
                    {message.data.currentStepInfo.status === 'running' && (
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        marginTop: '4px' 
                      }}>
                        <Spin size="small" />
                        <Text type="secondary" style={{ fontSize: '11px', marginLeft: '4px' }}>
                          执行中...
                        </Text>
                      </div>
                    )}
                  </div>
                )}
              </>
            </Card>
          );
        }
        return null;

      default:
        return (
          <Card 
            size="small" 
            style={{ 
              maxWidth: '90%', 
              backgroundColor: '#ffffff',
              padding: '8px 16px'
            }}
            bodyStyle={{ 
              padding: '8px',
              lineHeight: '1.6'
            }}
          >
            <Text style={{ fontSize: '14px', color: '#2c3e50' }}>
              {message.content}
            </Text>
          </Card>
        );
    }
  };

  const renderAvatar = (message) => {
    switch (message.type) {
      case 'user':
        return <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />;
      case 'assistant':
        return <Avatar icon={<RobotOutlined />} style={{ backgroundColor: '#52c41a' }} />;
      case 'thinking':
        return <Avatar icon={<RobotOutlined />} style={{ backgroundColor: '#1890ff' }} />;
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
                      isStreaming={true}
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
        {/* 文件上传区域 */}
        {fileList.length > 0 && (
          <div style={{ 
            marginBottom: '12px',
            padding: '12px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            border: '1px dashed #d9d9d9'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <Text strong style={{ fontSize: '13px' }}>待上传文件</Text>
              <Button 
                type="text" 
                size="small" 
                onClick={() => setFileList([])}
                style={{ fontSize: '12px' }}
              >
                清除
              </Button>
            </div>
            
            <div style={{ 
              maxHeight: '120px', 
              overflowY: 'auto',
              marginBottom: '8px'
            }}>
              {fileList.map((file) => (
                <div 
                  key={file.uid} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '4px 0',
                    fontSize: '12px'
                  }}
                >
                  <FileOutlined style={{ 
                    marginRight: '6px', 
                    color: '#1890ff' 
                  }} />
                  <Text ellipsis style={{ flex: 1 }}>
                    {file.name}
                  </Text>
                  <Text type="secondary" style={{ marginLeft: '8px' }}>
                    {file.size ? `${(file.size / 1024).toFixed(1)}KB` : ''}
                  </Text>
                </div>
              ))}
            </div>
            
            <Button
              type="primary"
              size="small"
              onClick={handleFileUpload}
              loading={uploading}
              style={{ 
                fontSize: '12px',
                height: '28px'
              }}
            >
              上传文件
            </Button>
          </div>
        )}

        <Space.Compact style={{ width: '100%' }}>
          <Upload
            beforeUpload={() => false} // 阻止自动上传
            onChange={handleFileChange}
            fileList={fileList}
            multiple
            showUploadList={false}
            ref={fileInputRef}
          >
            <Button
              icon={<UploadOutlined />}
              style={{
                borderRadius: '20px 0 0 20px',
                borderRight: 'none'
              }}
            />
          </Upload>
          
          {/* 文件列表下拉菜单 */}
          <Dropdown
            overlay={
              <Menu>
                <Menu.Item
                  key="refresh"
                  icon={<ReloadOutlined />}
                  onClick={fetchUploadedFiles}
                >
                  刷新文件列表
                </Menu.Item>
                <Menu.Divider />
                {loadingFiles ? (
                  <Menu.Item key="loading">
                    <Spin size="small" /> 加载中...
                  </Menu.Item>
                ) : uploadedFiles.length > 0 ? (
                  uploadedFiles.map((file) => (
                    <Menu.Item
                      key={file.name}
                      icon={file.isDirectory ? <FolderOutlined /> : <FileOutlined />}
                      title={`${file.name} (${file.isDirectory ? '文件夹' : `${(file.size / 1024).toFixed(1)}KB`})`}
                      onClick={() => {
                        if (!file.isDirectory) {
                          // 下载文件
                          const downloadUrl = `/api/files/download/${encodeURIComponent(file.name)}`;
                          window.open(downloadUrl, '_blank');
                        }
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {file.name}
                        </span>
                        <span style={{ color: '#999', fontSize: '12px' }}>
                          {file.isDirectory ? '文件夹' : `${(file.size / 1024).toFixed(1)}KB`}
                        </span>
                      </div>
                    </Menu.Item>
                  ))
                ) : (
                  <Menu.Item key="empty" disabled>
                    暂无文件
                  </Menu.Item>
                )}
              </Menu>
            }
            trigger={['click']}
          >
            <Button
              icon={<FolderOutlined />}
              style={{
                borderRadius: '0',
                borderRight: 'none'
              }}
            />
          </Dropdown>
          
          <TextArea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入您的问题..."
            autoSize={{ minRows: 1, maxRows: 4 }}
            disabled={isProcessing}
            style={{ 
              resize: 'none',
              borderRadius: '0',
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