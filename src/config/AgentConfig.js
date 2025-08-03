/**
 * 智能体配置管理
 */

export class AgentConfig {
  constructor() {
    this.loadFromEnv();
  }

  /**
   * 从环境变量加载配置
   */
  loadFromEnv() {
    this.llm = {
      apiKey: process.env.OPENAI_API_KEY || 'demo-key',
      model: process.env.OPENAI_MODEL || 'gpt-4',
      baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      temperature: parseFloat(process.env.LLM_TEMPERATURE) || 0.7,
      maxTokens: parseInt(process.env.LLM_MAX_TOKENS) || 1000
    };

    this.agent = {
      name: process.env.AGENT_NAME || 'AutoAgent',
      thinkingMode: process.env.THINKING_MODE || 'decision',
      maxIterations: parseInt(process.env.MAX_ITERATIONS) || 10,
      collaborationEnabled: process.env.COLLABORATION_ENABLED === 'true',
      role: process.env.AGENT_ROLE || 'general'
    };

    this.memory = {
      ttl: parseInt(process.env.MEMORY_TTL) || 3600,
      maxSize: parseInt(process.env.MAX_MEMORY_SIZE) || 1000,
      searchLimit: parseInt(process.env.MEMORY_SEARCH_LIMIT) || 5
    };

    this.mcp = {
      maxConnections: parseInt(process.env.MAX_MCP_CONNECTIONS) || 10,
      connectionTimeout: parseInt(process.env.MCP_CONNECTION_TIMEOUT) || 30000,
      retryAttempts: parseInt(process.env.MCP_RETRY_ATTEMPTS) || 3,
      retryDelay: parseInt(process.env.MCP_RETRY_DELAY) || 1000,
      protocol: process.env.MCP_PROTOCOL || 'both'
    };

    this.logging = {
      level: process.env.LOG_LEVEL || 'info',
      enableConsole: process.env.LOG_CONSOLE !== 'false',
      enableFile: process.env.LOG_FILE === 'true',
      logFile: process.env.LOG_FILE_PATH || 'logs/agent.log'
    };
  }

  /**
   * 获取LLM配置
   */
  getLLMConfig() {
    return this.llm;
  }

  /**
   * 获取智能体配置
   */
  getAgentConfig() {
    return {
      ...this.agent,
      memory: this.memory,
      llm: this.llm
    };
  }

  /**
   * 获取MCP配置
   */
  getMCPConfig() {
    return this.mcp;
  }

  /**
   * 获取日志配置
   */
  getLoggingConfig() {
    return this.logging;
  }

  /**
   * 验证配置
   */
  validate() {
    const errors = [];

    if (!this.llm.apiKey || this.llm.apiKey === 'demo-key') {
      errors.push('警告: 未设置有效的OPENAI_API_KEY');
    }

    if (!this.llm.model) {
      errors.push('错误: 未设置LLM模型');
    }

    if (this.agent.maxIterations < 1 || this.agent.maxIterations > 50) {
      errors.push('错误: MAX_ITERATIONS应在1-50之间');
    }

    if (this.memory.maxSize < 10 || this.memory.maxSize > 10000) {
      errors.push('错误: MAX_MEMORY_SIZE应在10-10000之间');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 获取配置摘要
   */
  getSummary() {
    return {
      llm: {
        model: this.llm.model,
        temperature: this.llm.temperature,
        maxTokens: this.llm.maxTokens
      },
      agent: {
        name: this.agent.name,
        thinkingMode: this.agent.thinkingMode,
        maxIterations: this.agent.maxIterations,
        collaborationEnabled: this.agent.collaborationEnabled
      },
      memory: {
        ttl: this.memory.ttl,
        maxSize: this.memory.maxSize
      },
      mcp: {
        maxConnections: this.mcp.maxConnections,
        connectionTimeout: this.mcp.connectionTimeout
      }
    };
  }
} 