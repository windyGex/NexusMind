/**
 * 公共日志管理系统
 * 支持不同级别的日志输出和调试模式控制
 * 供backend和src目录共同使用
 */

class Logger {
  constructor() {
    this.logLevel = process.env.LOG_LEVEL || 'info'; // debug, info, warn, error
    this.isDebugMode = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
    this.quietMode = process.env.QUIET === 'true';
    
    // 日志级别映射
    this.logLevels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
  }

  /**
   * 检查是否应该输出指定级别的日志
   */
  shouldLog(level) {
    if (this.quietMode) return false;
    return this.logLevels[level] >= this.logLevels[this.logLevel];
  }

  /**
   * 格式化日志消息
   */
  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    if (data) {
      return `${prefix} ${message} ${JSON.stringify(data, null, 2)}`;
    }
    return `${prefix} ${message}`;
  }

  /**
   * 调试日志
   */
  debug(message, data = null) {
    if (this.shouldLog('debug') && this.isDebugMode) {
      console.log(this.formatMessage('debug', message, data));
    }
  }

  /**
   * 信息日志
   */
  info(message, data = null) {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message, data));
    }
  }

  /**
   * 警告日志
   */
  warn(message, data = null) {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, data));
    }
  }

  /**
   * 错误日志
   */
  error(message, error = null) {
    if (this.shouldLog('error')) {
      const errorData = error ? {
        message: error.message,
        stack: error.stack,
        ...error
      } : null;
      console.error(this.formatMessage('error', message, errorData));
    }
  }

  /**
   * 成功日志
   */
  success(message, data = null) {
    if (this.shouldLog('info')) {
      console.log(`✅ ${this.formatMessage('info', message, data)}`);
    }
  }

  /**
   * 设置日志级别
   */
  setLogLevel(level) {
    if (this.logLevels.hasOwnProperty(level)) {
      this.logLevel = level;
      this.info(`日志级别已设置为: ${level}`);
    } else {
      this.warn(`无效的日志级别: ${level}`);
    }
  }

  /**
   * 启用/禁用调试模式
   */
  setDebugMode(enabled) {
    this.isDebugMode = enabled;
    this.info(`调试模式已${enabled ? '启用' : '禁用'}`);
  }

  /**
   * 启用/禁用静默模式
   */
  setQuietMode(enabled) {
    this.quietMode = enabled;
    this.info(`静默模式已${enabled ? '启用' : '禁用'}`);
  }

  /**
   * 获取当前配置
   */
  getConfig() {
    return {
      logLevel: this.logLevel,
      isDebugMode: this.isDebugMode,
      quietMode: this.quietMode
    };
  }
}

// 创建单例实例
const logger = new Logger();

export default logger; 