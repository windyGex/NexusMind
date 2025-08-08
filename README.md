# NexusMind - 智能体思维连接平台

> **NexusMind** - 下一代自主智能体系统，融合ReAct决策、短期记忆和MCP协议，打造无缝的AI交互体验

基于JavaScript的LLM自主智能体平台，支持ReAct决策、短期记忆和MCP协议，提供实时WebSocket通信和现代化Web界面。

## 快速开始

### 安装依赖
```bash
# 安装所有依赖（根目录、前端、后端）
npm run install:all
```

### 开发环境启动
```bash
# 方法一：使用启动脚本（推荐）
./start-dev.sh

# 方法二：使用 npm 命令
npm run dev:all

# 方法三：分别启动
npm run frontend  # 启动前端开发服务器
npm run backend   # 启动后端开发服务器
```

### 生产环境启动
```bash
# 构建前端
npm run build:frontend

# 启动生产环境（前端预览 + 后端服务）
npm run start:all
```

### 其他命令
```bash
# 测试
npm run test

# 高德地图相关
npm run amap
npm run amap-demo

# 快速开始示例
npm run quick-start
npm run quick-multi-mcp

# 多MCP示例
npm run multi-mcp
```

## 项目架构

```
nexusmind/
├── packages/
│   ├── frontend/     # React + Vite 前端
│   └── backend/      # Node.js + Express 后端
├── src/              # 核心智能体代码
├── examples/         # 示例代码
└── test/            # 测试文件
```

## 开发说明

- NexusMind前端运行在 `http://localhost:5173`
- 后端API运行在 `http://localhost:3002`
- 使用 `concurrently` 包来同时运行多个服务

## 🌐 访问地址

- **NexusMind界面**: http://localhost:5173
- **API服务**: http://localhost:3002
- **健康检查**: http://localhost:3002/api/health

## 🛠️ 技术栈

### 前端
- React 18 + Vite
- Ant Design 5
- WebSocket 实时通信
- React Markdown 渲染

### 后端
- Node.js + Express
- WebSocket 服务器
- 集成现有 Agent 核心
- CORS 和 Helmet 安全中间件

## 🎯 核心特性

### 🧠 智能决策引擎
- **ReAct模式** - 推理(Reasoning) + 行动(Acting) + 观察(Observation)
- **短期记忆系统** - 智能上下文管理和对话历史追踪
- **多工具集成** - 本地工具 + MCP协议工具无缝切换

### 🌐 实时交互平台
- **WebSocket实时通信** - 毫秒级响应，支持流式输出
- **智能状态监控** - 实时显示Agent状态、工具统计和连接状态
- **可视化工具调用** - 实时展示工具调用过程和结果
- **自动重连机制** - 网络异常自动恢复，确保服务连续性

### 🎨 现代化界面
- **Ant Design 5** - 企业级UI组件库，美观且易用
- **响应式设计** - 完美适配桌面端和移动端
- **实时状态指示** - 连接状态、处理状态一目了然
- **优雅的思考过程** - 弱化显示，不干扰主要对话

### 🔧 技术架构
- **前后端分离** - React 18 + Node.js + Express
- **模块化设计** - 核心Agent + 工具系统 + 通信层
- **可扩展架构** - 支持自定义工具和MCP服务器集成

## 📁 项目架构

```
nexusmind/
├── packages/
│   ├── backend/          # 后端服务
│   │   ├── src/
│   │   │   └── index.js  # 服务器入口
│   │   └── package.json
│   └── frontend/         # 前端应用
│       ├── src/
│       │   ├── components/   # React组件
│       │   ├── hooks/        # 自定义Hook
│       │   └── App.jsx       # 主应用
│       └── package.json
├── src/
│   ├── core/             # Agent核心逻辑
│   ├── tools/            # 工具系统
│   ├── memory/           # 记忆管理
│   └── mcp/              # MCP协议支持
└── start.sh              # 启动脚本
```

## 🔧 配置说明

### 环境变量

后端需要配置以下环境变量（可选）：

```bash
# 复制示例文件
cp packages/backend/env.example packages/backend/.env

# 编辑配置
OPENAI_API_KEY=your_openai_api_key_here
PORT=3001
FRONTEND_URL=http://localhost:5173
```

### API接口

#### REST API
- `GET /api/health` - 健康检查
- `GET /api/agent/status` - 获取Agent状态
- `POST /api/agent/reset` - 重置Agent
- `GET /api/agent/tools` - 获取可用工具

#### WebSocket消息
- `chat` - 发送聊天消息
- `ping` - 心跳检测
- `connection` - 连接确认
- `agent_start` - Agent开始处理
- `thinking` - 思考过程
- `tool_start` - 工具调用开始
- `tool_result` - 工具调用结果
- `agent_response` - Agent最终响应

## 🚀 部署

### 开发环境
```bash
npm run dev:all
```

### 生产环境
```bash
# 构建前端
cd packages/frontend && npm run build

# 启动后端
cd packages/backend && npm start
```

## 🤝 贡献

欢迎提交Issue和Pull Request！

## �� 许可证

MIT License 