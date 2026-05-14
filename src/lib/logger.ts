
type LogLevel = 'info' | 'warn' | 'error' | 'success';

interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  details?: any;
}

class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private listeners: ((logs: LogEntry[]) => void)[] = [];

  private constructor() {
    const savedLogs = localStorage.getItem('travelkit_system_logs');
    if (savedLogs) {
      try {
        this.logs = JSON.parse(savedLogs);
      } catch (e) {
        console.error('Failed to parse saved logs', e);
      }
    }

    // Capture global errors
    window.addEventListener('error', (event) => {
      this.error('System', `Global Error: ${event.message}`, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.error('System', `Unhandled Promise Rejection: ${event.reason}`, {
        reason: event.reason
      });
    });
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private addLog(level: LogLevel, category: string, message: string, details?: any) {
    const entry: LogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      details
    };

    this.logs.unshift(entry); // Add to the beginning

    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    this.saveToLocalStorage();
    this.notifyListeners();
    
    // Also log to console for development
    const consoleMethod = level === 'success' ? 'log' : level;
    (console[consoleMethod as keyof Console] as any)(`[${category}] ${message}`, details || '');
  }

  private saveToLocalStorage() {
    localStorage.setItem('travelkit_system_logs', JSON.stringify(this.logs));
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener([...this.logs]));
  }

  public info(category: string, message: string, details?: any) {
    this.addLog('info', category, message, details);
  }

  public warn(category: string, message: string, details?: any) {
    this.addLog('warn', category, message, details);
  }

  public error(category: string, message: string, details?: any) {
    this.addLog('error', category, message, details);
  }

  public success(category: string, message: string, details?: any) {
    this.addLog('success', category, message, details);
  }

  public getLogs(): LogEntry[] {
    return [...this.logs];
  }

  public clearLogs() {
    this.logs = [];
    this.saveToLocalStorage();
    this.notifyListeners();
  }

  public subscribe(listener: (logs: LogEntry[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
}

export const logger = Logger.getInstance();
