#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class DevServer {
  constructor() {
    this.process = null;
    this.restartCount = 0;
    this.maxRestarts = 10;
    this.restartDelay = 2000;
  }

  start() {
    console.log('🚀 启动开发服务器...');
    console.log('📁 监控目录: src/, ../src/');
    console.log('🔄 热更新已启用');
    console.log('💡 提示: 输入 "rs" 手动重启服务');
    console.log('💡 提示: 按 Ctrl+C 停止服务');
    console.log('─'.repeat(50));

    this.spawnProcess();
  }

  spawnProcess() {
    const args = [
      '--config', 'nodemon.json',
      '--watch', 'src',
      '--watch', '../../src',
      '--ext', 'js,json,mjs',
      '--ignore', 'node_modules',
      '--delay', '1',
      '--verbose'
    ];

    this.process = spawn('nodemon', args, {
      stdio: 'inherit',
      cwd: join(__dirname, '..'),
      env: {
        ...process.env,
        NODE_ENV: 'development',
        WATCH_MODE: 'true'
      }
    });

    this.process.on('error', (error) => {
      console.error('❌ 启动失败:', error.message);
      process.exit(1);
    });

    this.process.on('exit', (code) => {
      if (code !== 0) {
        console.log(`⚠️  进程退出，代码: ${code}`);
        this.handleRestart();
      } else {
        console.log('👋 服务已正常停止');
        process.exit(0);
      }
    });

    // 处理信号
    process.on('SIGINT', () => {
      console.log('\n🛑 收到停止信号，正在关闭服务...');
      this.stop();
    });

    process.on('SIGTERM', () => {
      console.log('\n🛑 收到终止信号，正在关闭服务...');
      this.stop();
    });
  }

  handleRestart() {
    if (this.restartCount < this.maxRestarts) {
      this.restartCount++;
      console.log(`🔄 自动重启 (${this.restartCount}/${this.maxRestarts})...`);
      
      setTimeout(() => {
        this.spawnProcess();
      }, this.restartDelay);
    } else {
      console.error('❌ 重启次数过多，停止自动重启');
      process.exit(1);
    }
  }

  stop() {
    if (this.process) {
      this.process.kill('SIGTERM');
    }
    process.exit(0);
  }
}

// 启动开发服务器
const devServer = new DevServer();
devServer.start(); 