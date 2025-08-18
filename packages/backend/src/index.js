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
let universalAgent = null;
let mcpServerManager = null;

try {
  // 尝试不同的导入路径
  let Agent, UniversalAgent, MCPServerManager;
  try {
    const agentModule = await import('../../../src/core/Agent.js');
    const universalAgentModule = await import('../../../src/core/UniversalAgent.js');
    const mcpModule = await import('../../../src/mcp/MCPServerManager.js');
    Agent = agentModule.Agent;
    UniversalAgent = universalAgentModule.UniversalAgent;
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
  
  // 创建通用智能体实例
  universalAgent = new UniversalAgent({
    name: 'UniversalAgent',
    maxIterations: 15,
    collaborationEnabled: true
  });
  
  // 设置MCP服务器管理器到Agent
  agent.setMCPServerManager(mcpServerManager);
  universalAgent.setMCPServerManager(mcpServerManager);
  
  // 注册网页抓取工具
  await registerWebScrapingTools(agent);
  
  // 注册股票投资工具
  await registerStockInvestmentTools(agent);
  
  // 注册通用智能体工具
  await registerUniversalAgentTools(universalAgent);
  
  // 加载MCP服务器配置
  await loadMCPServers();
  
  // 更新MCP工具列表
  await agent.updateMCPTools();
  await universalAgent.updateMCPTools();
  
  logger.success('Agent和UniversalAgent初始化成功');
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
    
    // 使用默认的高德地图MCP服务器配置
    const servers = {
      'amap': {
        name: '高德地图',
        serverUrl: process.env.MCP_SERVER_URL || 'https://mcp.amap.com/mcp',
        apiKey: process.env.MCP_API_KEY || 'df2d1657542aabd58302835c17737791'
      }
    };
    
    for (const [serverId, config] of Object.entries(servers)) {
      logger.debug(`添加MCP服务器: ${serverId}`);
      await mcpServerManager.addServer(serverId, config);
    }
    
    logger.success(`成功加载 ${Object.keys(servers).length} 个MCP服务器`);
  } catch (error) {
    logger.error('加载MCP服务器配置失败:', error);
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
    
    agent.llm.generate = async function(prompt, options = {}) {
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
      
      // 发送思考完成
      ws.send(JSON.stringify({
        type: 'thinking_complete',
        content: response.content
      }));
      
      return response;
    };

    // 重写工具执行方法以支持流式输出和中止
    agent.tools.execute = async function(toolName, args) {
      // 检查是否被中止
      if (abortController.signal.aborted) {
        throw new Error('任务已被用户中止');
      }

      // 发送工具调用开始
      ws.send(JSON.stringify({
        type: 'tool_start',
        tool: toolName,
        args: args
      }));
      
      try {
        const result = await originalExecute.call(this, toolName, args);
        
        // 检查是否被中止
        if (abortController.signal.aborted) {
          throw new Error('任务已被用户中止');
        }
        
        // 发送工具调用结果
        ws.send(JSON.stringify({
          type: 'tool_result',
          tool: toolName,
          result: result
        }));
        
        return result;
      } catch (error) {
        // 发送工具调用错误
        ws.send(JSON.stringify({
          type: 'tool_error',
          tool: toolName,
          error: error.message
        }));
        
        throw error;
      }
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

// 导入网页抓取路由和工具
import webScrapingRouter from './routes/webScraping.js';
import { webScrapingTools } from './tools/webScrapingTools.js';
import { stockInvestmentTools, registerStockInvestmentTools } from './tools/stockInvestmentTools.js';

// REST API路由
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    agent: agent ? agent.getStatus() : { error: 'Agent未初始化' }
  });
});

// 网页抓取路由
app.use('/api/web-scraping', webScrapingRouter);

app.get('/api/agent/status', (req, res) => {
  if (!agent) {
    res.json({ error: 'Agent未初始化' });
    return;
  }
  res.json(agent.getStatus());
});

app.post('/api/agent/reset', (req, res) => {
  if (!agent) {
    res.json({ error: 'Agent未初始化' });
    return;
  }
  agent.reset();
  res.json({
    message: 'Agent已重置',
    status: agent.getStatus()
  });
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

// 注册通用智能体工具
async function registerUniversalAgentTools(universalAgent) {
  try {
    logger.info('注册通用智能体工具...');
    
    // 导入通用智能体工具注册器
    const { UniversalAgentToolRegistry } = await import('../../../src/tools/universalAgentToolRegistry.js');
    const toolRegistry = new UniversalAgentToolRegistry();
    
    // 注册工具到通用智能体
    await toolRegistry.registerToolsToAgent(universalAgent);
    
    // 为专门的Agent也注册工具
    for (const [role, agent] of Object.entries(universalAgent.specializedAgents)) {
      await toolRegistry.registerToolsToAgent(agent);
    }
    
    logger.success('通用智能体工具注册完成');
  } catch (error) {
    logger.error('通用智能体工具注册失败:', error);
  }
} 