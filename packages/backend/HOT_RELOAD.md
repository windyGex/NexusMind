# 热更新功能说明

## 概述

本项目已配置完整的热更新功能，支持开发时代码变更自动重启服务。

## 功能特性

### 🔄 自动重启
- 监控 `src/` 和 `../src/` 目录下的文件变更
- 支持 `.js`, `.json`, `.mjs` 文件类型
- 防抖机制，避免频繁重启
- 自动重启失败恢复

### 📊 监控统计
- 重启次数统计
- 文件变更记录
- 运行时间监控
- 健康检查

### 🛠️ 开发工具
- 多种启动模式
- 调试模式支持
- 详细日志输出
- 手动重启命令

## 使用方法

### 基础热更新
```bash
# 标准热更新模式
npm run dev

# 增强热更新模式（推荐）
npm run dev:enhanced

# 调试模式
npm run dev:debug

# 详细日志模式
npm run dev:verbose
```

### 完整开发环境
```bash
# 启动前后端（标准模式）
npm run dev:all

# 启动前后端（增强模式）
npm run dev:all:enhanced

# 启动前后端（调试模式）
npm run dev:all:debug
```

### 监控模式
```bash
# 启动热更新监控器
npm run monitor
```

## 配置说明

### nodemon.json 配置
```json
{
  "watch": ["src/**/*", "../src/**/*"],
  "ext": "js,json,mjs",
  "ignore": ["node_modules/**/*", "*.test.js", "*.spec.js"],
  "delay": 1000,
  "verbose": true,
  "colours": true
}
```

### 监控目录
- `packages/backend/src/` - 后端源码
- `src/` - 核心源码
- 自动忽略 `node_modules` 和测试文件

### 重启策略
- 延迟重启：1000ms
- 最大重启次数：10次
- 防抖时间：2000ms
- 健康检查间隔：30秒

## 开发提示

### 手动重启
在服务运行时输入 `rs` 可手动重启服务。

### 停止服务
按 `Ctrl+C` 停止服务。

### 调试技巧
1. 使用 `npm run dev:debug` 启用调试模式
2. 使用 `npm run dev:verbose` 查看详细日志
3. 使用 `npm run monitor` 监控重启统计

### 故障排除
1. 如果服务无法启动，检查端口占用
2. 如果热更新不工作，检查文件权限
3. 如果重启频繁，调整防抖时间

## 性能优化

### 文件监控优化
- 只监控必要的文件类型
- 忽略大型目录（如 node_modules）
- 使用防抖机制减少重启频率

### 内存管理
- 自动清理旧进程
- 限制最大重启次数
- 定期健康检查

## 环境变量

### 开发环境
```bash
NODE_ENV=development
WATCH_MODE=true
DEBUG=true
```

### 调试环境
```bash
NODE_ENV=development
DEBUG=true
DEBUG_PORT=9229
```

## 注意事项

1. **文件保存**：确保文件完全保存后再进行测试
2. **端口冲突**：如果端口被占用，服务会自动停止
3. **内存使用**：长时间开发可能占用较多内存
4. **网络连接**：确保网络连接稳定，避免MCP工具连接问题

## 故障排除

### 常见问题

#### 1. 服务无法启动
```bash
# 检查端口占用
lsof -i :3002

# 杀死占用进程
kill -9 <PID>

# 重新启动
npm run dev
```

#### 2. 热更新不工作
```bash
# 检查文件权限
ls -la src/

# 重新安装依赖
npm run install:all

# 清理缓存
npm run clean
```

#### 3. 重启过于频繁
- 调整 `nodemon.json` 中的 `delay` 值
- 检查是否有循环依赖
- 使用 `npm run dev:enhanced` 获得更好的控制

### 日志分析
- 查看控制台输出的重启信息
- 使用 `npm run monitor` 获取详细统计
- 检查错误日志中的具体错误信息 