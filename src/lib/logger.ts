import { db } from './db';

type LogLevel = 'info' | 'warn' | 'error' | 'success';

// Save original console methods to prevent infinite loops
const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
};


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

    this.interceptConsole();
    this.interceptFetch();
    this.setupRealtimeSubscription();
    this.checkDatabaseConnection();
  }

  private async checkDatabaseConnection() {
    try {
      // Intentar una consulta muy ligera para verificar que la conexión funciona.
      // Usamos limit(1) a una tabla que sepamos que existe, o simplemente dejamos que el ping devuelva la conexión
      const { error } = await db.from('system_logs').select('id').limit(1);
      
      if (!error) {
        this.success('System', '✅ Conexión a la base de datos (Neon) establecida correctamente. Base de datos operativa.');
      } else {
        this.error('System', '❌ Fallo en la conexión a la base de datos', error);
      }
    } catch (err: any) {
      this.error('System', '❌ Error crítico conectando a la base de datos', { message: err.message });
    }
  }

  private interceptFetch() {
    const originalFetch = window.fetch;
    // Lee tabla y acción del cuerpo de una llamada a /api/db
    const describe = (args: Parameters<typeof fetch>) => {
      const url = typeof args[0] === 'string' ? args[0] : (args[0] instanceof Request ? args[0].url : String(args[0]));
      if (!url.includes('/api/db')) return null;
      try {
        const body = JSON.parse(String(args[1]?.body || '{}'));
        if (body.table === 'system_logs') return null; // no registrar los propios logs
        return { url, table: String(body.table), action: String(body.action || 'select').toUpperCase() };
      } catch {
        return null;
      }
    };

    window.fetch = async (...args) => {
      const startTime = performance.now();
      const info = describe(args);
      try {
        const response = await originalFetch(...args);
        if (info) {
          const duration = Math.round(performance.now() - startTime);
          if (response.ok) {
            this.addLogInternal('success', 'Database', `${info.action} en tabla '${info.table}' (${duration}ms)`, { url: info.url, status: response.status }, false);
          } else {
            this.addLogInternal('error', 'Database', `Error ${info.action} en tabla '${info.table}'`, { url: info.url, status: response.status }, false);
          }
        }
        return response;
      } catch (error: any) {
        if (info) {
          this.addLogInternal('error', 'Database', `Fallo de red en tabla '${info.table}'`, { url: info.url, error: error.message }, false);
        }
        throw error;
      }
    };
  }

  private setupRealtimeSubscription() {
    // Neon no tiene canales en tiempo real: mientras la consola de logs esté abierta,
    // se consultan los registros nuevos cada 15 segundos.
    const w = window as unknown as { __tkLogPoll?: number };
    if (w.__tkLogPoll) window.clearInterval(w.__tkLogPoll); // evita duplicados con HMR
    w.__tkLogPoll = window.setInterval(async () => {
      if (this.listeners.length === 0) return;
      const { data, error } = await db
        .from('system_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(50);
      if (error || !data) return;

      const known = new Set(this.logs.map(l => l.id));
      const fresh: LogEntry[] = data
        .filter((row: any) => !known.has(row.id))
        .map((row: any) => ({
          id: row.id,
          timestamp: row.timestamp,
          level: row.level as LogLevel,
          category: row.category,
          message: row.message,
          details: row.details
        }));
      if (!fresh.length) return;

      this.logs = [...fresh, ...this.logs].slice(0, this.maxLogs);
      this.saveToLocalStorage();
      this.notifyListeners();
    }, 15000);
  }

  private interceptConsole() {
    const processArgs = (args: any[]): { message: string, details?: any } => {
      const messageParts: string[] = [];
      let details: any = undefined;

      args.forEach(arg => {
        if (typeof arg === 'string') {
          messageParts.push(arg);
        } else if (arg instanceof Error) {
          messageParts.push(arg.message);
          details = { ...details, stack: arg.stack, name: arg.name };
        } else if (typeof arg === 'object' && arg !== null) {
          // If it's an object and we haven't set details yet, use it as details. 
          // Otherwise, stringify it and add to message.
          if (!details) {
            details = arg;
          } else {
            try {
              messageParts.push(JSON.stringify(arg));
            } catch (e) {
              messageParts.push('[Object]');
            }
          }
        } else {
          messageParts.push(String(arg));
        }
      });

      return {
        message: messageParts.join(' ') || 'Log',
        details: Object.keys(details || {}).length > 0 ? details : undefined
      };
    };

    console.log = (...args) => {
      originalConsole.log(...args);
      const { message, details } = processArgs(args);
      this.addLogInternal('info', 'Console', message, details, false);
    };

    console.info = (...args) => {
      originalConsole.info(...args);
      const { message, details } = processArgs(args);
      this.addLogInternal('info', 'Console', message, details, false);
    };

    console.warn = (...args) => {
      originalConsole.warn(...args);
      const { message, details } = processArgs(args);
      this.addLogInternal('warn', 'Console', message, details, false);
    };

    console.error = (...args) => {
      originalConsole.error(...args);
      const { message, details } = processArgs(args);
      this.addLogInternal('error', 'Console', message, details, false);
    };
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private addLog(level: LogLevel, category: string, message: string, details?: any) {
    this.addLogInternal(level, category, message, details, true);
  }

  private addLogInternal(level: LogLevel, category: string, message: string, details: any, printToConsole: boolean) {
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
    
    // Also log to console for development (if it didn't originate from console interceptor)
    if (printToConsole) {
      const consoleMethod = level === 'success' ? 'log' : level;
      (originalConsole[consoleMethod as keyof typeof originalConsole] as any)(`[${category}] ${message}`, details || '');
    }

    // FIRE AND FORGET: Push to the database so it's visible globally across browsers
    // We don't await this so it doesn't block the UI
    db.from('system_logs').insert([{
      level,
      category,
      message,
      details: details ? JSON.parse(JSON.stringify(details)) : null // Ensure valid JSON
    }]).then(({ error }) => {
      if (error) {
        originalConsole.error('Error guardando log en la base:', error);
      }
    });
  }

  public async fetchRemoteLogs() {
    const { data, error } = await db
      .from('system_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(500);

    if (error) {
      originalConsole.error('Error leyendo logs de la base:', error);
      return;
    }

    if (data) {
      // Formato de la base -> formato local
      this.logs = data.map(row => ({
        id: row.id,
        timestamp: row.timestamp,
        level: row.level as LogLevel,
        category: row.category,
        message: row.message,
        details: row.details
      }));
      this.notifyListeners();
    }
  }

  public async clearRemoteLogs() {
    this.logs = [];
    this.notifyListeners();
    const { error } = await db.from('system_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    if (error) {
      originalConsole.error('Error borrando logs de la base:', error);
    }
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
