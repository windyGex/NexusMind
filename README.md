# NexusMind - Autonomous Intelligent Agent Platform

> **NexusMind** - Next-generation autonomous intelligent agent system integrating ReAct decision-making, short-term memory, and MCP protocol for seamless AI interaction experiences.

A JavaScript-based LLM autonomous agent platform featuring ReAct decision-making, short-term memory, MCP protocol support, real-time WebSocket communication, and modern web interface.

## ✨ Features

### 🧠 Intelligent Decision Engine
- **Dual Decision Modes**: ReAct (Reasoning + Acting) and Plan & Solve patterns
- **Short-term Memory System**: Context management and conversation history tracking
- **Multi-tool Integration**: Seamless switching between local tools and MCP protocol tools
- **Visual Progress Tracking**: Real-time visualization of Plan & Solve execution steps

### 🌐 Real-time Interaction Platform
- **WebSocket Communication**: Millisecond-level response with streaming output support
- **Intelligent Status Monitoring**: Real-time agent status, tool statistics, and connection status
- **Visual Tool Execution**: Real-time display of tool invocation process and results
- **Auto-reconnection**: Automatic recovery from network failures

### 🎨 Modern Web Interface
- **Ant Design 5**: Enterprise-grade UI components
- **Responsive Design**: Perfect adaptation for desktop and mobile
- **Real-time Status Indicators**: Clear display of connection and processing status
- **Elegant Thinking Process**: Streamlined display without interrupting main conversation
- **Plan & Solve Visualization**: Floating progress indicators and step-by-step execution tracking

### 🔧 Advanced Architecture
- **Frontend-Backend Separation**: React 18 + Node.js + Express
- **Modular Design**: Core Agent + Tool System + Communication Layer
- **Extensible Architecture**: Support for custom tools and MCP server integration
- **Web Scraping Capabilities**: Built-in tools for content extraction and analysis

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+ recommended)
- npm or yarn

### Installation
```bash
# Install all dependencies (root, frontend, backend)
npm run install:all
```

### Development Environment
```bash
# Method 1: Using npm commands (recommended)
npm run dev:all

# Method 2: Start separately
npm run frontend  # Start frontend dev server
npm run backend   # Start backend dev server

# Method 3: Enhanced backend features
npm run dev:all:enhanced

# Method 4: Debug mode
npm run dev:all:debug
```

### Production Environment
```bash
# Build frontend
npm run build:frontend

# Start production (frontend preview + backend service)
npm run start:all
```

## 🌐 Access URLs

- **NexusMind Interface**: http://localhost:5173
- **API Service**: http://localhost:3002
- **Health Check**: http://localhost:3002/api/health

## 🛠️ Technology Stack

### Frontend
- **React 18**: Modern React with concurrent features
- **Vite**: Fast build tool and development server
- **Ant Design 5**: Enterprise-class UI design language
- **WebSocket**: Real-time bidirectional communication
- **React Markdown**: Rich text rendering

### Backend
- **Node.js + Express**: Robust server-side environment
- **WebSocket Server**: Real-time communication
- **Helmet & CORS**: Security middleware
- **Morgan**: HTTP request logging
- **dotenv**: Environment variable management

### Core Agent System
- **ReAct Decision Engine**: Reasoning + Acting + Observation
- **Plan & Solve Mode**: Structured task decomposition and execution
- **Memory Management**: Short-term context and conversation history
- **Tool Registry**: Dynamic tool selection and execution
- **MCP Protocol**: Model Context Protocol integration

### Tools & Integrations
- **Web Scraping**: Playwright, Puppeteer, Cheerio
- **Real-time Search**: Google Serper API integration for live web search
- **Search & Analysis**: SerpAPI integration
- **LLM Integration**: OpenAI GPT models
- **Data Processing**: Natural language processing, statistics
- **File Handling**: CSV, XLSX, JSON processing

## 📁 Project Structure

```
nexusmind/
├── packages/
│   ├── backend/              # Backend service
│   │   ├── src/
│   │   │   ├── routes/       # API routes
│   │   │   ├── services/     # Business logic
│   │   │   ├── tools/        # Backend-specific tools
│   │   │   ├── utils/        # Utilities
│   │   │   └── index.js      # Server entry point
│   │   └── scripts/          # Development and monitoring scripts
│   └── frontend/             # Frontend application
│       ├── src/
│       │   ├── components/   # React components
│       │   ├── hooks/        # Custom React hooks
│       │   └── App.jsx       # Main application
│       └── vite.config.js    # Vite configuration
├── src/                      # Core agent system
│   ├── core/                 # Agent core logic
│   │   ├── Agent.js          # Main agent class
│   │   ├── MemoryManager.js  # Memory management
│   │   ├── ToolRegistry.js   # Tool management
│   │   └── LLMClient.js      # LLM integration
│   ├── tools/                # Tool implementations
│   ├── mcp/                  # MCP protocol support
│   └── utils/                # Utilities and prompts
├── test/                     # Test files
└── temp/                     # Temporary files
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory (see `.env.example` for reference):

```bash
# OpenAI API Configuration (Required)
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_API_BASE=https://api.openai.com/v1

# Serper API Configuration (Required for real-time search)
# Get your API key from: https://serper.dev/api-key
SERPER_API_KEY=your_serper_api_key_here

# Server Configuration
PORT=3001
FRONTEND_URL=http://localhost:5173

# Development Configuration
NODE_ENV=development
LOG_LEVEL=info
```

### Search Configuration

The SearchAgent now supports real-time web search using Google Serper API:

- **Real Search**: When `SERPER_API_KEY` is configured, the agent performs actual web searches
- **Fallback Mode**: When API key is missing, the agent uses fallback search results
- **Search Features**:
  - Organic search results from Google
  - News search integration
  - Chinese language optimization (gl=cn, hl=zh-cn)
  - Intelligent content type detection
  - Domain extraction and categorization
  - Up to 8 high-quality results per query

### MCP Server Configuration

Configure MCP servers in `temp/mcp-config.json`:

```json
{
  "servers": [
    {
      "id": "example-server",
      "name": "Example MCP Server",
      "serverUrl": "ws://localhost:8080",
      "type": "websocket",
      "apiKey": "optional-api-key"
    }
  ]
}
```

## 📡 API Reference

### REST API Endpoints

- `GET /api/health` - Health check
- `GET /api/agent/status` - Get agent status
- `POST /api/agent/reset` - Reset agent state
- `GET /api/agent/tools` - Get available tools
- `GET /api/mcp/config` - Get MCP configuration
- `POST /api/mcp/config` - Update MCP configuration

### WebSocket Messages

#### Client to Server
```javascript
// Send chat message
{
  "type": "chat",
  "message": "Your question here",
  "thinkingMode": "react" // or "plan_solve"
}

// Abort current task
{
  "type": "abort"
}

// Ping for connection check
{
  "type": "ping"
}
```

#### Server to Client
```javascript
// Connection established
{
  "type": "connection",
  "clientId": "abc123",
  "message": "Connection successful"
}

// Agent started processing
{
  "type": "agent_start",
  "message": "Processing your request..."
}

// Thinking process (ReAct mode)
{
  "type": "thinking",
  "content": "Agent's reasoning process"
}

// Plan & Solve status update
{
  "type": "plan_solve_update",
  "stage": "planning", // "analysis", "planning", "execution", "evaluation"
  "progress": {
    "currentStep": 1,
    "totalSteps": 5,
    "stepName": "Data analysis",
    "stepType": "tool_call",
    "status": "running" // "completed", "failed"
  },
  "plan": [...], // Available after planning stage
  "reasoning": "Detailed reasoning process"
}

// Tool execution started
{
  "type": "tool_start",
  "tool": "web_scraper",
  "args": {...}
}

// Tool execution completed
{
  "type": "tool_result",
  "tool": "web_scraper",
  "result": {...}
}

// Streaming response
{
  "type": "stream_chunk",
  "content": "Partial response",
  "messageId": "msg123"
}

// Stream completed
{
  "type": "stream_complete",
  "content": "Complete response",
  "messageId": "msg123"
}
```

## 🧪 Built-in Tools

### Web Scraping Tools
- **web_scraper**: Extract content from web pages
- **batch_web_scraper**: Scrape multiple pages concurrently
- **precise_content_extractor**: Extract specific content using CSS selectors
- **web_content_analyzer**: Analyze web page content and structure

### Search & Analysis Tools
- **web_search**: Real-time Google search via Serper API
- **search_analysis**: Comprehensive search and analysis capabilities
- **stock_investment_tools**: Stock market analysis and investment insights

### Example Usage
```javascript
// Web scraping
const result = await agent.tools.execute('web_scraper', {
  url: 'https://example.com',
  options: {
    extractText: true,
    extractLinks: true,
    extractMeta: true
  }
});

// Batch scraping
const results = await agent.tools.execute('batch_web_scraper', {
  urls: ['https://site1.com', 'https://site2.com'],
  options: {
    concurrency: 3,
    extractText: true
  }
});
```

## 🎯 Decision Modes

### ReAct Mode
Iterative reasoning with observation-action cycles:
1. **Observe**: Analyze current situation and available information
2. **Think**: Reason about the next best action
3. **Act**: Execute tools or provide responses
4. **Repeat**: Continue until task completion

### Plan & Solve Mode
Structured task decomposition and execution:
1. **Task Analysis**: Understand the problem and requirements
2. **Plan Creation**: Develop a step-by-step execution plan
3. **Plan Execution**: Execute each step with real-time progress tracking
4. **Result Evaluation**: Assess results and provide comprehensive answers

## 🚀 Deployment

### Development
```bash
# Start all services in development mode
npm run dev:all

# Monitor backend with enhanced logging
npm run monitor
```

### Production
```bash
# Build frontend for production
npm run build:frontend

# Start production services
npm run start:all
```

### Docker Deployment (Optional)
```dockerfile
# Dockerfile example
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3002
CMD ["npm", "start"]
```

## 🧪 Testing

```bash
# Run tests
npm test

# Test web scraping tools specifically
node test/web-scraping-test.js

# Test core agent functionality
node test/test.js
```

## 🔍 Troubleshooting

### Common Issues

1. **OpenAI API Key Not Set**
   ```bash
   # Set your OpenAI API key
   export OPENAI_API_KEY=your_key_here
   ```

2. **Port Already in Use**
   ```bash
   # Change port in environment variables
   PORT=3003 npm run backend
   ```

3. **WebSocket Connection Failed**
   - Ensure backend is running on port 3002
   - Check firewall settings
   - Verify FRONTEND_URL in environment variables

4. **Tool Execution Errors**
   - Check tool permissions and dependencies
   - Verify MCP server configurations
   - Review logs for detailed error messages

## 📚 Documentation

For detailed documentation, please refer to:
- [CHANGELOG.md](./CHANGELOG.md) - Version history and updates
- [CURSOR_SETUP.md](./CURSOR_SETUP.md) - IDE configuration guide
- Project wiki - Comprehensive technical documentation

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines
- Follow JavaScript ES6+ standards
- Use modular architecture patterns
- Write comprehensive tests
- Update documentation for new features
- Follow the existing code style

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenAI for GPT models
- React and Vite communities
- Ant Design team
- All contributors and supporters

---

**Made with ❤️ by the NexusMind Team**

[English](./README.md) | [中文](./README_zh.md)