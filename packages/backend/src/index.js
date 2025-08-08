import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

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
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 检查OpenAI API密钥
if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sk-your-openai-api-key-here') {
  console.warn('⚠️ 警告: OpenAI API密钥未配置，Agent功能将受限');
  console.log('请设置 OPENAI_API_KEY 环境变量以启用完整功能');
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
  
  // 创建Agent实例
  agent = new Agent({
    name: 'AutoAgent',
    maxIterations: 10,
    collaborationEnabled: false
  });
  
  // 设置MCP服务器管理器到Agent
  agent.setMCPServerManager(mcpServerManager);
  
  // 加载MCP服务器配置
  await loadMCPServers();
  
  // 更新MCP工具列表
  await agent.updateMCPTools();
  
  console.log('✅ Agent初始化成功');
} catch (error) {
  console.error('❌ Agent初始化失败:', error.message);
  console.log('Agent功能将不可用，但服务器仍可启动');
}

// 加载MCP服务器配置
async function loadMCPServers() {
  try {
    console.log('🔗 加载MCP服务器配置...');
    
    // 使用默认的高德地图MCP服务器配置
    const servers = {
      'amap': {
        name: '高德地图',
        serverUrl: process.env.MCP_SERVER_URL || 'https://mcp.amap.com/mcp',
        apiKey: process.env.MCP_API_KEY || 'df2d1657542aabd58302835c17737791'
      }
    };
    
    for (const [serverId, config] of Object.entries(servers)) {
      console.log(`📡 添加MCP服务器: ${serverId}`);
      await mcpServerManager.addServer(serverId, config);
    }
    
    console.log(`✅ 成功加载 ${Object.keys(servers).length} 个MCP服务器`);
  } catch (error) {
    console.error('❌ 加载MCP服务器配置失败:', error);
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
  
  console.log(`客户端连接: ${clientId}`);
  
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
          console.log('未知消息类型:', data.type);
      }
    } catch (error) {
      console.error('WebSocket消息处理错误:', error);
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
    console.log(`客户端断开连接: ${clientId}`);
  });

  ws.on('error', (error) => {
    console.error('WebSocket错误:', error);
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

  console.log(`客户端 ${clientId} 请求中止任务`);

  if (taskState.isProcessing && taskState.abortController) {
    taskState.abortController.abort();
    taskState.isProcessing = false;
    taskState.abortController = null;

    ws.send(JSON.stringify({
      type: 'abort_success',
      message: '任务已中止'
    }));

    console.log(`任务已中止: ${clientId}`);
  } else {
    ws.send(JSON.stringify({
      type: 'abort_error',
      message: '没有正在执行的任务'
    }));
  }
}

// 处理聊天消息
async function handleChatMessage(ws, data, clientId) {
  const { message, context = {} } = data;
  
  console.log(`收到消息: ${message}`);
  
  // 检查Agent是否可用
  if (!agent) {
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
    const response = await agent.processInput(message, context);
    
    // 检查是否被中止
    if (abortController.signal.aborted) {
      throw new Error('任务已被用户中止');
    }
    
    // 发送最终响应
    ws.send(JSON.stringify({
      type: 'agent_response',
      content: response,
      timestamp: new Date().toISOString()
    }));

    // 恢复原始方法
    agent.llm.generate = originalGenerate;
    agent.tools.execute = originalExecute;

    // 清理任务状态
    taskState.isProcessing = false;
    taskState.abortController = null;

  } catch (error) {
    console.error('Agent处理错误:', error);
    
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

// REST API路由
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    agent: agent ? agent.getStatus() : { error: 'Agent未初始化' }
  });
});

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
    console.error('获取MCP工具失败:', error);
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
    console.error('获取本地工具失败:', error);
    res.status(500).json({ error: '获取本地工具失败', message: error.message });
  }
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
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
  console.log(`🚀 服务器运行在端口 ${PORT}`);
  console.log(`📡 WebSocket服务器已启动`);
  console.log(`🔗 健康检查: http://localhost:${PORT}/api/health`);
  if (!agent) {
    console.log(`⚠️  Agent功能受限，请配置OPENAI_API_KEY环境变量`);
  }
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到SIGTERM信号，正在关闭服务器...');
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('收到SIGINT信号，正在关闭服务器...');
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
}); 