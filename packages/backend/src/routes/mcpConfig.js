import express from 'express';
import { mcpConfigService } from '../services/mcpConfigService.js';
import { MCPClient } from '../../../../src/mcp/MCPClient.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * 获取配置文件信息
 * GET /api/mcp/config-info
 */
router.get('/config-info', async (req, res) => {
  try {
    const configPath = mcpConfigService.getConfigFilePath();
    const config = await mcpConfigService.loadConfig();
    
    res.json({
      success: true,
      configPath,
      serversCount: config.servers.length,
      lastUpdated: config.lastUpdated
    });
  } catch (error) {
    logger.error('获取配置信息失败:', error);
    res.status(500).json({
      success: false,
      message: '获取配置信息失败',
      error: error.message
    });
  }
});

/**
 * 测试MCP服务器连接
 * POST /api/mcp/test-connection
 */
router.post('/test-connection', async (req, res) => {
  try {
    const serverConfig = req.body;
    
    // 验证配置
    mcpConfigService.validateServerConfig(serverConfig);
    
    // 创建临时MCP客户端进行测试
    const mcpClient = new MCPClient({
      serverUrl: serverConfig.serverUrl,
      apiKey: serverConfig.apiKey,
      type: serverConfig.type
    });
    
    logger.info(`测试MCP服务器连接: ${serverConfig.id}`);
    
    // 设置超时
    const connectionTimeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('连接超时')), 10000);
    });
    
    // 尝试连接
    const connectionResult = await Promise.race([
      mcpClient.connect(),
      connectionTimeout
    ]);
    
    if (connectionResult) {
      // 获取工具列表
      const toolsResult = await mcpClient.listTools();
      const toolsCount = toolsResult.success ? toolsResult.tools.length : 0;
      
      // 断开连接
      await mcpClient.disconnect();
      
      res.json({
        success: true,
        message: '连接成功',
        toolsCount,
        serverInfo: {
          connected: true,
          responseTime: Date.now()
        }
      });
    } else {
      throw new Error('连接失败');
    }
  } catch (error) {
    logger.error('测试MCP服务器连接失败:', error);
    res.status(400).json({
      success: false,
      message: '连接失败',
      error: error.message
    });
  }
});

/**
 * 重新加载所有MCP服务器
 * POST /api/mcp/reload
 */
router.post('/reload', async (req, res) => {
  try {
    logger.info('重新加载所有MCP服务器...');
    
    // 调用主应用的重新加载函数
    const success = await req.app.locals.reloadMCPServers();
    
    if (success) {
      res.json({
        success: true,
        message: '重新加载完成'
      });
    } else {
      res.status(500).json({
        success: false,
        message: '重新加载失败'
      });
    }
  } catch (error) {
    logger.error('重新加载MCP服务器失败:', error);
    res.status(500).json({
      success: false,
      message: '重新加载失败',
      error: error.message
    });
  }
});

/**
 * 获取所有MCP服务器配置
 * GET /api/mcp/config
 */
router.get('/config', async (req, res) => {
  try {
    logger.info('🔍 收到GET / 请求，获取所有MCP服务器配置');
    const config = await mcpConfigService.loadConfig();
    res.json({
      success: true,
      servers: config.servers,
      lastUpdated: config.lastUpdated
    });
  } catch (error) {
    logger.error('获取MCP配置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取配置失败',
      error: error.message
    });
  }
});

/**
 * 添加MCP服务器配置
 * POST /api/mcp/config
 */
router.post('/config', async (req, res) => {
  try {
    // 验证配置
    mcpConfigService.validateServerConfig(req.body);
    
    // 添加服务器
    const newServer = await mcpConfigService.addServer(req.body);
    
    // 自动重新加载MCP服务器
    try {
      await req.app.locals.reloadMCPServers();
      logger.info('添加服务器后自动重新加载MCP服务器完成');
    } catch (reloadError) {
      logger.warn('添加服务器后重新加载MCP服务器失败:', reloadError);
    }
    
    res.json({
      success: true,
      message: '添加成功',
      server: newServer
    });
  } catch (error) {
    logger.error('添加MCP服务器失败:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * 更新MCP服务器配置
 * PUT /api/mcp/config/:serverId
 */
router.put('/config/:serverId', async (req, res) => {
  try {
    const { serverId } = req.params;
    
    // 验证配置（除了ID）
    const updateData = { ...req.body };
    delete updateData.id; // 不允许更新ID
    
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有要更新的数据'
      });
    }
    
    // 如果有完整配置，进行验证
    if (updateData.name && updateData.serverUrl && updateData.type) {
      mcpConfigService.validateServerConfig({ id: serverId, ...updateData });
    }
    
    // 更新服务器
    const updatedServer = await mcpConfigService.updateServer(serverId, updateData);
    
    // 自动重新加载MCP服务器
    try {
      await req.app.locals.reloadMCPServers();
      logger.info('更新服务器后自动重新加载MCP服务器完成');
    } catch (reloadError) {
      logger.warn('更新服务器后重新加载MCP服务器失败:', reloadError);
    }
    
    res.json({
      success: true,
      message: '更新成功',
      server: updatedServer
    });
  } catch (error) {
    logger.error('更新MCP服务器失败:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * 删除MCP服务器配置
 * DELETE /api/mcp/config/:serverId
 */
router.delete('/config/:serverId', async (req, res) => {
  try {
    const { serverId } = req.params;
    
    const deletedServer = await mcpConfigService.deleteServer(serverId);
    
    // 自动重新加载MCP服务器
    try {
      await req.app.locals.reloadMCPServers();
      logger.info('删除服务器后自动重新加载MCP服务器完成');
    } catch (reloadError) {
      logger.warn('删除服务器后重新加载MCP服务器失败:', reloadError);
    }
    
    res.json({
      success: true,
      message: '删除成功',
      server: deletedServer
    });
  } catch (error) {
    logger.error('删除MCP服务器失败:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * 获取单个MCP服务器配置
 * GET /api/mcp/config/:serverId
 */
router.get('/config/:serverId', async (req, res) => {
  try {
    const { serverId } = req.params;
    logger.info(`🔍 收到GET /:serverId 请求，serverId: ${serverId}`);
    
    const server = await mcpConfigService.getServer(serverId);
    
    res.json({
      success: true,
      server
    });
  } catch (error) {
    logger.error('获取MCP服务器失败:', error);
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
