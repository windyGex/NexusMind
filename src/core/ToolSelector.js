import logger from '../../utils/logger.js';

/**
 * 智能工具选择器
 * 根据任务描述和上下文智能选择最合适的MCP工具
 */
export class ToolSelector {
  constructor(config = {}) {
    this.config = {
      maxToolsPerTask: config.maxToolsPerTask || 5,
      minMatchScore: config.minMatchScore || 0.1,
      useLLMForSelection: config.useLLMForSelection || false,
      ...config
    };
    
    this.toolUsageHistory = new Map();
    this.taskPatterns = new Map();
  }

  /**
   * 智能选择工具
   */
  async selectTools(taskDescription, availableTools, context = {}) {
    // 如果启用了LLM选择，使用LLM进行智能选择
    if (this.config.useLLMForSelection && context.llm) {
      return await this.selectToolsWithLLM(taskDescription, availableTools, context);
    }
    
    // 否则使用基于规则的选择
    return this.selectToolsWithRules(taskDescription, availableTools, context);
  }

  /**
   * 使用LLM进行智能工具选择
   */
  async selectToolsWithLLM(taskDescription, availableTools, context) {
    const prompt = this.buildToolSelectionPrompt(taskDescription, availableTools, context);
    
    try {
      const response = await context.llm.generate(prompt, {
        temperature: 0.3,
        max_tokens: 500
      });
      
      return this.parseLLMSelectionResponse(response, availableTools);
    } catch (error) {
      logger.warn('LLM工具选择失败，回退到规则选择:', error);
      return this.selectToolsWithRules(taskDescription, availableTools, context);
    }
  }

  /**
   * 构建工具选择提示
   */
  buildToolSelectionPrompt(taskDescription, availableTools, context) {
    const toolsList = availableTools.map(tool => 
      `- ${tool.name}: ${tool.description} (服务器: ${tool.serverName})`
    ).join('\n');

    return `任务描述: ${taskDescription}

可用工具列表:
${toolsList}

请根据任务描述选择最合适的工具。考虑以下因素:
1. 工具功能与任务的匹配度
2. 工具的可靠性（服务器状态）
3. 工具的使用历史成功率
4. 任务的优先级和紧急程度

请返回选择的工具ID列表，格式为: tool1,tool2,tool3
最多选择${this.config.maxToolsPerTask}个工具。

选择的工具:`;
  }

  /**
   * 解析LLM选择响应
   */
  parseLLMSelectionResponse(response, availableTools) {
    try {
      // 提取工具ID列表
      const toolIds = response.trim().split(',').map(id => id.trim());
      
      const selectedTools = [];
      for (const toolId of toolIds) {
        const tool = availableTools.find(t => t.id === toolId);
        if (tool) {
          selectedTools.push({
            tool,
            matchScore: 1.0,
            priority: this.calculateToolPriority(tool, {}),
            selectionMethod: 'llm'
          });
        }
      }
      
      return selectedTools;
    } catch (error) {
      logger.warn('解析LLM选择响应失败:', error);
      return [];
    }
  }

  /**
   * 使用规则进行工具选择
   */
  selectToolsWithRules(taskDescription, availableTools, context) {
    const taskKeywords = this.extractKeywords(taskDescription);
    const selectedTools = [];

    logger.debug(`🔍 任务关键词: ${taskKeywords.join(', ')}`);
    logger.debug(`📋 可用工具数量: ${availableTools.length}`);

    for (const tool of availableTools) {
      const matchScore = this.calculateMatchScore(tool, taskKeywords, context);
      
      // 添加调试信息
      if (matchScore > 0) {
        logger.debug(`🎯 工具 ${tool.name} 匹配度: ${matchScore.toFixed(3)}`);
      }
      
      if (matchScore >= this.config.minMatchScore) {
        const priority = this.calculateToolPriority(tool, context);
        
        selectedTools.push({
          tool,
          matchScore,
          priority,
          selectionMethod: 'rules'
        });
      }
    }

    // 按优先级和匹配度排序
    selectedTools.sort((a, b) => {
      const priorityDiff = b.priority - a.priority;
      if (priorityDiff !== 0) return priorityDiff;
      return b.matchScore - a.matchScore;
    });

    logger.info(`✅ 选择了 ${selectedTools.length} 个工具`);
    return selectedTools.slice(0, this.config.maxToolsPerTask);
  }

  /**
   * 提取关键词
   */
  extractKeywords(text) {
    // 简单的关键词提取，可以扩展为更复杂的NLP处理
    const stopWords = new Set(['的', '是', '在', '有', '和', '与', '或', '但', '而', '了', '着', '过', '什么', '怎么', '如何', '哪个', '哪些']);
    
    // 股票投资相关词汇扩展
    const investmentKeywords = [
      '股票', '投资', '值得投资', '推荐', '分析', '建议', '买入', '卖出', '持有',
      '2025年', '最值得', '投资机会', '投资建议', '股票推荐', '投资分析',
      '市场', '行情', '趋势', '上涨', '下跌', '突破', '支撑', '阻力',
      '技术分析', '基本面', '财务', '盈利', '增长', '风险', '收益'
    ];
    
    let keywords = text.toLowerCase()
      .replace(/[^\w\s\u4e00-\u9fff]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 1 && !stopWords.has(word));
    
    // 添加投资相关关键词
    const textLower = text.toLowerCase();
    for (const keyword of investmentKeywords) {
      if (textLower.includes(keyword) && !keywords.includes(keyword)) {
        keywords.push(keyword);
      }
    }
    
    return keywords;
  }

  /**
   * 计算匹配度
   */
  calculateMatchScore(tool, taskKeywords, context) {
    const toolText = [
      tool.name,
      tool.description,
      ...(tool.tags || [])
    ].join(' ').toLowerCase();

    let matchScore = 0;
    let totalKeywords = taskKeywords.length;

    // 关键词匹配
    for (const keyword of taskKeywords) {
      if (toolText.includes(keyword)) {
        matchScore++;
      }
    }

    // 特殊匹配规则
    const taskText = taskKeywords.join(' ').toLowerCase();
    
    // 路径规划相关
    if (taskText.includes('驾车') || taskText.includes('开车') || taskText.includes('驾驶')) {
      if (tool.name.includes('driving')) {
        matchScore += 2; // 驾车工具优先级更高
      }
    }
    
    if (taskText.includes('步行') || taskText.includes('走路')) {
      if (tool.name.includes('walking')) {
        matchScore += 2;
      }
    }
    
    if (taskText.includes('骑行') || taskText.includes('自行车')) {
      if (tool.name.includes('bicycling')) {
        matchScore += 2;
      }
    }
    
    if (taskText.includes('公交') || taskText.includes('地铁') || taskText.includes('公共交通')) {
      if (tool.name.includes('transit')) {
        matchScore += 2;
      }
    }
    
    // 股票投资相关
    if (taskText.includes('股票') || taskText.includes('投资') || taskText.includes('值得投资') || 
        taskText.includes('推荐') || taskText.includes('分析') || taskText.includes('建议')) {
      if (tool.name.includes('analyze_stock_investment') || tool.name.includes('scrape_webpage') || 
          tool.name.includes('generate_investment_report')) {
        matchScore += 3; // 股票投资工具优先级更高
      }
    }
    
    // 网页抓取相关
    if (taskText.includes('抓取') || taskText.includes('网页') || taskText.includes('网站') || 
        taskText.includes('内容') || taskText.includes('信息')) {
      if (tool.name.includes('scrape_webpage') || tool.name.includes('scrape_multiple_pages')) {
        matchScore += 2;
      }
    }

    // 考虑工具使用历史
    const usageHistory = this.toolUsageHistory.get(tool.id);
    if (usageHistory) {
      const successRate = usageHistory.successCount / usageHistory.totalCount;
      matchScore += successRate * 0.5; // 成功率高增加匹配度
    }

    // 考虑服务器状态 - 默认为已连接
    const serverStatus = tool.serverStatus || 'connected';
    if (serverStatus === 'connected') {
      matchScore += 0.2;
    }

    return totalKeywords > 0 ? matchScore / totalKeywords : 0;
  }

  /**
   * 计算工具优先级
   */
  calculateToolPriority(tool, context) {
    let priority = 0;

    // 基础优先级
    priority += 10;

    // 服务器状态影响
    if (tool.serverStatus === 'connected') {
      priority += 5;
    } else if (tool.serverStatus === 'failed') {
      priority -= 10;
    }

    // 使用历史影响
    const usageHistory = this.toolUsageHistory.get(tool.id);
    if (usageHistory) {
      const successRate = usageHistory.successCount / usageHistory.totalCount;
      priority += successRate * 10;
      
      // 最近使用过的工具优先级稍低（避免重复使用）
      const timeSinceLastUse = Date.now() - usageHistory.lastUsed;
      if (timeSinceLastUse < 60000) { // 1分钟内使用过
        priority -= 2;
      }
    }

    // 上下文偏好
    if (context.preferredServers && context.preferredServers.includes(tool.serverId)) {
      priority += 3;
    }

    // 任务类型匹配
    if (context.taskType) {
      const taskTypeKeywords = {
        'search': ['search', 'find', 'lookup', 'query'],
        'navigation': ['navigate', 'route', 'direction', 'map'],
        'communication': ['send', 'message', 'email', 'notify'],
        'data': ['read', 'write', 'update', 'delete', 'create']
      };

      const keywords = taskTypeKeywords[context.taskType] || [];
      if (keywords.some(keyword => tool.name.toLowerCase().includes(keyword))) {
        priority += 2;
      }
    }

    return priority;
  }

  /**
   * 记录工具使用结果
   */
  recordToolUsage(toolId, success, executionTime = 0) {
    if (!this.toolUsageHistory.has(toolId)) {
      this.toolUsageHistory.set(toolId, {
        totalCount: 0,
        successCount: 0,
        totalExecutionTime: 0,
        lastUsed: 0
      });
    }

    const history = this.toolUsageHistory.get(toolId);
    history.totalCount++;
    history.totalExecutionTime += executionTime;
    history.lastUsed = Date.now();

    if (success) {
      history.successCount++;
    }
  }

  /**
   * 学习任务模式
   */
  learnTaskPattern(taskDescription, selectedTools, success) {
    const pattern = {
      keywords: this.extractKeywords(taskDescription),
      tools: selectedTools.map(t => t.tool.id),
      success,
      timestamp: Date.now()
    };

    const patternKey = pattern.keywords.join('|');
    if (!this.taskPatterns.has(patternKey)) {
      this.taskPatterns.set(patternKey, []);
    }

    this.taskPatterns.get(patternKey).push(pattern);
  }

  /**
   * 获取工具使用统计
   */
  getToolUsageStats() {
    const stats = {};
    
    for (const [toolId, history] of this.toolUsageHistory) {
      stats[toolId] = {
        totalUses: history.totalCount,
        successRate: history.successCount / history.totalCount,
        avgExecutionTime: history.totalExecutionTime / history.totalCount,
        lastUsed: history.lastUsed
      };
    }
    
    return stats;
  }

  /**
   * 获取任务模式统计
   */
  getTaskPatternStats() {
    const stats = {};
    
    for (const [pattern, patterns] of this.taskPatterns) {
      const successCount = patterns.filter(p => p.success).length;
      stats[pattern] = {
        totalOccurrences: patterns.length,
        successRate: successCount / patterns.length,
        commonTools: this.getMostCommonTools(patterns)
      };
    }
    
    return stats;
  }

  /**
   * 获取最常用工具
   */
  getMostCommonTools(patterns) {
    const toolCounts = {};
    
    for (const pattern of patterns) {
      for (const toolId of pattern.tools) {
        toolCounts[toolId] = (toolCounts[toolId] || 0) + 1;
      }
    }
    
    return Object.entries(toolCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([toolId, count]) => ({ toolId, count }));
  }

  /**
   * 清理过期数据
   */
  cleanup() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24小时

    // 清理使用历史
    for (const [toolId, history] of this.toolUsageHistory) {
      if (now - history.lastUsed > maxAge) {
        this.toolUsageHistory.delete(toolId);
      }
    }

    // 清理任务模式
    for (const [pattern, patterns] of this.taskPatterns) {
      const recentPatterns = patterns.filter(p => now - p.timestamp < maxAge);
      if (recentPatterns.length === 0) {
        this.taskPatterns.delete(pattern);
      } else {
        this.taskPatterns.set(pattern, recentPatterns);
      }
    }
  }
} 