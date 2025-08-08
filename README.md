# Auto Agent

基于JS的LLM自主智能体，支持ReAct决策、短期记忆和MCP协议

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

## 项目结构

```
auto-agent/
├── packages/
│   ├── frontend/     # React + Vite 前端
│   └── backend/      # Node.js + Express 后端
├── src/              # 核心智能体代码
├── examples/         # 示例代码
└── test/            # 测试文件
```

## 开发说明

- 前端运行在 `http://localhost:5173`
- 后端API运行在 `http://localhost:3002`
- 使用 `concurrently` 包来同时运行多个服务

## 📱 访问地址

- **前端界面**: http://localhost:5173
- **后端API**: http://localhost:3001
- **健康检查**: http://localhost:3001/api/health

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

## 🎯 功能特性

- 💬 **实时聊天界面** - 支持流式输出和消息历史
- 🤖 **智能体状态监控** - 实时显示Agent状态和工具统计
- 🔧 **工具调用可视化** - 实时显示工具调用过程和结果
- 📊 **WebSocket连接状态** - 显示前后端连接状态
- 🔄 **自动重连机制** - WebSocket断线自动重连
- 🎨 **现代化UI** - 基于Ant Design的美观界面
- 📱 **响应式设计** - 支持移动端和桌面端

## 📁 项目结构

```
auto-agent/
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
│   └── core/
│       └── agent.js      # Agent核心逻辑
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