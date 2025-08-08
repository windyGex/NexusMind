#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class HotReloadMonitor {
  constructor() {
    this.startTime = Date.now();
    this.restartCount = 0;
    this.lastRestartTime = null;
    this.fileChanges = new Set();
  }

  start() {
    console.log('🔍 热更新监控器启动');
    console.log('📊 监控统计:');
    console.log('   - 启动时间:', new Date(this.startTime).toLocaleString());
    console.log('   - 监控目录: src/, ../src/');
    console.log('   - 文件类型: .js, .json, .mjs');
    console.log('─'.repeat(50));

    this.monitorFileChanges();
    this.startHealthCheck();
  }

  monitorFileChanges() {
    const watchPaths = [
      join(__dirname, '..', 'src'),
      join(__dirname, '..', '..', 'src')
    ];

    watchPaths.forEach(path => {
      if (fs.existsSync(path)) {
        console.log(`👀 监控目录: ${path}`);
        fs.watch(path, { recursive: true }, (eventType, filename) => {
          if (filename && this.isWatchedFile(filename)) {
            this.handleFileChange(filename, eventType);
          }
        });
      }
    });
  }

  isWatchedFile(filename) {
    const watchedExtensions = ['.js', '.json', '.mjs'];
    return watchedExtensions.some(ext => filename.endsWith(ext));
  }

  handleFileChange(filename, eventType) {
    const now = Date.now();
    this.fileChanges.add(filename);
    
    console.log(`📝 文件变更: ${filename} (${eventType})`);
    
    if (this.lastRestartTime && (now - this.lastRestartTime) < 2000) {
      console.log('⏳ 防抖中，忽略快速变更...');
      return;
    }

    this.lastRestartTime = now;
    this.restartCount++;
    
    console.log(`🔄 触发重启 (${this.restartCount} 次)`);
    this.logStats();
  }

  startHealthCheck() {
    setInterval(() => {
      this.checkServerHealth();
    }, 30000); // 每30秒检查一次
  }

  async checkServerHealth() {
    try {
      const response = await fetch('http://localhost:3002/api/health');
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ 服务健康检查通过 - ${new Date().toLocaleTimeString()}`);
      }
    } catch (error) {
      console.log(`⚠️  服务健康检查失败 - ${new Date().toLocaleTimeString()}`);
    }
  }

  logStats() {
    const uptime = Date.now() - this.startTime;
    const uptimeMinutes = Math.floor(uptime / 60000);
    
    console.log('📊 热更新统计:');
    console.log(`   - 运行时间: ${uptimeMinutes} 分钟`);
    console.log(`   - 重启次数: ${this.restartCount}`);
    console.log(`   - 变更文件: ${this.fileChanges.size} 个`);
    console.log(`   - 平均重启间隔: ${uptimeMinutes > 0 ? Math.floor(uptimeMinutes / this.restartCount) : 0} 分钟`);
    console.log('─'.repeat(30));
  }

  getStats() {
    return {
      uptime: Date.now() - this.startTime,
      restartCount: this.restartCount,
      fileChanges: this.fileChanges.size,
      lastRestart: this.lastRestartTime
    };
  }
}

// 启动监控器
const monitor = new HotReloadMonitor();
monitor.start();

// 处理退出信号
process.on('SIGINT', () => {
  console.log('\n📊 最终统计:');
  const stats = monitor.getStats();
  console.log(`   - 总运行时间: ${Math.floor(stats.uptime / 60000)} 分钟`);
  console.log(`   - 总重启次数: ${stats.restartCount}`);
  console.log(`   - 变更文件数: ${stats.fileChanges}`);
  console.log('👋 监控器已停止');
  process.exit(0);
}); 