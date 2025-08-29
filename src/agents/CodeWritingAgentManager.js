import { CodeWritingAgent } from './CodeWritingAgent.js';

/**
 * 代码编写Agent管理器
 * 负责创建和管理代码编写类自主Agent实例
 */
export class CodeWritingAgentManager {
  constructor() {
    this.agents = new Map();
  }
  
  /**
   * 创建新的代码编写Agent实例
   * @param {string} id - Agent ID
   * @param {object} options - Agent配置选项
   * @returns {CodeWritingAgent} 代码编写Agent实例
   */
  createAgent(id, options = {}) {
    const agent = new CodeWritingAgent({
      id,
      ...options
    });
    
    this.agents.set(id, agent);
    return agent;
  }
  
  /**
   * 获取指定ID的Agent实例
   * @param {string} id - Agent ID
   * @returns {CodeWritingAgent|null} Agent实例或null
   */
  getAgent(id) {
    return this.agents.get(id) || null;
  }
  
  /**
   * 删除指定ID的Agent实例
   * @param {string} id - Agent ID
   * @returns {boolean} 是否成功删除
   */
  removeAgent(id) {
    return this.agents.delete(id);
  }
  
  /**
   * 获取所有Agent实例
   * @returns {Map} 所有Agent实例的Map
   */
  getAllAgents() {
    return this.agents;
  }
  
  /**
   * 清空所有Agent实例
   */
  clearAllAgents() {
    this.agents.clear();
  }
  
  /**
   * 执行代码编写任务
   * @param {string} taskId - 任务ID
   * @param {string} taskDescription - 任务描述
   * @param {object} context - 任务上下文
   * @returns {Promise<object>} 任务执行结果
   */
  async executeCodeWritingTask(taskId, taskDescription, context = {}) {
    // 创建临时Agent实例
    const agentId = `code-writer-${Date.now()}`;
    const agent = this.createAgent(agentId, {
      name: 'CodeWritingAgent',
      role: '代码编写专家',
      description: '专门负责代码生成和文件操作的智能体'
    });
    
    try {
      // 执行任务
      const result = await agent.handleCodeWritingTask(taskDescription, context);
      
      // 返回结果
      return {
        taskId,
        agentId,
        success: true,
        result
      };
    } catch (error) {
      return {
        taskId,
        agentId,
        success: false,
        error: error.message
      };
    } finally {
      // 清理临时Agent实例
      this.removeAgent(agentId);
    }
  }
  
  /**
   * 生成项目原型
   * @param {object} projectSpec - 项目规格说明
   * @returns {Promise<object>} 项目生成结果
   */
  async generateProjectPrototype(projectSpec) {
    const { projectName, pages, features } = projectSpec;
    
    // 创建专门的原型生成Agent
    const agentId = `prototype-generator-${Date.now()}`;
    const agent = this.createAgent(agentId, {
      name: 'PrototypeGenerator',
      role: '原型生成专家',
      description: '专门负责生成项目原型的智能体'
    });
    
    try {
      // 生成项目结构
      const projectStructure = await agent.generateProjectStructure(projectSpec);
      
      // 返回结果
      return {
        projectName,
        success: true,
        projectStructure,
        message: `项目 ${projectName} 的原型已生成`
      };
    } catch (error) {
      return {
        projectName,
        success: false,
        error: error.message,
        message: `项目 ${projectName} 的原型生成失败`
      };
    } finally {
      // 清理临时Agent实例
      this.removeAgent(agentId);
    }
  }
}

// 导出默认实例
export default new CodeWritingAgentManager();