type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogCategory = 'auth' | 'security' | 'performance' | 'user' | 'system';

interface LogContext {
  component?: string;
  action?: string;
  category?: LogCategory;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  duration?: number;
  [key: string]: any;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  category: LogCategory;
  metadata: Record<string, any>;
}

export class Logger {
  private isDevelopment = import.meta.env.MODE === 'development';
  private readonly SENSITIVE_FIELDS = ['password', 'token', 'secret', 'credential', 'auth'];
  private component: string;

  constructor(component?: string) {
    this.component = component || 'App';
  }

  private formatMessage(
    level: LogLevel, 
    message: string, 
    context: LogContext = {},
    category: LogCategory = 'system'
  ): LogEntry {
    const timestamp = new Date().toISOString();
    const componentInfo = context.component ? `[${context.component}]` : '';
    const actionInfo = context.action ? `[${context.action}]` : '';
    
    // Remove sensitive data
    const sanitizedContext = this.sanitizeSensitiveData(context);
    
    // Add performance metrics if duration is provided
    if (context.duration) {
      sanitizedContext.performance = {
        duration: `${context.duration}ms`,
        timestamp
      };
    }

    return {
      timestamp,
      level,
      category,
      message: `${componentInfo}${actionInfo} ${message}`,
      metadata: sanitizedContext
    };
  }

  private sanitizeSensitiveData(data: any): any {
    if (!data) return data;
    
    if (typeof data === 'object') {
      const sanitized = { ...data };
      for (const key in sanitized) {
        if (this.SENSITIVE_FIELDS.some(field => key.toLowerCase().includes(field))) {
          sanitized[key] = '[REDACTED]';
        } else if (typeof sanitized[key] === 'object') {
          sanitized[key] = this.sanitizeSensitiveData(sanitized[key]);
        }
      }
      return sanitized;
    }
    
    return data;
  }

  private async persistLog(logEntry: LogEntry): Promise<void> {
    try {
      // Store in localStorage for development
      if (this.isDevelopment) {
        const logs = JSON.parse(localStorage.getItem('app_logs') || '[]');
        logs.push(logEntry);
        localStorage.setItem('app_logs', JSON.stringify(logs.slice(-1000))); // Keep last 1000 logs
      }

      // Send to backend in production
      if (!this.isDevelopment) {
        await fetch('/api/logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(logEntry)
        });
      }
    } catch (error) {
      console.error('Failed to persist log:', error);
    }
  }

  debug(message: string, context: LogContext = {}) {
    const logEntry = this.formatMessage('debug', message, context);
    console.debug(logEntry);
    this.persistLog(logEntry);
  }

  info(message: string, context: LogContext = {}) {
    const logEntry = this.formatMessage('info', message, context);
    console.info(logEntry);
    this.persistLog(logEntry);
  }

  warn(message: string, context: LogContext = {}) {
    const logEntry = this.formatMessage('warn', message, context);
    console.warn(logEntry);
    this.persistLog(logEntry);
  }

  error(message: string, error?: Error, category: LogCategory = 'system') {
    const errorContext: LogContext = {
      error: this.sanitizeSensitiveData(error),
      stack: error?.stack,
      code: error?.code,
    };
    const logEntry = this.formatMessage('error', message, errorContext, category);
    console.error(logEntry);
    this.persistLog(logEntry);
  }

  trackPerformance(action: string, duration: number, context?: LogContext) {
    this.info(`Performance: ${action}`, {
      ...context,
      duration,
      category: 'performance'
    });
  }
}

// Export both the class and a default instance
export const logger = new Logger();