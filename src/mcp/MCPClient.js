import { v4 as uuidv4 } from 'uuid';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import logger from '../../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * MCP包管理器
 * 负责发现、安装和管理本地npm包的MCP服务
 */
class MCPPackageManager {
  constructor() {
    this.installedPackages = new Map();
    this.packageRegistry = new Map();
    this.nodeModulesPath = join(process.cwd(), 'node_modules');
  }

  /**
   * 发现本地已安装的MCP包
   */
  async discoverLocalPackages() {
    const packages = [];
    
    if (!existsSync(this.nodeModulesPath)) {
      return packages;
    }

    try {
      const packageDirs = readdirSync(this.nodeModulesPath);
      
      for (const packageDir of packageDirs) {
        const packagePath = join(this.nodeModulesPath, packageDir);
        const packageJsonPath = join(packagePath, 'package.json');
        
        if (existsSync(packageJsonPath)) {
          try {
            const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
            
            // 检查是否包含MCP相关配置
            if (this.isMCPPackage(packageJson)) {
              packages.push({
                name: packageJson.name,
                version: packageJson.version,
                path: packagePath,
                mcpConfig: this.extractMCPConfig(packageJson)
              });
            }
          } catch (error) {
            logger.warn(`Failed to read package.json for ${packageDir}:`, error.message);
          }
        }
      }
    } catch (error) {
      logger.error('Error discovering local packages:', error);
    }

    return packages;
  }

  /**
   * 检查包是否为MCP包
   */
  isMCPPackage(packageJson) {
    return (
      packageJson.mcp ||
      packageJson.keywords?.includes('mcp') ||
      packageJson.keywords?.includes('model-context-protocol') ||
      packageJson.bin?.mcp ||
      (typeof packageJson.main === 'string' && packageJson.main.includes('mcp'))
    );
  }

  /**
   * 提取MCP配置
   */
  extractMCPConfig(packageJson) {
    const config = {
      tools: [],
      resources: [],
      prompts: []
    };

    if (packageJson.mcp) {
      if (packageJson.mcp.tools) {
        config.tools = Array.isArray(packageJson.mcp.tools) 
          ? packageJson.mcp.tools 
          : [packageJson.mcp.tools];
      }
      
      if (packageJson.mcp.resources) {
        config.resources = Array.isArray(packageJson.mcp.resources) 
          ? packageJson.mcp.resources 
          : [packageJson.mcp.resources];
      }
      
      if (packageJson.mcp.prompts) {
        config.prompts = Array.isArray(packageJson.mcp.prompts) 
          ? packageJson.mcp.prompts 
          : [packageJson.mcp.prompts];
      }
    }

    return config;
  }

  /**
   * 安装npm包
   */
  async installPackage(packageName, version = 'latest') {
    return new Promise((resolve, reject) => {
      const installCommand = version === 'latest' ? packageName : `${packageName}@${version}`;
      
      logger.info(`Installing MCP package: ${installCommand}`);
      
      const npm = spawn('npm', ['install', installCommand], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd()
      });

      let stdout = '';
      let stderr = '';

      npm.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      npm.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      npm.on('close', (code) => {
        if (code === 0) {
          logger.success(`Successfully installed ${packageName}`);
          resolve({ success: true, packageName, version });
        } else {
                      logger.error(`Failed to install ${packageName}:`, stderr);
          reject(new Error(`npm install failed with code ${code}: ${stderr}`));
        }
      });

      npm.on('error', (error) => {
        reject(new Error(`Failed to start npm install: ${error.message}`));
      });
    });
  }

  /**
   * 卸载npm包
   */
  async uninstallPackage(packageName) {
    return new Promise((resolve, reject) => {
      logger.info(`Uninstalling MCP package: ${packageName}`);
      
      const npm = spawn('npm', ['uninstall', packageName], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd()
      });

      let stdout = '';
      let stderr = '';

      npm.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      npm.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      npm.on('close', (code) => {
        if (code === 0) {
          logger.success(`Successfully uninstalled ${packageName}`);
          resolve({ success: true, packageName });
        } else {
                      logger.error(`Failed to uninstall ${packageName}:`, stderr);
          reject(new Error(`npm uninstall failed with code ${code}: ${stderr}`));
        }
      });

      npm.on('error', (error) => {
        reject(new Error(`Failed to start npm uninstall: ${error.message}`));
      });
    });
  }

  /**
   * 获取包信息
   */
  async getPackageInfo(packageName) {
    return new Promise((resolve, reject) => {
      const npm = spawn('npm', ['view', packageName, '--json'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd()
      });

      let stdout = '';
      let stderr = '';

      npm.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      npm.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      npm.on('close', (code) => {
        if (code === 0) {
          try {
            const info = JSON.parse(stdout);
            resolve(info);
          } catch (error) {
            reject(new Error(`Failed to parse package info: ${error.message}`));
          }
        } else {
          reject(new Error(`npm view failed with code ${code}: ${stderr}`));
        }
      });

      npm.on('error', (error) => {
        reject(new Error(`Failed to get package info: ${error.message}`));
      });
    });
  }

  /**
   * 搜索MCP包
   */
  async searchMCPPackages(query = 'mcp') {
    return new Promise((resolve, reject) => {
      const npm = spawn('npm', ['search', query, '--json'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd()
      });

      let stdout = '';
      let stderr = '';

      npm.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      npm.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      npm.on('close', (code) => {
        if (code === 0) {
          try {
            const results = JSON.parse(stdout);
            // 过滤出MCP相关的包
            const mcpPackages = results.filter(pkg => 
              pkg.keywords?.some(keyword => 
                keyword.toLowerCase().includes('mcp') || 
                keyword.toLowerCase().includes('model-context-protocol')
              )
            );
            resolve(mcpPackages);
          } catch (error) {
            reject(new Error(`Failed to parse search results: ${error.message}`));
          }
        } else {
          reject(new Error(`npm search failed with code ${code}: ${stderr}`));
        }
      });

      npm.on('error', (error) => {
        reject(new Error(`Failed to search packages: ${error.message}`));
      });
    });
  }
}

/**
 * MCP (Model Context Protocol) 客户端
 * 实现MCP协议客户端，连接远程MCP服务器并支持加载本地MCP包
 */
export class MCPClient {
  constructor(config = {}) {
    this.serverUrl = config.serverUrl || 'https://mcp.amap.com/mcp';
    this.apiKey = config.apiKey || 'df2d1657542aabd58302835c17737791';
    this.serverType = config.type || 'standard'; // 支持 'standard' 和 'streamable-http'
    this.connection = null;
    this.isConnected = false;
    this.sessionId = null; // 会话ID，用于某些需要会话管理的服务器
    this.pendingRequests = new Map();
    this.availableTools = new Map();
    this.availableResources = new Map();
    this.availablePrompts = new Map();
    this.packageManager = new MCPPackageManager();
    this.localTools = new Map();
    this.localResources = new Map();
    this.eventListeners = new Map();
    
    // 构建完整的服务器URL
    this.fullServerUrl = this.buildServerUrl();
  }

  /**
   * 构建完整的服务器URL
   */
  buildServerUrl() {
    const url = new URL(this.serverUrl);
    if (this.apiKey) {
      url.searchParams.set('key', this.apiKey);
    }
    return url.toString();
  }

  /**
   * 连接到MCP服务器
   */
  async connect() {
    try {
      logger.info(`🔗 正在连接到MCP服务器: ${this.fullServerUrl}`);

      // 初始化连接
      const initResult = await this.initialize();
      
      if (initResult.success) {
        this.isConnected = true;
        logger.success('✅ MCP客户端连接成功');
        
        // 获取服务器能力
        await this.loadServerCapabilities();
        
        // 加载本地MCP包
        await this.loadLocalMCPPackages();
        
        return true;
      } else {
        throw new Error(initResult.error || '初始化失败');
      }
    } catch (error) {
      logger.error('❌ MCP客户端连接失败:', error);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * 断开连接
   */
  async disconnect() {
    this.isConnected = false;
    this.connection = null;
    logger.info('🔌 MCP客户端已断开连接');
  }

  /**
   * 初始化MCP连接
   */
  async initialize() {
    const requestId = uuidv4();
    
    const request = {
      jsonrpc: '2.0',
      id: requestId,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
          resources: {},
          prompts: {}
        },
        clientInfo: {
          name: 'NexusMind MCP Client',
          version: '1.0.0'
        }
      }
    };

    try {
      // 根据服务器类型选择处理方式
      const isStreamableServer = this.serverType === 'streamable-http';
      
      const response = await this.sendRequest(request, {
        expectStreamable: isStreamableServer,
        onStreamData: isStreamableServer ? (data) => {
          logger.debug('初始化流数据:', data);
          // 检查是否包含会话ID
          if (data.sessionId) {
            this.sessionId = data.sessionId;
            logger.debug('获取到会话ID:', this.sessionId);
          }
        } : null
      });
      
      // 从响应中提取会话ID（如果存在）
      if (response && response.sessionId) {
        this.sessionId = response.sessionId;
        logger.debug('从初始化响应获取会话ID:', this.sessionId);
      }
      
      return { success: true, response };
    } catch (error) {
      // 如果是streamable-http服务器但初始化失败，尝试降级到标准模式
      if (this.serverType === 'streamable-http' && error.message.includes('not valid JSON')) {
        logger.warn(`服务器 ${this.serverUrl} 流式初始化失败，尝试标准模式...`);
        try {
          const response = await this.sendRequest(request);
          
          // 从降级响应中提取会话ID
          if (response && response.sessionId) {
            this.sessionId = response.sessionId;
            logger.debug('从降级响应获取会话ID:', this.sessionId);
          }
          
          return { success: true, response };
        } catch (fallbackError) {
          return { success: false, error: fallbackError.message };
        }
      }
      
      return { success: false, error: error.message };
    }
  }

  /**
   * 加载服务器能力
   */
  async loadServerCapabilities() {
    try {
      // 获取可用工具
      const toolsResult = await this.listTools();
      if (toolsResult.success) {
        toolsResult.tools.forEach(tool => {
          this.availableTools.set(tool.name, tool);
        });
        logger.info(`📦 发现 ${this.availableTools.size} 个远程工具`);
      }

      // 获取可用资源
      const resourcesResult = await this.listResources();
      if (resourcesResult.success) {
        resourcesResult.resources.forEach(resource => {
          this.availableResources.set(resource.uri, resource);
        });
        logger.info(`📁 发现 ${this.availableResources.size} 个远程资源`);
      }

      // 获取可用提示
      const promptsResult = await this.listPrompts();
      if (promptsResult.success) {
        promptsResult.prompts.forEach(prompt => {
          this.availablePrompts.set(prompt.name, prompt);
        });
        logger.info(`💡 发现 ${this.availablePrompts.size} 个远程提示`);
      }
    } catch (error) {
              logger.warn('⚠️ 加载服务器能力时出现错误:', error.message);
    }
  }

  /**
   * 发送HTTP请求到MCP服务器
   */
  async sendRequest(request, options = {}) {
    const { expectStreamable = false, onStreamData = null } = options;
    
    return new Promise(async (resolve, reject) => {
      const https = await import('https');
      const http = await import('http');
      
      const url = new URL(this.fullServerUrl);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https.default : http.default;
      
      const postData = JSON.stringify(request);
      
      const headers = {
        'Content-Type': 'application/json',
        'Accept': expectStreamable ? 'text/event-stream, application/json' : 'application/json, text/event-stream',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'NexusMind-MCP-Client/1.0.0'
      };
      
      // 如果有会话ID，添加到请求头
      if (this.sessionId) {
        headers['mcp-session-id'] = this.sessionId;
      }
      
      const requestOptions = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: 'POST',
        headers
      };

      const req = client.request(requestOptions, (res) => {
        const contentType = res.headers['content-type'] || '';
        const isStreamable = contentType.includes('text/event-stream');
        
        // 检查响应头中的会话ID
        const sessionId = res.headers['mcp-session-id'];
        if (sessionId && !this.sessionId) {
          this.sessionId = sessionId;
          logger.debug('从响应头获取会话ID:', this.sessionId);
        }
        
        if (isStreamable && expectStreamable && onStreamData) {
          // 处理流式响应
          this.handleStreamableResponse(res, onStreamData, resolve, reject);
        } else if (isStreamable) {
          // 即使没有期望流式响应，但服务器返回了流式响应，也要正确处理
          this.handleStreamableResponse(res, null, resolve, reject);
        } else {
          // 处理普通JSON响应
          this.handleJsonResponse(res, resolve, reject);
        }
      });

      req.on('error', (error) => {
        reject(new Error(`Request failed: ${error.message}`));
      });

      req.write(postData);
      req.end();
    });
  }

  /**
   * 处理流式响应
   */
  handleStreamableResponse(res, onStreamData, resolve, reject) {
    let buffer = '';
    let finalResult = null;
    let hasReceivedData = false;
    
    res.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop(); // 保留不完整的行
      
      for (const line of lines) {
        if (line.trim() === '') continue;
        
        try {
          // 处理不同的SSE格式
          if (line.startsWith('data: ')) {
            const data = line.substring(6);
            if (data === '[DONE]') {
              // 流结束标志
              continue;
            }
            
            hasReceivedData = true;
            const parsedData = JSON.parse(data);
            
            // 检查是否为错误响应
            if (parsedData.error) {
              reject(new Error(`MCP Stream Error: ${parsedData.error.message}`));
              return;
            }
            
            // 检查是否为最终结果
            if (parsedData.type === 'final' || parsedData.final === true) {
              finalResult = parsedData.result || parsedData;
            } else if (parsedData.result) {
              // 如果包含result字段，这可能是完整的响应
              finalResult = parsedData.result;
              if (onStreamData) {
                onStreamData(parsedData);
              }
            } else {
              // 调用流数据处理回调
              if (onStreamData) {
                onStreamData(parsedData);
              }
            }
          } else if (line.startsWith('event: ')) {
            // 处理event类型的SSE
            const eventType = line.substring(7);
            logger.debug('接收到SSE事件类型:', eventType);
            hasReceivedData = true;
          } else if (line.includes(':')) {
            // 处理其他SSE字段
            const [field, ...valueParts] = line.split(':');
            const value = valueParts.join(':').trim();
            logger.debug(`SSE字段 ${field}:`, value);
            hasReceivedData = true;
            
            // 如果是完整的JSON数据行，尝试解析
            if (field.trim() === 'data' || (!field.startsWith('event') && value)) {
              try {
                const parsedData = JSON.parse(value);
                if (parsedData.error) {
                  reject(new Error(`MCP Stream Error: ${parsedData.error.message}`));
                  return;
                }
                
                if (parsedData.type === 'final' || parsedData.final === true) {
                  finalResult = parsedData.result || parsedData;
                } else if (onStreamData) {
                  onStreamData(parsedData);
                }
              } catch (parseError) {
                // 不是JSON，可能是其他格式的数据
                logger.debug('非JSON SSE数据:', value);
              }
            }
          } else {
            // 尝试直接解析为JSON（某些服务器可能不使用标准SSE格式）
            try {
              const parsedData = JSON.parse(line);
              hasReceivedData = true;
              
              if (parsedData.error) {
                reject(new Error(`MCP Stream Error: ${parsedData.error.message}`));
                return;
              }
              
              if (parsedData.type === 'final' || parsedData.final === true) {
                finalResult = parsedData.result || parsedData;
              } else if (onStreamData) {
                onStreamData(parsedData);
              }
            } catch (error) {
              logger.debug('无法解析的流数据行:', line);
            }
          }
        } catch (error) {
          logger.warn('解析流数据失败:', error.message, '原始数据:', line);
        }
      }
    });
    
    res.on('end', () => {
      // 处理最后的缓冲数据
      if (buffer.trim()) {
        try {
          if (buffer.startsWith('data: ')) {
            const data = buffer.substring(6);
            if (data !== '[DONE]') {
              const parsedData = JSON.parse(data);
              if (parsedData.type === 'final' || parsedData.final === true) {
                finalResult = parsedData.result || parsedData;
              } else if (onStreamData) {
                onStreamData(parsedData);
              }
            }
          } else {
            // 尝试直接解析
            try {
              const parsedData = JSON.parse(buffer);
              if (parsedData.type === 'final' || parsedData.final === true) {
                finalResult = parsedData.result || parsedData;
              } else if (onStreamData) {
                onStreamData(parsedData);
              }
            } catch (parseError) {
              logger.debug('最后的缓冲数据不是有效JSON:', buffer);
            }
          }
        } catch (error) {
          logger.warn('解析最后的流数据失败:', error.message);
        }
      }
      
      // 如果没有接收到任何数据，可能服务器不支持流式响应
      if (!hasReceivedData) {
        reject(new Error('未接收到流式数据，服务器可能不支持streamable-http'));
      } else {
        resolve(finalResult || { success: true, type: 'streamable' });
      }
    });
    
    res.on('error', (error) => {
      reject(new Error(`Stream response error: ${error.message}`));
    });
  }

  /**
   * 处理普通JSON响应
   */
  handleJsonResponse(res, resolve, reject) {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        
        if (response.error) {
          reject(new Error(`MCP Error: ${response.error.message}`));
        } else {
          resolve(response.result);
        }
      } catch (error) {
        reject(new Error(`Failed to parse response: ${error.message}`));
      }
    });
  }

  /**
   * 列出可用工具
   */
  async listTools() {
    const requestId = uuidv4();
    
    const request = {
      jsonrpc: '2.0',
      id: requestId,
      method: 'tools/list',
      params: {}
    };

    try {
      const isStreamableServer = this.serverType === 'streamable-http';
      
      const response = await this.sendRequest(request, {
        expectStreamable: isStreamableServer,
        onStreamData: isStreamableServer ? (data) => {
          logger.debug('工具列表流数据:', data);
        } : null
      });
      
      return { success: true, tools: response.tools || [] };
    } catch (error) {
      // 如果是streamable服务器失败，尝试标准模式
      if (this.serverType === 'streamable-http' && error.message.includes('not valid JSON')) {
        try {
          const response = await this.sendRequest(request);
          return { success: true, tools: response.tools || [] };
        } catch (fallbackError) {
          return { success: false, error: fallbackError.message };
        }
      }
      
      return { success: false, error: error.message };
    }
  }

  /**
   * 调用工具
   */
  async callTool(toolName, args = {}, options = {}) {
    const { 
      expectStreamable = false, 
      onStreamData = null,
      onProgress = null,
      onComplete = null,
      onError = null 
    } = options;
    
    const requestId = uuidv4();
    
    const request = {
      jsonrpc: '2.0',
      id: requestId,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
      }
    };

    try {
      // 如果期望流式响应，设置相应的处理器
      if (expectStreamable) {
        const streamHandler = (data) => {
          // 处理不同类型的流数据
          if (data.type === 'progress' && onProgress) {
            onProgress(data);
          } else if (data.type === 'data' && onStreamData) {
            onStreamData(data);
          } else if (data.type === 'complete' && onComplete) {
            onComplete(data);
          } else if (data.type === 'error' && onError) {
            onError(data);
          } else if (onStreamData) {
            // 默认处理器
            onStreamData(data);
          }
        };

        const response = await this.sendRequest(request, {
          expectStreamable: true,
          onStreamData: streamHandler
        });
        
        return { success: true, result: response, type: 'streamable' };
      } else {
        // 普通调用
        const response = await this.sendRequest(request);
        return { success: true, result: response };
      }
    } catch (error) {
      if (onError) {
        onError({ type: 'error', message: error.message });
      }
      return { success: false, error: error.message };
    }
  }

  /**
   * 调用流式工具（便捷方法）
   */
  async callStreamableTool(toolName, args = {}, streamHandlers = {}) {
    return this.callTool(toolName, args, {
      expectStreamable: true,
      ...streamHandlers
    });
  }

  /**
   * 列出可用资源
   */
  async listResources() {
    const requestId = uuidv4();
    
    const request = {
      jsonrpc: '2.0',
      id: requestId,
      method: 'resources/list',
      params: {}
    };

    try {
      const response = await this.sendRequest(request);
      return { success: true, resources: response.resources || [] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 读取资源
   */
  async readResource(uri) {
    const requestId = uuidv4();
    
    const request = {
      jsonrpc: '2.0',
      id: requestId,
      method: 'resources/read',
      params: { uri }
    };

    try {
      const response = await this.sendRequest(request);
      return { success: true, contents: response.contents || [] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 订阅资源
   */
  async subscribeResources(uris) {
    const requestId = uuidv4();
    
    const request = {
      jsonrpc: '2.0',
      id: requestId,
      method: 'resources/subscribe',
      params: { uris }
    };

    try {
      const response = await this.sendRequest(request);
      return { success: true, result: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 列出可用提示
   */
  async listPrompts() {
    const requestId = uuidv4();
    
    const request = {
      jsonrpc: '2.0',
      id: requestId,
      method: 'prompts/list',
      params: {}
    };

    try {
      const response = await this.sendRequest(request);
      return { success: true, prompts: response.prompts || [] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取提示
   */
  async getPrompt(promptName) {
    const requestId = uuidv4();
    
    const request = {
      jsonrpc: '2.0',
      id: requestId,
      method: 'prompts/get',
      params: { name: promptName }
    };

    try {
      const response = await this.sendRequest(request);
      return { success: true, prompt: response.prompt };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 加载本地MCP包
   */
  async loadLocalMCPPackages() {
    try {
      logger.info('🔍 正在发现本地MCP包...');
      
      const localPackages = await this.packageManager.discoverLocalPackages();
      const results = [];

      for (const pkg of localPackages) {
        try {
          const result = await this.loadPackageServices(pkg.name);
          results.push(result);
        } catch (error) {
          logger.warn(`Failed to load package ${pkg.name}:`, error.message);
          results.push({ success: false, packageName: pkg.name, error: error.message });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const totalCount = results.length;
      
              logger.info(`📦 自动加载了 ${successCount}/${totalCount} 个本地MCP包`);
      
      if (successCount > 0) {
                  logger.info('✅ 成功加载的包:');
        results.filter(r => r.success).forEach(result => {
                      logger.info(`  - ${result.packageName} (${result.loadedServices} 个服务)`);
        });
      }
      
      if (totalCount > successCount) {
                  logger.warn('⚠️ 加载失败的包:');
        results.filter(r => !r.success).forEach(result => {
                      logger.warn(`  - ${result.packageName}: ${result.error}`);
        });
      }

      return results;
    } catch (error) {
      logger.warn('⚠️ 加载本地MCP包时出现错误:', error.message);
      return [];
    }
  }

  /**
   * 从本地npm包加载MCP服务
   */
  async loadPackageServices(packageName) {
    try {
      const localPackages = await this.packageManager.discoverLocalPackages();
      const targetPackage = localPackages.find(pkg => pkg.name === packageName);
      
      if (!targetPackage) {
        throw new Error(`Package ${packageName} not found in local packages`);
      }

      const { mcpConfig } = targetPackage;
      let loadedServices = 0;

      // 注册工具
      if (mcpConfig.tools && mcpConfig.tools.length > 0) {
        for (const toolConfig of mcpConfig.tools) {
          try {
            const toolModule = await this.loadPackageModule(packageName, toolConfig.module);
            const tool = {
              name: toolConfig.name,
              description: toolConfig.description,
              inputSchema: toolConfig.inputSchema,
              execute: toolModule.execute || toolModule.default
            };
            
            this.localTools.set(tool.name, tool);
            loadedServices++;
          } catch (error) {
            logger.warn(`Failed to load tool ${toolConfig.name} from ${packageName}:`, error.message);
          }
        }
      }

      // 注册资源
      if (mcpConfig.resources && mcpConfig.resources.length > 0) {
        for (const resourceConfig of mcpConfig.resources) {
          try {
            const resourceModule = await this.loadPackageModule(packageName, resourceConfig.module);
            const resource = {
              uri: resourceConfig.uri,
              name: resourceConfig.name,
              description: resourceConfig.description,
              mimeType: resourceConfig.mimeType,
              getContent: resourceModule.getContent || resourceModule.default
            };
            
            this.localResources.set(resource.uri, resource);
            loadedServices++;
          } catch (error) {
            logger.warn(`Failed to load resource ${resourceConfig.uri} from ${packageName}:`, error.message);
          }
        }
      }

      logger.info(`Loaded ${loadedServices} services from package ${packageName}`);
      return { success: true, packageName, loadedServices };
    } catch (error) {
      logger.error(`Failed to load services from package ${packageName}:`, error);
      throw error;
    }
  }

  /**
   * 加载包模块
   */
  async loadPackageModule(packageName, modulePath) {
    const fullPath = join(this.packageManager.nodeModulesPath, packageName, modulePath);
    
    try {
      // 动态导入模块
      const module = await import(fullPath);
      return module;
    } catch (error) {
      throw new Error(`Failed to load module ${modulePath} from package ${packageName}: ${error.message}`);
    }
  }

  /**
   * 执行本地工具
   */
  async executeLocalTool(toolName, args = {}) {
    const tool = this.localTools.get(toolName);
    if (!tool) {
      throw new Error(`Local tool '${toolName}' not found`);
    }

    try {
      const result = await tool.execute(args);
      return { success: true, result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 读取本地资源
   */
  async readLocalResource(uri) {
    const resource = this.localResources.get(uri);
    if (!resource) {
      throw new Error(`Local resource '${uri}' not found`);
    }

    try {
      const content = await resource.getContent();
      return { success: true, content };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取所有可用工具（远程+本地）
   */
  getAllTools() {
    const allTools = new Map();
    
    // 添加远程工具
    this.availableTools.forEach((tool, name) => {
      allTools.set(name, { ...tool, source: 'remote' });
    });
    
    // 添加本地工具
    this.localTools.forEach((tool, name) => {
      allTools.set(name, { ...tool, source: 'local' });
    });
    
    return allTools;
  }

  /**
   * 获取所有可用资源（远程+本地）
   */
  getAllResources() {
    const allResources = new Map();
    
    // 添加远程资源
    this.availableResources.forEach((resource, uri) => {
      allResources.set(uri, { ...resource, source: 'remote' });
    });
    
    // 添加本地资源
    this.localResources.forEach((resource, uri) => {
      allResources.set(uri, { ...resource, source: 'local' });
    });
    
    return allResources;
  }

  /**
   * 添加事件监听器
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  /**
   * 移除事件监听器
   */
  off(event, callback) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * 触发事件
   */
  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          logger.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * 检查工具是否支持流式响应
   */
  isToolStreamable(toolName) {
    const tool = this.availableTools.get(toolName) || this.localTools.get(toolName);
    if (!tool) return false;
    
    // 检查工具元数据中是否标明支持流式响应
    return tool.streamable === true || 
           tool.type === 'streamable-http' ||
           tool.capabilities?.includes('streaming') ||
           false;
  }

  /**
   * 获取支持流式响应的工具列表
   */
  getStreamableTools() {
    const streamableTools = [];
    
    // 检查远程工具
    this.availableTools.forEach((tool, name) => {
      if (this.isToolStreamable(name)) {
        streamableTools.push({ ...tool, name, source: 'remote' });
      }
    });
    
    // 检查本地工具
    this.localTools.forEach((tool, name) => {
      if (this.isToolStreamable(name)) {
        streamableTools.push({ ...tool, name, source: 'local' });
      }
    });
    
    return streamableTools;
  }

  /**
   * 获取客户端状态
   */
  getStatus() {
    const streamableTools = this.getStreamableTools();
    
    return {
      serverUrl: this.fullServerUrl,
      isConnected: this.isConnected,
      remoteTools: this.availableTools.size,
      remoteResources: this.availableResources.size,
      remotePrompts: this.availablePrompts.size,
      localTools: this.localTools.size,
      localResources: this.localResources.size,
      totalTools: this.getAllTools().size,
      totalResources: this.getAllResources().size,
      streamableTools: streamableTools.length,
      capabilities: {
        streamableHttp: true,
        serverSentEvents: true,
        progressTracking: true
      }
    };
  }
} 