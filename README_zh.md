# NexusMind - 自主智能体平台

> **NexusMind** - 下一代自主智能体系统，融合ReAct决策、短期记忆和MCP协议，打造无缝的AI交互体验

基于JavaScript的LLM自主智能体平台，支持ReAct决策、短期记忆、MCP协议支持、实时WebSocket通信和现代化Web界面。

## ✨ 功能特性

### 🧠 智能决策引擎
- **双重决策模式**: ReAct（推理+行动）和Plan & Solve模式
- **短期记忆系统**: 上下文管理和对话历史追踪
- **多工具集成**: 本地工具和MCP协议工具无缝切换
- **可视化进度跟踪**: Plan & Solve执行步骤的实时可视化

### 🌐 实时交互平台
- **WebSocket通信**: 毫秒级响应，支持流式输出
- **智能状态监控**: 实时智能体状态、工具统计和连接状态
- **可视化工具执行**: 实时显示工具调用过程和结果
- **自动重连**: 网络故障自动恢复

### 🎨 现代化Web界面
- **Ant Design 5**: 企业级UI组件
- **响应式设计**: 完美适配桌面端和移动端
- **实时状态指示器**: 清晰显示连接和处理状态
- **优雅的思考过程**: 流畅显示，不干扰主要对话
- **Plan & Solve可视化**: 悬浮进度指示器和逐步执行跟踪

### 🔧 先进架构
- **前后端分离**: React 18 + Node.js + Express
- **模块化设计**: 核心智能体 + 工具系统 + 通信层
- **可扩展架构**: 支持自定义工具和MCP服务器集成
- **网页抓取能力**: 内置内容提取和分析工具

## 🚀 快速开始

### 环境要求
- Node.js (推荐v18+)
- npm 或 yarn

### 安装
```bash
# 安装所有依赖（根目录、前端、后端）
npm run install:all
```

### 开发环境
```bash
# 方法1: 使用npm命令（推荐）
npm run dev:all

# 方法2: 分别启动
npm run frontend  # 启动前端开发服务器
npm run backend   # 启动后端开发服务器

# 方法3: 增强后端功能
npm run dev:all:enhanced

# 方法4: 调试模式
npm run dev:all:debug
```

### 生产环境
```bash
# 构建前端
npm run build:frontend

# 启动生产环境（前端预览 + 后端服务）
npm run start:all
```

## 🌐 访问地址

- **NexusMind界面**: http://localhost:5173
- **API服务**: http://localhost:3002
- **健康检查**: http://localhost:3002/api/health

## 🛠️ 技术栈

### 前端
- **React 18**: 具有并发特性的现代React
- **Vite**: 快速构建工具和开发服务器
- **Ant Design 5**: 企业级UI设计语言
- **WebSocket**: 实时双向通信
- **React Markdown**: 富文本渲染

### 后端
- **Node.js + Express**: 强大的服务端环境
- **WebSocket服务器**: 实时通信
- **Helmet & CORS**: 安全中间件
- **Morgan**: HTTP请求日志
- **dotenv**: 环境变量管理

### 核心智能体系统
- **ReAct决策引擎**: 推理 + 行动 + 观察
- **Plan & Solve模式**: 结构化任务分解和执行
- **记忆管理**: 短期上下文和对话历史
- **工具注册**: 动态工具选择和执行
- **MCP协议**: 模型上下文协议集成

### 工具与集成
- **网页抓取**: Playwright、Puppeteer、Cheerio
- **搜索分析**: SerpAPI集成
- **LLM集成**: OpenAI GPT模型
- **数据处理**: 自然语言处理、统计分析
- **文件处理**: CSV、XLSX、JSON处理

## 📁 项目结构

```
nexusmind/
├── packages/
│   ├── backend/              # 后端服务
│   │   ├── src/
│   │   │   ├── routes/       # API路由
│   │   │   ├── services/     # 业务逻辑
│   │   │   ├── tools/        # 后端专用工具
│   │   │   ├── utils/        # 工具函数
│   │   │   └── index.js      # 服务器入口点
│   │   └── scripts/          # 开发和监控脚本
│   └── frontend/             # 前端应用
│       ├── src/
│       │   ├── components/   # React组件
│       │   ├── hooks/        # 自定义React钩子
│       │   └── App.jsx       # 主应用
│       └── vite.config.js    # Vite配置
├── src/                      # 核心智能体系统
│   ├── core/                 # 智能体核心逻辑
│   │   ├── Agent.js          # 主智能体类
│   │   ├── MemoryManager.js  # 记忆管理
│   │   ├── ToolRegistry.js   # 工具管理
│   │   └── LLMClient.js      # LLM集成
│   ├── tools/                # 工具实现
│   ├── mcp/                  # MCP协议支持
│   └── utils/                # 工具函数和提示词
├── test/                     # 测试文件
└── temp/                     # 临时文件
```

## 🔧 配置

### 环境变量

在后端目录创建`.env`文件：

```bash
# OpenAI API配置
OPENAI_API_KEY=your_openai_api_key_here

# 服务器配置
PORT=3002
FRONTEND_URL=http://localhost:5173

# 开发配置
NODE_ENV=development
QUIET=false
```

### MCP服务器配置

在`temp/mcp-config.json`中配置MCP服务器：

```json
{
  "servers": [
    {
      "id": "example-server",
      "name": "示例MCP服务器",
      "serverUrl": "ws://localhost:8080",
      "type": "websocket",
      "apiKey": "可选的API密钥"
    }
  ]
}
```

## 📡 API参考

### REST API端点

- `GET /api/health` - 健康检查
- `GET /api/agent/status` - 获取智能体状态
- `POST /api/agent/reset` - 重置智能体状态
- `GET /api/agent/tools` - 获取可用工具
- `GET /api/mcp/config` - 获取MCP配置
- `POST /api/mcp/config` - 更新MCP配置

### WebSocket消息

#### 客户端到服务器
```javascript
// 发送聊天消息
{
  "type": "chat",
  "message": "您的问题",
  "thinkingMode": "react" // 或 "plan_solve"
}

// 中止当前任务
{
  "type": "abort"
}

// 连接检查
{
  "type": "ping"
}
```

#### 服务器到客户端
```javascript
// 连接建立
{
  "type": "connection",
  "clientId": "abc123",
  "message": "连接成功"
}

// 智能体开始处理
{
  "type": "agent_start",
  "message": "正在处理您的请求..."
}

// 思考过程（ReAct模式）
{
  "type": "thinking",
  "content": "智能体的推理过程"
}

// Plan & Solve状态更新
{
  "type": "plan_solve_update",
  "stage": "planning", // "analysis", "planning", "execution", "evaluation"
  "progress": {
    "currentStep": 1,
    "totalSteps": 5,
    "stepName": "数据分析",
    "stepType": "tool_call",
    "status": "running" // "completed", "failed"
  },
  "plan": [...], // 规划阶段后可用
  "reasoning": "详细推理过程"
}

// 工具执行开始
{
  "type": "tool_start",
  "tool": "web_scraper",
  "args": {...}
}

// 工具执行完成
{
  "type": "tool_result",
  "tool": "web_scraper",
  "result": {...}
}

// 流式响应
{
  "type": "stream_chunk",
  "content": "部分响应",
  "messageId": "msg123"
}

// 流式完成
{
  "type": "stream_complete",
  "content": "完整响应",
  "messageId": "msg123"
}
```

## 🧪 内置工具

### 网页抓取工具
- **web_scraper**: 从网页提取内容
- **batch_web_scraper**: 并发抓取多个页面
- **precise_content_extractor**: 使用CSS选择器提取特定内容
- **web_content_analyzer**: 分析网页内容和结构

### 搜索分析工具
- **search_analysis**: 综合搜索和分析能力
- **stock_investment_tools**: 股票市场分析和投资洞察

### 使用示例
```javascript
// 网页抓取
const result = await agent.tools.execute('web_scraper', {
  url: 'https://example.com',
  options: {
    extractText: true,
    extractLinks: true,
    extractMeta: true
  }
});

// 批量抓取
const results = await agent.tools.execute('batch_web_scraper', {
  urls: ['https://site1.com', 'https://site2.com'],
  options: {
    concurrency: 3,
    extractText: true
  }
});
```

## 🎯 决策模式

### ReAct模式
基于观察-行动循环的迭代推理：
1. **观察**: 分析当前情况和可用信息
2. **思考**: 推理下一步最佳行动
3. **行动**: 执行工具或提供响应
4. **重复**: 继续直到任务完成

### Plan & Solve模式
结构化任务分解和执行：
1. **任务分析**: 理解问题和需求
2. **计划创建**: 制定逐步执行计划
3. **计划执行**: 执行每个步骤并实时跟踪进度
4. **结果评估**: 评估结果并提供全面答案

## 🚀 部署

### 开发环境
```bash
# 以开发模式启动所有服务
npm run dev:all

# 使用增强日志监控后端
npm run monitor
```

### 生产环境
```bash
# 构建生产环境前端
npm run build:frontend

# 启动生产服务
npm run start:all
```

### Docker部署（可选）
```dockerfile
# Dockerfile示例
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3002
CMD ["npm", "start"]
```

## 🧪 测试

```bash
# 运行测试
npm test

# 专门测试网页抓取工具
node test/web-scraping-test.js

# 测试核心智能体功能
node test/test.js
```

## 🔍 故障排除

### 常见问题

1. **OpenAI API密钥未设置**
   ```bash
   # 设置OpenAI API密钥
   export OPENAI_API_KEY=your_key_here
   ```

2. **端口已被占用**
   ```bash
   # 在环境变量中更改端口
   PORT=3003 npm run backend
   ```

3. **WebSocket连接失败**
   - 确保后端在端口3002上运行
   - 检查防火墙设置
   - 验证环境变量中的FRONTEND_URL

4. **工具执行错误**
   - 检查工具权限和依赖
   - 验证MCP服务器配置
   - 查看详细错误消息的日志

## 📚 文档

详细文档请参考：
- [CHANGELOG.md](./CHANGELOG.md) - 版本历史和更新
- [CURSOR_SETUP.md](./CURSOR_SETUP.md) - IDE配置指南
- 项目wiki - 全面的技术文档

## 🤝 贡献

欢迎贡献！请遵循以下步骤：

1. Fork仓库
2. 创建功能分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'Add amazing feature'`
4. 推送到分支：`git push origin feature/amazing-feature`
5. 打开Pull Request

### 开发指南
- 遵循JavaScript ES6+标准
- 使用模块化架构模式
- 编写全面的测试
- 为新功能更新文档
- 遵循现有代码风格

## 📄 许可证

本项目采用MIT许可证 - 详情请参阅[LICENSE](LICENSE)文件。

## 🙏 致谢

- OpenAI提供GPT模型
- React和Vite社区
- Ant Design团队
- 所有贡献者和支持者

---

**由NexusMind团队用❤️制作**

[English](./README.md) | [中文](./README_zh.md)