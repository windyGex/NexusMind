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
    this.connection = null;
    this.isConnected = false;
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
          name: 'AutoAgent MCP Client',
          version: '1.0.0'
        }
      }
    };

    try {
      const response = await this.sendRequest(request);
      return { success: true, response };
    } catch (error) {
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
  async sendRequest(request) {
    return new Promise(async (resolve, reject) => {
      const https = await import('https');
      const http = await import('http');
      
      const url = new URL(this.fullServerUrl);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https.default : http.default;
      
      const postData = JSON.stringify(request);
      
      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
          'Content-Length': Buffer.byteLength(postData),
          'User-Agent': 'AutoAgent-MCP-Client/1.0.0'
        }
      };

      const req = client.request(options, (res) => {
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
      });

      req.on('error', (error) => {
        reject(new Error(`Request failed: ${error.message}`));
      });

      req.write(postData);
      req.end();
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
      const response = await this.sendRequest(request);
      return { success: true, tools: response.tools || [] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 调用工具
   */
  async callTool(toolName, args = {}) {
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
      const response = await this.sendRequest(request);
      return { success: true, result: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
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
   * 获取客户端状态
   */
  getStatus() {
    return {
      serverUrl: this.fullServerUrl,
      isConnected: this.isConnected,
      remoteTools: this.availableTools.size,
      remoteResources: this.availableResources.size,
      remotePrompts: this.availablePrompts.size,
      localTools: this.localTools.size,
      localResources: this.localResources.size,
      totalTools: this.getAllTools().size,
      totalResources: this.getAllResources().size
    };
  }
} 