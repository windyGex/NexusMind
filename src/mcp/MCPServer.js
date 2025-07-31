import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';

/**
 * MCP (Model Context Protocol) 服务器
 * 实现MCP协议，支持与外部工具的通信
 */
export class MCPServer {
  constructor(config = {}) {
    this.port = config.port || 3001;
    this.host = config.host || 'localhost';
    this.server = null;
    this.clients = new Map();
    this.resources = new Map();
    this.tools = new Map();
    
    this.initializeDefaultResources();
  }

  /**
   * 启动MCP服务器
   */
  async start() {
    return new Promise((resolve, reject) => {
      try {
        this.server = new WebSocketServer({
          port: this.port,
          host: this.host
        });

        this.server.on('connection', (ws, req) => {
          this.handleConnection(ws, req);
        });

        this.server.on('error', (error) => {
          console.error('MCP Server error:', error);
          reject(error);
        });

        this.server.on('listening', () => {
          console.log(`MCP Server started on ws://${this.host}:${this.port}`);
          resolve();
        });

      } catch (error) {
        console.error('Failed to start MCP server:', error);
        reject(error);
      }
    });
  }

  /**
   * 停止MCP服务器
   */
  async stop() {
    if (this.server) {
      this.server.close();
      this.server = null;
      console.log('MCP Server stopped');
    }
  }

  /**
   * 处理客户端连接
   */
  handleConnection(ws, req) {
    const clientId = uuidv4();
    const client = {
      id: clientId,
      ws,
      connected: true,
      capabilities: new Set(),
      resources: new Set()
    };

    this.clients.set(clientId, client);

    console.log(`MCP client connected: ${clientId}`);

    // 发送初始化消息
    this.sendMessage(clientId, {
      jsonrpc: '2.0',
      id: uuidv4(),
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
          resources: {},
          prompts: {}
        },
        clientInfo: {
          name: 'AutoAgent',
          version: '1.0.0'
        }
      }
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleMessage(clientId, message);
      } catch (error) {
        console.error('Failed to parse MCP message:', error);
        this.sendError(clientId, null, -32700, 'Parse error', error.message);
      }
    });

    ws.on('close', () => {
      this.handleDisconnection(clientId);
    });

    ws.on('error', (error) => {
      console.error(`MCP client error ${clientId}:`, error);
      this.handleDisconnection(clientId);
    });
  }

  /**
   * 处理客户端断开连接
   */
  handleDisconnection(clientId) {
    const client = this.clients.get(clientId);
    if (client) {
      client.connected = false;
      this.clients.delete(clientId);
      console.log(`MCP client disconnected: ${clientId}`);
    }
  }

  /**
   * 处理MCP消息
   */
  async handleMessage(clientId, message) {
    const { method, params, id } = message;

    try {
      switch (method) {
        case 'initialize':
          await this.handleInitialize(clientId, params, id);
          break;

        case 'tools/list':
          await this.handleToolsList(clientId, params, id);
          break;

        case 'tools/call':
          await this.handleToolsCall(clientId, params, id);
          break;

        case 'resources/list':
          await this.handleResourcesList(clientId, params, id);
          break;

        case 'resources/read':
          await this.handleResourcesRead(clientId, params, id);
          break;

        case 'resources/subscribe':
          await this.handleResourcesSubscribe(clientId, params, id);
          break;

        case 'prompts/list':
          await this.handlePromptsList(clientId, params, id);
          break;

        case 'prompts/get':
          await this.handlePromptsGet(clientId, params, id);
          break;

        default:
          this.sendError(clientId, id, -32601, 'Method not found', `Unknown method: ${method}`);
      }
    } catch (error) {
      console.error(`Error handling MCP message ${method}:`, error);
      this.sendError(clientId, id, -32603, 'Internal error', error.message);
    }
  }

  /**
   * 处理初始化请求
   */
  async handleInitialize(clientId, params, id) {
    const client = this.clients.get(clientId);
    if (!client) return;

    // 记录客户端能力
    if (params.capabilities) {
      Object.keys(params.capabilities).forEach(capability => {
        client.capabilities.add(capability);
      });
    }

    this.sendResponse(clientId, id, {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {
          listChanged: true
        },
        resources: {
          listChanged: true,
          subscribe: true
        },
        prompts: {
          listChanged: true
        }
      },
      serverInfo: {
        name: 'AutoAgent MCP Server',
        version: '1.0.0'
      }
    });
  }

  /**
   * 处理工具列表请求
   */
  async handleToolsList(clientId, params, id) {
    const tools = Array.from(this.tools.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    }));

    this.sendResponse(clientId, id, { tools });
  }

  /**
   * 处理工具调用请求
   */
  async handleToolsCall(clientId, params, id) {
    const { name, arguments: args } = params;
    const tool = this.tools.get(name);

    if (!tool) {
      this.sendError(clientId, id, -32601, 'Tool not found', `Tool '${name}' not found`);
      return;
    }

    try {
      const result = await tool.execute(args);
      this.sendResponse(clientId, id, {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result)
          }
        ]
      });
    } catch (error) {
      this.sendError(clientId, id, -32603, 'Tool execution failed', error.message);
    }
  }

  /**
   * 处理资源列表请求
   */
  async handleResourcesList(clientId, params, id) {
    const resources = Array.from(this.resources.values()).map(resource => ({
      uri: resource.uri,
      name: resource.name,
      description: resource.description,
      mimeType: resource.mimeType
    }));

    this.sendResponse(clientId, id, { resources });
  }

  /**
   * 处理资源读取请求
   */
  async handleResourcesRead(clientId, params, id) {
    const { uri } = params;
    const resource = this.resources.get(uri);

    if (!resource) {
      this.sendError(clientId, id, -32601, 'Resource not found', `Resource '${uri}' not found`);
      return;
    }

    try {
      const content = await resource.getContent();
      this.sendResponse(clientId, id, {
        contents: [
          {
            uri,
            mimeType: resource.mimeType,
            text: content
          }
        ]
      });
    } catch (error) {
      this.sendError(clientId, id, -32603, 'Resource read failed', error.message);
    }
  }

  /**
   * 处理资源订阅请求
   */
  async handleResourcesSubscribe(clientId, params, id) {
    const { uris } = params;
    const client = this.clients.get(clientId);
    
    if (!client) return;

    uris.forEach(uri => {
      client.resources.add(uri);
    });

    this.sendResponse(clientId, id, {});
  }

  /**
   * 处理提示列表请求
   */
  async handlePromptsList(clientId, params, id) {
    // 实现提示列表功能
    this.sendResponse(clientId, id, { prompts: [] });
  }

  /**
   * 处理提示获取请求
   */
  async handlePromptsGet(clientId, params, id) {
    // 实现提示获取功能
    this.sendError(clientId, id, -32601, 'Not implemented', 'Prompts not implemented');
  }

  /**
   * 发送响应
   */
  sendResponse(clientId, id, result) {
    const client = this.clients.get(clientId);
    if (!client || !client.connected) return;

    const message = {
      jsonrpc: '2.0',
      id,
      result
    };

    client.ws.send(JSON.stringify(message));
  }

  /**
   * 发送错误响应
   */
  sendError(clientId, id, code, message, data = null) {
    const client = this.clients.get(clientId);
    if (!client || !client.connected) return;

    const errorMessage = {
      jsonrpc: '2.0',
      id,
      error: {
        code,
        message,
        data
      }
    };

    client.ws.send(JSON.stringify(errorMessage));
  }

  /**
   * 发送通知
   */
  sendNotification(clientId, method, params) {
    const client = this.clients.get(clientId);
    if (!client || !client.connected) return;

    const message = {
      jsonrpc: '2.0',
      method,
      params
    };

    client.ws.send(JSON.stringify(message));
  }

  /**
   * 广播消息给所有客户端
   */
  broadcast(method, params) {
    this.clients.forEach((client, clientId) => {
      if (client.connected) {
        this.sendNotification(clientId, method, params);
      }
    });
  }

  /**
   * 注册工具
   */
  registerTool(name, toolDefinition) {
    this.tools.set(name, toolDefinition);
    
    // 通知客户端工具列表已更改
    this.broadcast('tools/listChanged', {});
    
    console.log(`MCP tool registered: ${name}`);
  }

  /**
   * 注册资源
   */
  registerResource(uri, resourceDefinition) {
    this.resources.set(uri, resourceDefinition);
    
    // 通知客户端资源列表已更改
    this.broadcast('resources/listChanged', {});
    
    console.log(`MCP resource registered: ${uri}`);
  }

  /**
   * 初始化默认资源
   */
  initializeDefaultResources() {
    // 注册一些默认资源
    this.registerResource('file:///agent/status', {
      uri: 'file:///agent/status',
      name: 'Agent Status',
      description: 'Current agent status and statistics',
      mimeType: 'application/json',
      getContent: async () => {
        return JSON.stringify({
          status: 'running',
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }, null, 2);
      }
    });

    this.registerResource('file:///agent/memory', {
      uri: 'file:///agent/memory',
      name: 'Agent Memory',
      description: 'Current agent memory contents',
      mimeType: 'application/json',
      getContent: async () => {
        return JSON.stringify({
          memorySize: 0,
          memoryTypes: ['conversation', 'reasoning', 'task', 'tool_usage'],
          timestamp: new Date().toISOString()
        }, null, 2);
      }
    });
  }

  /**
   * 获取服务器状态
   */
  getStatus() {
    return {
      host: this.host,
      port: this.port,
      connectedClients: this.clients.size,
      registeredTools: this.tools.size,
      registeredResources: this.resources.size,
      isRunning: this.server !== null
    };
  }
} 