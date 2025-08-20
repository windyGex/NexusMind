import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import logger from './utils/logger.js';

// 加载环境变量
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// 中间件
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// 根据环境配置日志中间件
if (process.env.NODE_ENV === 'development' && !process.env.QUIET) {
  app.use(morgan('dev'));
} else if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined'));
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 检查OpenAI API密钥
if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sk-your-openai-api-key-here') {
  logger.warn('OpenAI API密钥未配置，Agent功能将受限');
  logger.info('请设置 OPENAI_API_KEY 环境变量以启用完整功能');
}

// 创建Agent实例（带错误处理）
let agent = null;
let mcpServerManager = null;

try {
  // 尝试不同的导入路径
  let Agent, MCPServerManager;
  try {
    const agentModule = await import('../../../src/core/Agent.js');
    const mcpModule = await import('../../../src/mcp/MCPServerManager.js');
    Agent = agentModule.Agent;
    MCPServerManager = mcpModule.MCPServerManager;
  } catch (e) {
    throw new Error('无法找到Agent或MCP模块');
  }
  
  // 创建MCP服务器管理器
  mcpServerManager = new MCPServerManager({
    maxConnections: 10,
    connectionTimeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000
  });
  
  // 创建基础Agent实例
  agent = new Agent({
    name: 'AutoAgent',
    maxIterations: 10,
    collaborationEnabled: false
  });
  
  // 设置MCP服务器管理器到Agent
  agent.setMCPServerManager(mcpServerManager);
  
  // 注册网页抓取工具到主Agent（用于联网搜索）
  await registerWebScrapingTools(agent);
  
  // 注册股票投资工具
  await registerStockInvestmentTools(agent);
  
  // 加载MCP服务器配置
  await loadMCPServers();
  
  // 更新MCP工具列表
  await agent.updateMCPTools();
  
  logger.success('Agent初始化成功');
} catch (error) {
  logger.error('Agent初始化失败:', error);
  logger.info('Agent功能将不可用，但服务器仍可启动');
}

// 注册网页抓取工具到智能体
async function registerWebScrapingTools(agent) {
  try {
    logger.info('注册网页抓取工具...');
    
    for (const tool of webScrapingTools) {
      agent.tools.registerTool(tool.name, {
        name: tool.name,
        description: tool.description,
        category: 'web-scraping',
        parameters: tool.parameters,
        execute: tool.execute
      });
      logger.debug(`已注册网页抓取工具: ${tool.name}`);
    }
    
    logger.success(`成功注册了 ${webScrapingTools.length} 个网页抓取工具`);
  } catch (error) {
    logger.error('注册网页抓取工具失败:', error);
  }
}

// 加载MCP服务器配置
async function loadMCPServers() {
  try {
    logger.info('加载MCP服务器配置...');
    
    // 从配置文件加载MCP服务器配置
    const { mcpConfigService } = await import('./services/mcpConfigService.js');
    const config = await mcpConfigService.loadConfig();
    
    for (const serverConfig of config.servers) {
      logger.debug(`添加MCP服务器: ${serverConfig.id}`);
      await mcpServerManager.addServer(serverConfig.id, {
        name: serverConfig.name,
        serverUrl: serverConfig.serverUrl,
        apiKey: serverConfig.apiKey,
        type: serverConfig.type
      });
    }
    
    logger.success(`成功加载 ${config.servers.length} 个MCP服务器`);
  } catch (error) {
    logger.error('加载MCP服务器配置失败:', error);
  }
}

// 重新加载MCP服务器配置
async function reloadMCPServers() {
  try {
    logger.info('重新加载MCP服务器配置...');
    
    // 清除现有的MCP服务器
    if (mcpServerManager) {
      await mcpServerManager.disconnectAll();
      mcpServerManager.clearServers();
    }
    
    // 重新加载配置
    await loadMCPServers();
    
    // 更新Agent的MCP工具列表
    if (agent) {
      await agent.updateMCPTools();
    }
    
    logger.success('MCP服务器配置重新加载完成');
    return true;
  } catch (error) {
    logger.error('重新加载MCP服务器配置失败:', error);
    return false;
  }
}

// 存储连接的客户端和当前任务状态
const clients = new Map();
const clientTasks = new Map(); // 存储每个客户端的当前任务状态

// WebSocket连接处理
wss.on('connection', (ws, req) => {
  const clientId = Math.random().toString(36).substr(2, 9);
  clients.set(clientId, ws);
  clientTasks.set(clientId, { isProcessing: false, abortController: null });
  
  logger.debug(`客户端连接: ${clientId}`);
  
  // 发送连接确认
  ws.send(JSON.stringify({
    type: 'connection',
    clientId,
    message: '连接成功'
  }));

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'chat':
          await handleChatMessage(ws, data, clientId);
          break;
        case 'abort':
          await handleAbortMessage(ws, clientId);
          break;
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
        default:
          logger.debug('未知消息类型:', data.type);
      }
    } catch (error) {
      logger.error('WebSocket消息处理错误:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: '消息处理失败'
      }));
    }
  });

  ws.on('close', () => {
    // 清理客户端资源
    const taskState = clientTasks.get(clientId);
    if (taskState && taskState.abortController) {
      taskState.abortController.abort();
    }
    clients.delete(clientId);
    clientTasks.delete(clientId);
    logger.debug(`客户端断开连接: ${clientId}`);
  });

  ws.on('error', (error) => {
    logger.error('WebSocket错误:', error);
    const taskState = clientTasks.get(clientId);
    if (taskState && taskState.abortController) {
      taskState.abortController.abort();
    }
    clients.delete(clientId);
    clientTasks.delete(clientId);
  });
});

// 处理中止消息
async function handleAbortMessage(ws, clientId) {
  const taskState = clientTasks.get(clientId);
  if (!taskState) {
    return;
  }

  logger.debug(`客户端 ${clientId} 请求中止任务`);

  if (taskState.isProcessing && taskState.abortController) {
    taskState.abortController.abort();
    taskState.isProcessing = false;
    taskState.abortController = null;

    ws.send(JSON.stringify({
      type: 'abort_success',
      message: '任务已中止'
    }));

    logger.debug(`任务已中止: ${clientId}`);
  } else {
    ws.send(JSON.stringify({
      type: 'abort_error',
      message: '没有正在执行的任务'
    }));
  }
}

// 处理聊天消息
async function handleChatMessage(ws, data, clientId) {
  const { message, context = {}, agentType = 'standard' } = data;
  
  logger.debug(`收到消息: ${message} (Agent类型: ${agentType})`);
  
  // 根据agentType选择使用哪个Agent
  let targetAgent = agent;
  if (agentType === 'universal' && universalAgent) {
    targetAgent = universalAgent;
  } else if (agentType === 'universal' && !universalAgent) {
    ws.send(JSON.stringify({
      type: 'error',
      message: '通用智能体未初始化，请检查配置'
    }));
    return;
  } else if (!agent) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Agent未初始化，请检查OpenAI API密钥配置'
    }));
    return;
  }

  // 获取客户端任务状态
  const taskState = clientTasks.get(clientId);
  if (!taskState) {
    ws.send(JSON.stringify({
      type: 'error',
      message: '客户端状态异常'
    }));
    return;
  }

  // 如果已有任务在执行，先中止并等待一小段时间确保清理完成
  if (taskState.isProcessing && taskState.abortController) {
    taskState.abortController.abort();
    // 等待一小段时间确保中止信号传播完成
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // 创建新的AbortController
  const abortController = new AbortController();
  taskState.isProcessing = true;
  taskState.abortController = abortController;
  
  // 发送开始处理的消息
  ws.send(JSON.stringify({
    type: 'agent_start',
    message: '开始处理您的请求...'
  }));

  // 保存原始方法引用
  const originalGenerate = agent.llm.generate;
  const originalExecute = agent.tools.execute;
  
  try {
    // 创建一个自定义的LLM客户端来支持流式输出和中止
    let streamBuffer = '';
    
    agent.llm.generate = async function(prompt, options = {needSendToFrontend: true}) {
      // 检查是否被中止
      if (abortController.signal.aborted) {
        throw new Error('任务已被用户中止');
      }
        // 发送思考过程
      ws.send(JSON.stringify({
        type: 'thinking',
        content: '正在分析您的问题...'
      }));
      // 调用原始的generate方法
      const response = await originalGenerate.call(this, prompt, options);
      
      // 检查是否被中止
      if (abortController.signal.aborted) {
        throw new Error('任务已被用户中止');
      }
      if(options.needSendToFrontend){
        // 发送思考完成
        ws.send(JSON.stringify({
          type: 'thinking_complete',
          content: response.content
        }));
      }
      
      return response;
    };

    // 重写工具执行方法以支持流式输出和中止
    agent.tools.execute = async function(toolName, args) {
      // 检查是否被中止
      if (abortController.signal.aborted) {
        throw new Error('任务已被用户中止');
      }

      // 发送工具调用开始
      console.log(`🔧 发送 tool_start 消息: ${toolName}`, args);
      ws.send(JSON.stringify({
        type: 'tool_start',
        tool: toolName,
        args: args
      }));
      
      try {
        // 检查是否为MCP工具且支持流式响应
        const toolInfo = agent.tools.getTool(toolName);
        const isMCPTool = toolInfo && toolInfo.mcpMetadata;
        const isStreamableTool = isMCPTool && (
          toolInfo.mcpMetadata.type === 'streamable-http' ||
          toolInfo.mcpMetadata.streamable === true
        );
        
        if (isStreamableTool && agent.mcpServerManager) {
          // 使用流式调用
          console.log(`🌊 使用流式调用: ${toolName}`);
          
          let streamDataCount = 0;
          const result = await agent.mcpServerManager.callStreamableTool(
            toolInfo.mcpMetadata.serverId,
            toolName,
            args,
            {
              onStreamData: (data) => {
                streamDataCount++;
                console.log(`📦 流数据 ${streamDataCount}:`, data);
                
                // 检查是否被中止
                if (abortController.signal.aborted) {
                  throw new Error('任务已被用户中止');
                }
                
                // 发送流数据到前端
                ws.send(JSON.stringify({
                  type: 'tool_stream_data',
                  tool: toolName,
                  data: data,
                  sequence: streamDataCount
                }));
              },
              onProgress: (progress) => {
                console.log(`📈 进度更新:`, progress);
                
                // 发送进度更新到前端
                ws.send(JSON.stringify({
                  type: 'tool_progress',
                  tool: toolName,
                  progress: progress
                }));
              },
              onComplete: (completeData) => {
                console.log(`✅ 流式调用完成:`, completeData);
                
                // 发送完成通知到前端
                ws.send(JSON.stringify({
                  type: 'tool_stream_complete',
                  tool: toolName,
                  data: completeData
                }));
              },
              onError: (error) => {
                console.log(`❌ 流式调用错误:`, error);
                
                // 发送错误到前端
                ws.send(JSON.stringify({
                  type: 'tool_stream_error',
                  tool: toolName,
                  error: error
                }));
              }
            }
          );
          
          // 检查是否被中止
          if (abortController.signal.aborted) {
            throw new Error('任务已被用户中止');
          }
          
          // 发送最终结果
          console.log(`✅ 发送 tool_result 消息: ${toolName} (流式)`, result);
          ws.send(JSON.stringify({
            type: 'tool_result',
            tool: toolName,
            result: result,
            streamable: true,
            streamDataCount: streamDataCount
          }));
          
          return result;
        } else {
          // 普通调用
          const result = await originalExecute.call(this, toolName, args);
          
          // 检查是否被中止
          if (abortController.signal.aborted) {
            throw new Error('任务已被用户中止');
          }
          
          // 发送工具调用结果
          console.log(`✅ 发送 tool_result 消息: ${toolName}`, result);
          ws.send(JSON.stringify({
            type: 'tool_result',
            tool: toolName,
            result: result
          }));
          
          return result;
        }
      } catch (error) {
        // 发送工具调用错误
        console.log(`❌ 发送 tool_error 消息: ${toolName}`, error.message);
        ws.send(JSON.stringify({
          type: 'tool_error',
          tool: toolName,
          error: error.message
        }));
        
        throw error;
      }
    };

    // 设置Plan & Solve状态更新回调
    targetAgent.onPlanSolveUpdate = (update) => {
      ws.send(JSON.stringify({
        type: 'plan_solve_update',
        ...update
      }));
    };

    // 处理用户输入
    let response;
    if (agentType === 'universal') {
      // 使用通用智能体的特殊处理方法
      response = await targetAgent.processUniversalRequest(message, context);
      
      // 发送工作流状态更新
      if (response.workflow) {
        ws.send(JSON.stringify({
          type: 'workflow_update',
          phase: response.workflow.currentPhase,
          progress: targetAgent.calculateProgress(),
          data: response.workflow
        }));
      }
    } else {
      // 使用标准Agent的处理方法
      response = await targetAgent.processInput(message, context);
    }
    
    // 检查是否被中止
    if (abortController.signal.aborted) {
      throw new Error('任务已被用户中止');
    }
    
    // 发送最终响应
    ws.send(JSON.stringify({
      type: 'agent_response',
      content: agentType === 'universal' ? 
        (response.success ? (response.report?.content || '报告生成失败') : response.error || '处理失败') : 
        response,
      metadata: agentType === 'universal' ? {
        success: response.success,
        workflow: response.workflow,
        report: response.report,
        error: response.error
      } : undefined,
      timestamp: new Date().toISOString()
    }));

    // 恢复原始方法
    agent.llm.generate = originalGenerate;
    agent.tools.execute = originalExecute;

    // 清理任务状态
    taskState.isProcessing = false;
    taskState.abortController = null;

  } catch (error) {
    logger.error('Agent处理错误:', error);
    
    // 确保恢复原始方法，即使出错也要恢复
    if (agent && agent.llm) {
      agent.llm.generate = originalGenerate;
    }
    if (agent && agent.tools) {
      agent.tools.execute = originalExecute;
    }
    
    // 清理任务状态
    taskState.isProcessing = false;
    taskState.abortController = null;

    if (error.message === '任务已被用户中止') {
      ws.send(JSON.stringify({
        type: 'aborted',
        message: '任务已被中止'
      }));
    } else {
      ws.send(JSON.stringify({
        type: 'error',
        message: `处理失败: ${error.message}`
      }));
    }
  }
}

// 导入工具
import { webScrapingTools } from './tools/webScrapingTools.js';
import { stockInvestmentTools, registerStockInvestmentTools } from './tools/stockInvestmentTools.js';

// 导入路由
import mcpConfigRouter from './routes/mcpConfig.js';

// 将重新加载函数暴露给路由
app.locals.reloadMCPServers = reloadMCPServers;

// 注册路由
app.use('/api/mcp', mcpConfigRouter);

// REST API路由
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    agent: agent ? agent.getStatus() : { error: 'Agent未初始化' }
  });
});

// 移除了独立的网页抓取路由，功能已整合到智能对话中

app.get('/api/agent/status', (req, res) => {
  if (!agent) {
    res.json({ error: 'Agent未初始化' });
    return;
  }
  res.json(agent.getStatus());
});

// 获取工具列表
app.get('/api/agent/tools', (req, res) => {
  if (!agent) {
    res.json({ error: 'Agent未初始化' });
    return;
  }
  
  try {
    const tools = agent.getAllAvailableTools();
    res.json(tools);
  } catch (error) {
    logger.error('获取工具列表失败:', error);
    res.status(500).json({ error: '获取工具列表失败' });
  }
});

// 获取MCP服务器状态（移动到不同路径避免冲突）
app.get('/api/mcp-status', (req, res) => {
  if (!mcpServerManager) {
    res.json({ error: 'MCP服务器管理器未初始化' });
    return;
  }
  
  try {
    const status = mcpServerManager.getServerStatus();
    res.json(status);
  } catch (error) {
    logger.error('获取MCP状态失败:', error);
    res.status(500).json({ error: '获取MCP状态失败' });
  }
});

// 调试工具注册信息
app.get('/api/debug/tools', (req, res) => {
  if (!agent) {
    res.json({ error: 'Agent未初始化' });
    return;
  }
  
  try {
    const allTools = agent.tools.listAvailable();
    const toolDetails = allTools.map(tool => {
      const toolInfo = agent.tools.getTool(tool.name);
      return {
        name: tool.name,
        description: tool.description,
        category: tool.category,
        mcpMetadata: toolInfo?.mcpMetadata || null
      };
    });
    
    res.json({
      totalTools: allTools.length,
      tools: toolDetails
    });
  } catch (error) {
    logger.error('获取调试工具信息失败:', error);
    res.status(500).json({ error: '获取调试工具信息失败' });
  }
});

// 测试工具调用
app.post('/api/test/tool/:toolName', async (req, res) => {
  if (!agent) {
    res.json({ error: 'Agent未初始化' });
    return;
  }
  
  const { toolName } = req.params;
  const { args = {} } = req.body;
  
  try {
    logger.info(`测试工具调用: ${toolName}`, args);
    const actualToolId = agent.mapToolName(toolName);
    logger.info(`映射后的工具ID: ${actualToolId}`);
    const result = await agent.tools.execute(actualToolId, args);
    res.json({
      success: true,
      toolName,
      args,
      result
    });
  } catch (error) {
    logger.error(`测试工具调用失败: ${toolName}`, error);
    res.status(500).json({
      success: false,
      toolName,
      args,
      error: error.message
    });
  }
});

// 获取支持的思维模式
app.get('/api/agent/thinking-modes', (req, res) => {
  if (!agent) {
    res.json({ error: 'Agent未初始化' });
    return;
  }
  
  try {
    const modes = agent.getSupportedThinkingModes();
    res.json({
      currentMode: agent.thinkingMode,
      supportedModes: modes
    });
  } catch (error) {
    logger.error('获取思维模式失败:', error);
    res.status(500).json({ error: '获取思维模式失败', message: error.message });
  }
});

// 设置思维模式
app.post('/api/agent/thinking-mode', (req, res) => {
  if (!agent) {
    res.json({ error: 'Agent未初始化' });
    return;
  }
  
  const { mode } = req.body;
  if (!mode) {
    res.status(400).json({ error: '缺少思维模式参数' });
    return;
  }
  
  try {
    const result = agent.setThinkingMode(mode);
    logger.info(`思维模式已切换: ${result.oldMode} -> ${result.newMode}`);
    res.json({
      success: true,
      message: `思维模式已从 ${result.oldMode} 切换到 ${result.newMode}`,
      ...result
    });
  } catch (error) {
    logger.error('设置思维模式失败:', error);
    res.status(400).json({ error: '设置思维模式失败', message: error.message });
  }
});

app.post('/api/agent/reset', (req, res) => {
  if (!agent) {
    res.json({ error: 'Agent未初始化' });
    return;
  }
  
  try {
    agent.resetConversation();
    res.json({
      message: '对话上下文已重置',
      status: agent.getStatus()
    });
  } catch (error) {
    logger.error('重置对话失败:', error);
    res.status(500).json({ error: '重置对话失败' });
  }
});

app.get('/api/agent/tools', (req, res) => {
  if (!agent) {
    res.json({ error: 'Agent未初始化' });
    return;
  }
  const tools = agent.getAllAvailableTools();
  res.json(tools);
});

app.get('/api/agent/mcp-stats', (req, res) => {
  if (!agent) {
    res.json({ error: 'Agent未初始化' });
    return;
  }
  const stats = agent.getMCPToolStats();
  res.json(stats);
});

// 新增：获取MCP工具列表
app.get('/api/agent/mcp-tools', (req, res) => {
  if (!agent) {
    res.json({ error: 'Agent未初始化' });
    return;
  }
  
  try {
    const allTools = agent.getAllAvailableTools();
    const mcpTools = allTools.mcp || [];
    
    // 按服务器分组
    const toolsByServer = {};
    mcpTools.forEach(tool => {
      const serverId = tool.serverId || 'unknown';
      if (!toolsByServer[serverId]) {
        toolsByServer[serverId] = {
          serverId,
          serverName: tool.serverName || serverId,
          tools: []
        };
      }
      toolsByServer[serverId].tools.push({
        name: tool.name,
        description: tool.description || `MCP工具: ${tool.name}`,
        type: 'mcp'
      });
    });
    
    res.json({
      servers: Object.values(toolsByServer),
      totalTools: mcpTools.length,
      totalServers: Object.keys(toolsByServer).length
    });
  } catch (error) {
    logger.error('获取MCP工具失败:', error);
    res.status(500).json({ error: '获取MCP工具失败', message: error.message });
  }
});

// 新增：获取本地工具列表
app.get('/api/agent/local-tools', (req, res) => {
  if (!agent) {
    res.json({ error: 'Agent未初始化' });
    return;
  }
  
  try {
    const allTools = agent.getAllAvailableTools();
    const localTools = allTools.local || [];
    
    res.json({
      tools: localTools.map(tool => ({
        name: tool.name,
        description: tool.description || `本地工具: ${tool.name}`,
        category: tool.category || 'utility',
        type: 'local'
      })),
      totalTools: localTools.length
    });
  } catch (error) {
    logger.error('获取本地工具失败:', error);
    res.status(500).json({ error: '获取本地工具失败', message: error.message });
  }
});

// 通用智能体相关API
app.get('/api/universal-agent/status', (req, res) => {
  if (!universalAgent) {
    res.json({ error: '通用智能体未初始化' });
    return;
  }
  
  try {
    const status = universalAgent.getWorkflowStatus();
    res.json({
      status: 'active',
      workflow: status,
      agents: status.agents,
      stats: status.stats
    });
  } catch (error) {
    logger.error('获取通用智能体状态失败:', error);
    res.status(500).json({ error: '获取通用智能体状态失败', message: error.message });
  }
});

app.get('/api/universal-agent/tools', (req, res) => {
  if (!universalAgent) {
    res.json({ error: '通用智能体未初始化' });
    return;
  }
  
  try {
    const tools = universalAgent.getAllAvailableTools();
    res.json(tools);
  } catch (error) {
    logger.error('获取通用智能体工具失败:', error);
    res.status(500).json({ error: '获取通用智能体工具失败', message: error.message });
  }
});

app.post('/api/universal-agent/reset', (req, res) => {
  if (!universalAgent) {
    res.json({ error: '通用智能体未初始化' });
    return;
  }
  
  try {
    universalAgent.resetWorkflow();
    res.json({
      message: '通用智能体工作流已重置',
      status: universalAgent.getWorkflowStatus()
    });
  } catch (error) {
    logger.error('重置通用智能体失败:', error);
    res.status(500).json({ error: '重置通用智能体失败', message: error.message });
  }
});

app.get('/api/universal-agent/workflow', (req, res) => {
  if (!universalAgent) {
    res.json({ error: '通用智能体未初始化' });
    return;
  }
  
  try {
    const workflow = universalAgent.workflowState;
    res.json({
      currentPhase: workflow.currentPhase,
      progress: universalAgent.calculateProgress(),
      taskPlan: workflow.taskPlan,
      searchResults: workflow.searchResults.length,
      analysisData: workflow.analysisData.length,
      hasReport: !!workflow.finalReport
    });
  } catch (error) {
    logger.error('获取工作流状态失败:', error);
    res.status(500).json({ error: '获取工作流状态失败', message: error.message });
  }
});

// 错误处理中间件
app.use((err, req, res, next) => {
  logger.error('服务器错误:', err);
  res.status(500).json({
    error: '服务器内部错误',
    message: err.message
  });
});

// 404处理
app.use((req, res) => {
  res.status(404).json({
    error: '未找到',
    message: '请求的资源不存在'
  });
});

const PORT = process.env.PORT || 3002;

server.listen(PORT, () => {
  logger.info(`服务器运行在端口 ${PORT}`);
  logger.info(`WebSocket服务器已启动`);
  logger.info(`健康检查: http://localhost:${PORT}/api/health`);
  if (!agent) {
    logger.warn(`Agent功能受限，请配置OPENAI_API_KEY环境变量`);
  }
});

// 优雅关闭
process.on('SIGTERM', () => {
  logger.info('收到SIGTERM信号，正在关闭服务器...');
  server.close(() => {
    logger.info('服务器已关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('收到SIGINT信号，正在关闭服务器...');
  server.close(() => {
    logger.info('服务器已关闭');
    process.exit(0);
  });
});

// 通用智能体相关功能已移除，网页抓取功能已整合到主Agent中 