import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MCP配置文件路径（指向项目根目录的temp文件夹）
const CONFIG_FILE_PATH = path.join(process.cwd(), '..', '..', 'temp', 'mcp-config.json');

/**
 * MCP配置服务
 * 负责管理MCP服务器配置的本地文件存储
 */
export class MCPConfigService {
  constructor() {
    this.ensureConfigDirectory();
  }

  /**
   * 确保配置目录存在
   */
  async ensureConfigDirectory() {
    try {
      const configDir = path.dirname(CONFIG_FILE_PATH);
      await fs.mkdir(configDir, { recursive: true });
    } catch (error) {
      logger.error('创建配置目录失败:', error);
    }
  }

  /**
   * 加载MCP配置
   */
  async loadConfig() {
    try {
      await this.ensureConfigDirectory();
      
      // 检查文件是否存在
      try {
        await fs.access(CONFIG_FILE_PATH);
      } catch {
        // 文件不存在，创建默认配置
        const defaultConfig = {
          servers: [
            {
              id: 'amap',
              name: '高德地图',
              serverUrl: 'https://mcp.amap.com/mcp',
              type: 'standard',
              apiKey: 'df2d1657542aabd58302835c17737791',
              status: 'unknown',
              toolsCount: 0
            },
            {
              id: 'febase',
              name: '大前端研发',
              serverUrl: 'http://mcp-gateway.qa.ft.igame.163.com/mcp?appName=febase',
              type: 'streamable-http',
              status: 'unknown',
              toolsCount: 0
            }
          ],
          lastUpdated: new Date().toISOString()
        };
        
        await this.saveConfig(defaultConfig);
        return defaultConfig;
      }
      
      const configData = await fs.readFile(CONFIG_FILE_PATH, 'utf8');
      const config = JSON.parse(configData);
      
      logger.info('加载MCP配置成功');
      return config;
    } catch (error) {
      logger.error('加载MCP配置失败:', error);
      throw new Error('加载配置失败: ' + error.message);
    }
  }

  /**
   * 保存MCP配置
   */
  async saveConfig(config) {
    try {
      await this.ensureConfigDirectory();
      
      // 更新时间戳
      config.lastUpdated = new Date().toISOString();
      
      const configData = JSON.stringify(config, null, 2);
      await fs.writeFile(CONFIG_FILE_PATH, configData, 'utf8');
      
      logger.info('保存MCP配置成功');
      return config;
    } catch (error) {
      logger.error('保存MCP配置失败:', error);
      throw new Error('保存配置失败: ' + error.message);
    }
  }

  /**
   * 添加MCP服务器
   */
  async addServer(serverConfig) {
    try {
      const config = await this.loadConfig();
      
      // 检查ID是否已存在
      const existingServer = config.servers.find(s => s.id === serverConfig.id);
      if (existingServer) {
        throw new Error('服务器ID已存在');
      }
      
      // 添加默认字段
      const newServer = {
        ...serverConfig,
        status: 'unknown',
        toolsCount: 0,
        createdAt: new Date().toISOString()
      };
      
      config.servers.push(newServer);
      await this.saveConfig(config);
      
      logger.info(`添加MCP服务器成功: ${serverConfig.id}`);
      return newServer;
    } catch (error) {
      logger.error('添加MCP服务器失败:', error);
      throw error;
    }
  }

  /**
   * 更新MCP服务器
   */
  async updateServer(serverId, updates) {
    try {
      const config = await this.loadConfig();
      
      const serverIndex = config.servers.findIndex(s => s.id === serverId);
      if (serverIndex === -1) {
        throw new Error('服务器不存在');
      }
      
      // 更新服务器配置
      config.servers[serverIndex] = {
        ...config.servers[serverIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      await this.saveConfig(config);
      
      logger.info(`更新MCP服务器成功: ${serverId}`);
      return config.servers[serverIndex];
    } catch (error) {
      logger.error('更新MCP服务器失败:', error);
      throw error;
    }
  }

  /**
   * 删除MCP服务器
   */
  async deleteServer(serverId) {
    try {
      const config = await this.loadConfig();
      
      const serverIndex = config.servers.findIndex(s => s.id === serverId);
      if (serverIndex === -1) {
        throw new Error('服务器不存在');
      }
      
      const deletedServer = config.servers[serverIndex];
      config.servers.splice(serverIndex, 1);
      
      await this.saveConfig(config);
      
      logger.info(`删除MCP服务器成功: ${serverId}`);
      return deletedServer;
    } catch (error) {
      logger.error('删除MCP服务器失败:', error);
      throw error;
    }
  }

  /**
   * 获取单个服务器配置
   */
  async getServer(serverId) {
    try {
      const config = await this.loadConfig();
      const server = config.servers.find(s => s.id === serverId);
      
      if (!server) {
        throw new Error('服务器不存在');
      }
      
      return server;
    } catch (error) {
      logger.error('获取MCP服务器失败:', error);
      throw error;
    }
  }

  /**
   * 更新服务器状态
   */
  async updateServerStatus(serverId, status, toolsCount = 0) {
    try {
      return await this.updateServer(serverId, {
        status,
        toolsCount,
        lastChecked: new Date().toISOString()
      });
    } catch (error) {
      logger.error('更新服务器状态失败:', error);
      throw error;
    }
  }

  /**
   * 验证服务器配置
   */
  validateServerConfig(config) {
    const required = ['id', 'name', 'serverUrl', 'type'];
    const missing = required.filter(field => !config[field]);
    
    if (missing.length > 0) {
      throw new Error(`缺少必需字段: ${missing.join(', ')}`);
    }
    
    // 验证URL格式
    try {
      new URL(config.serverUrl);
    } catch {
      throw new Error('无效的服务器URL');
    }
    
    // 验证类型
    const validTypes = ['standard', 'streamable-http'];
    if (!validTypes.includes(config.type)) {
      throw new Error('无效的服务器类型');
    }
    
    // 验证ID格式
    if (!/^[a-zA-Z0-9_-]+$/.test(config.id)) {
      throw new Error('ID只能包含字母、数字、下划线和横线');
    }
    
    return true;
  }

  /**
   * 获取配置文件路径
   */
  getConfigFilePath() {
    return CONFIG_FILE_PATH;
  }
}

// 创建单例实例
export const mcpConfigService = new MCPConfigService();
