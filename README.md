# AutoAgent - 基于JS的LLM自主智能体

一个功能完整的基于JavaScript实现的LLM自主智能体系统，支持CoT（Chain of Thought）和ReAct（Reasoning + Acting）决策方法，集成短期记忆缓存和MCP（Model Context Protocol）扩展协议。

## 🚀 特性

### 核心功能
- **智能决策**: 支持CoT（思维链）和ReAct（推理+行动）两种决策模式
- **短期记忆**: 基于缓存的记忆管理系统，支持相关性检索和时间衰减
- **工具调用**: 可扩展的工具注册表，支持动态工具注册和执行
- **MCP协议**: 完整的Model Context Protocol实现，支持外部工具集成
- **多Agent协作**: 支持多个智能体协作完成任务，包括角色专业化、任务分配、Agent间通信

### 技术架构
- **模块化设计**: 清晰的模块分离，易于扩展和维护
- **异步处理**: 全异步架构，支持高并发处理
- **错误处理**: 完善的错误处理和恢复机制
- **配置灵活**: 支持环境变量和配置文件管理

## 📦 安装

### 前置要求
- Node.js 18+ 
- npm 或 yarn
- OpenAI API密钥

### 安装步骤

1. 克隆项目
```bash
git clone <repository-url>
cd auto-agent
```

2. 安装依赖
```bash
npm install
```

3. 配置环境变量
```bash
cp env.example .env
```

编辑 `.env` 文件，设置必要的环境变量：
```env
# OpenAI API配置
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4

# 智能体配置
AGENT_NAME=AutoAgent
MAX_MEMORY_SIZE=1000
MEMORY_TTL=3600

# MCP服务器配置
MCP_SERVER_HOST=localhost
MCP_SERVER_PORT=3001

# 日志级别
LOG_LEVEL=info
```

## 🎯 使用方法

### 启动应用

```bash
# 启动智能体应用
npm start

# 开发模式（自动重启）
npm run dev
```

### 运行测试

```bash
# 运行所有测试
npm test
```

### 编程接口

```javascript
import app from './src/index.js';

// 初始化应用
await app.initialize();

// 启动应用
await app.start();

// 处理用户输入
const response = await app.processInput('你好，请介绍一下你自己');
console.log(response);

// 获取应用状态
const status = app.getStatus();
console.log(status);

// 重置智能体
app.resetAgent();

// 多Agent协作功能
// 创建协作任务
const taskId = await app.createCollaborativeTask('分析市场趋势并制定营销策略');

// 执行协作任务
const result = await app.executeCollaborativeTask(taskId);
console.log('协作任务结果:', result);

// 注册新的Agent
const { agentId, agent } = await app.registerNewAgent({
  name: 'SpecialistAgent',
  thinkingMode: 'cot',
  role: 'specialist'
}, 'analyst');

// 发送消息给其他Agent
await app.sendMessage(agentId, '需要你的专业分析', 'task_request');

// 广播消息给所有Agent
await app.broadcastMessage('项目进度更新', 'coordination');

// 获取协作统计信息
const collabStats = app.getCollaborationStats();
console.log('协作统计:', collabStats);

// 停止应用
await app.stop();

## 🏗️ 架构说明

### 核心模块

#### 1. Agent (智能体核心)
- **位置**: `src/core/Agent.js`
- **功能**: 智能体的主要逻辑，协调各个组件
- **特性**: 
  - 支持CoT和ReAct两种思考模式
  - 集成记忆管理和工具调用
  - 提供统一的用户交互接口

#### 2. MemoryManager (记忆管理器)
- **位置**: `src/core/MemoryManager.js`
- **功能**: 管理智能体的短期记忆
- **特性**:
  - 基于NodeCache的内存缓存
  - 支持相关性搜索
  - 时间衰减机制
  - 记忆类型分类

#### 3. LLMClient (LLM客户端)
- **位置**: `src/core/LLMClient.js`
- **功能**: 封装OpenAI API调用
- **特性**:
  - 支持文本生成和流式响应
  - 嵌入向量生成
  - 相似度计算
  - 连接测试

#### 4. ToolRegistry (工具注册表)
- **位置**: `src/core/ToolRegistry.js`
- **功能**: 管理智能体可用的工具
- **特性**:
  - 动态工具注册
  - 参数验证
  - 分类管理
  - 默认工具集

#### 5. DecisionEngine (决策引擎)
- **位置**: `src/core/DecisionEngine.js`
- **功能**: 协调LLM推理和工具调用
- **特性**:
  - 任务分析
  - 计划制定
  - 执行监控
  - 结果评估

#### 6. MCPServer (MCP服务器)
- **位置**: `src/mcp/MCPServer.js`
- **功能**: 实现Model Context Protocol
- **特性**:
  - WebSocket服务器
  - 工具和资源管理
  - 客户端连接管理
  - 协议兼容性

#### 7. AgentManager (Agent管理器)
- **位置**: `src/core/AgentManager.js`
- **功能**: 管理多个智能体的协作
- **特性**:
  - 多Agent注册和管理
  - 协作任务创建和分配
  - Agent间通信机制
  - 角色专业化支持
  - 任务执行监控

### 决策模式

#### CoT (Chain of Thought)
- **特点**: 线性思维推理，逐步分析问题
- **适用**: 逻辑推理、问题分析、知识问答
- **优势**: 推理过程清晰，易于理解

#### ReAct (Reasoning + Acting)
- **特点**: 循环推理和行动，支持工具调用
- **适用**: 复杂任务、需要外部信息的场景
- **优势**: 能够使用工具，处理动态信息

### 多Agent协作

#### 协作架构
- **AgentManager**: 中央协调器，管理所有Agent的生命周期
- **角色专业化**: 支持不同角色的Agent（analyst、executor、coordinator等）
- **任务分配**: 智能任务分解和分配机制
- **通信机制**: 支持点对点消息和广播通信

#### 协作模式
- **任务协作**: 多个Agent协作完成复杂任务
- **角色分工**: 不同角色Agent负责不同阶段的工作
- **并行执行**: 支持任务并行处理，提高效率
- **结果整合**: 自动整合多个Agent的工作结果

#### 通信类型
- **task_request**: 任务请求消息
- **task_response**: 任务响应消息
- **data_share**: 数据共享消息
- **coordination**: 协调消息
- **broadcast**: 广播消息

## 🔧 配置选项

### 智能体配置
```javascript
const agentConfig = {
  name: 'MyAgent',                    // 智能体名称
  thinkingMode: 'react',              // 思考模式: 'cot' | 'react'
  maxIterations: 10,                  // 最大迭代次数
  memory: {
    ttl: 3600,                        // 记忆过期时间（秒）
    maxSize: 1000                     // 最大记忆数量
  },
  llm: {
    apiKey: 'your-api-key',           // OpenAI API密钥
    model: 'gpt-4',                   // 模型名称
    temperature: 0.7,                 // 温度参数
    maxTokens: 1000                   // 最大token数
  }
};
```

### MCP服务器配置
```javascript
const mcpConfig = {
  host: 'localhost',                  // 服务器主机
  port: 3001,                        // 服务器端口
  // 其他WebSocket配置选项
};
```

## 🛠️ 扩展开发

### 添加新工具

```javascript
// 在ToolRegistry中注册新工具
tools.registerTool('my_tool', {
  name: 'my_tool',
  description: '我的自定义工具',
  category: 'custom',
  parameters: {
    input: {
      type: 'string',
      description: '输入参数'
    }
  },
  execute: async (args) => {
    // 工具执行逻辑
    return { result: '处理结果' };
  }
});
```

### 自定义记忆类型

```javascript
// 在MemoryManager中添加新的记忆类型
memory.add('custom_type', {
  content: '自定义记忆内容',
  metadata: { /* 额外信息 */ }
});
```

### 集成外部MCP客户端

```javascript
// 连接到MCP服务器
const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:3001');

ws.on('open', () => {
  // 发送初始化消息
  ws.send(JSON.stringify({
    jsonrpc: '2.0',
    id: 'init-1',
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'MyClient', version: '1.0.0' }
    }
  }));
});
```

## 📚 示例

### 多Agent协作示例

```javascript
import { AgentManager } from './src/core/AgentManager.js';
import { Agent } from './src/core/Agent.js';

// 创建Agent管理器
const manager = new AgentManager({
  maxAgents: 5,
  taskTimeout: 30000
});

// 创建不同角色的Agent
const analystAgent = new Agent({
  name: 'AnalystAgent',
  thinkingMode: 'cot',
  role: 'analyst',
  collaborationEnabled: true
});

const executorAgent = new Agent({
  name: 'ExecutorAgent',
  thinkingMode: 'react',
  role: 'executor',
  collaborationEnabled: true
});

// 注册Agent
const analystId = manager.registerAgent(analystAgent, 'analyst');
const executorId = manager.registerAgent(executorAgent, 'executor');

// 启用协作模式
analystAgent.enableCollaboration(manager);
executorAgent.enableCollaboration(manager);

// 创建协作任务
const taskId = await manager.createCollaborativeTask(
  '分析市场趋势并制定营销策略',
  { priority: 'high' }
);

// 执行协作任务
const result = await manager.executeCollaborativeTask(taskId);
console.log('协作任务结果:', result);

// Agent间通信
await analystAgent.sendMessage(executorId, '分析完成，请执行营销活动', 'task_request');
await executorAgent.broadcastMessage('营销活动执行进度：50%', 'coordination');
```

### 角色专业化示例

```javascript
// 创建专业化的Agent团队
const agents = [
  { name: 'ResearchAgent', role: 'researcher', description: '数据收集和研究' },
  { name: 'CreativeAgent', role: 'creative', description: '创意和设计' },
  { name: 'TechnicalAgent', role: 'technical', description: '技术实现' },
  { name: 'QualityAgent', role: 'quality', description: '质量检查' }
];

// 注册所有Agent
agents.forEach(config => {
  const agent = new Agent({
    name: config.name,
    role: config.role,
    collaborationEnabled: true
  });
  manager.registerAgent(agent, config.role);
  agent.enableCollaboration(manager);
});

// 执行复杂协作任务
const complexTaskId = await manager.createCollaborativeTask(
  '开发一个创新的移动应用，包括市场研究、创意设计、技术实现和质量保证'
);

const complexResult = await manager.executeCollaborativeTask(complexTaskId);
```

## 📊 性能监控

### 状态监控
```javascript
// 获取智能体状态
const agentStatus = agent.getStatus();
console.log('智能体状态:', agentStatus);

// 获取记忆统计
const memoryStats = agent.memory.getStats();
console.log('记忆统计:', memoryStats);

// 获取MCP服务器状态
const mcpStatus = mcpServer.getStatus();
console.log('MCP服务器状态:', mcpStatus);

// 获取协作统计
const collabStats = app.getCollaborationStats();
console.log('协作统计:', collabStats);

// 获取Agent管理器统计
const managerStats = agentManager.getStats();
console.log('Agent管理器统计:', managerStats);
```

### 性能指标
- **响应时间**: 平均处理时间
- **记忆使用**: 记忆数量和类型分布
- **工具调用**: 工具使用频率和成功率
- **决策质量**: 决策成功率和迭代次数
- **协作效率**: 任务分配和执行效率
- **Agent利用率**: 各Agent的工作负载分布
- **通信开销**: Agent间通信频率和延迟

## 🧪 测试

### 运行测试
```bash
# 运行所有测试
npm test

# 运行特定测试
node test/test.js
```

### 测试覆盖
- 单元测试: 各模块独立功能测试
- 集成测试: 模块间协作测试
- 性能测试: 负载和压力测试
- 协议测试: MCP协议兼容性测试

## 🔒 安全考虑

### API密钥安全
- 使用环境变量存储敏感信息
- 避免在代码中硬编码密钥
- 定期轮换API密钥

### 输入验证
- 所有用户输入都经过验证
- 工具参数类型检查
- 防止注入攻击

### 访问控制
- MCP服务器访问控制
- 工具执行权限管理
- 记忆访问权限控制

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- OpenAI 提供的强大LLM API
- Model Context Protocol 社区
- 所有贡献者和用户

## 📞 支持

如果您遇到问题或有建议，请：
1. 查看 [Issues](../../issues) 页面
2. 创建新的 Issue
3. 联系维护团队

---

**注意**: 这是一个实验性项目，请在生产环境中谨慎使用。 