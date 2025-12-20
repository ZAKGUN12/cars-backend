const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

class Logger {
  constructor() {
    this.level = process.env.NODE_ENV === 'production' ? LOG_LEVELS.WARN : LOG_LEVELS.DEBUG;
  }
  
  formatMessage(level, message, data) {
    const timestamp = new Date().toISOString();
    const dataStr = data ? ` ${JSON.stringify(data)}` : '';
    return `[${timestamp}] ${level}: ${message}${dataStr}`;
  }
  
  debug(message, data) {
    if (this.level <= LOG_LEVELS.DEBUG) {
      console.debug(this.formatMessage('DEBUG', message, data));
    }
  }
  
  info(message, data) {
    if (this.level <= LOG_LEVELS.INFO) {
      console.info(this.formatMessage('INFO', message, data));
    }
  }
  
  warn(message, data) {
    if (this.level <= LOG_LEVELS.WARN) {
      console.warn(this.formatMessage('WARN', message, data));
    }
  }
  
  error(message, error) {
    if (this.level <= LOG_LEVELS.ERROR) {
      console.error(this.formatMessage('ERROR', message, error));
    }
  }
}

module.exports = new Logger();