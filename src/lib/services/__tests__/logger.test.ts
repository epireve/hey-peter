import { logger, LogLevel } from '../logger';

describe('Logger Service', () => {
  let consoleSpy: {
    debug: jest.SpyInstance;
    info: jest.SpyInstance;
    warn: jest.SpyInstance;
    error: jest.SpyInstance;
    log: jest.SpyInstance;
  };

  beforeEach(() => {
    consoleSpy = {
      debug: jest.spyOn(console, 'debug').mockImplementation(),
      info: jest.spyOn(console, 'info').mockImplementation(),
      warn: jest.spyOn(console, 'warn').mockImplementation(),
      error: jest.spyOn(console, 'error').mockImplementation(),
      log: jest.spyOn(console, 'log').mockImplementation(),
    };
    
    // Reset logger state
    logger.clearLogs();
    logger.setMinLevel(LogLevel.DEBUG);
    // Enable console logging for tests with pretty format
    logger.setConfig({ 
      enableConsole: true, 
      format: 'pretty',
      enableStructuredLogging: false
    });
  });

  afterEach(() => {
    Object.values(consoleSpy).forEach(spy => spy.mockRestore());
  });

  describe('Basic logging', () => {
    it('should log debug messages', () => {
      logger.debug('Debug message', { test: true });
      
      expect(consoleSpy.debug).toHaveBeenCalled();
      const logs = logger.getRecentLogs(1);
      expect(logs[0]).toMatchObject({
        level: LogLevel.DEBUG,
        message: 'Debug message',
        metadata: { test: true }
      });
    });

    it('should log info messages', () => {
      logger.info('Info message');
      
      expect(consoleSpy.info).toHaveBeenCalled();
      const logs = logger.getRecentLogs(1);
      expect(logs[0]).toMatchObject({
        level: LogLevel.INFO,
        message: 'Info message'
      });
    });

    it('should log warnings', () => {
      logger.warn('Warning message');
      
      expect(consoleSpy.warn).toHaveBeenCalled();
      const logs = logger.getRecentLogs(1);
      expect(logs[0]).toMatchObject({
        level: LogLevel.WARN,
        message: 'Warning message'
      });
    });

    it('should log errors with Error objects', () => {
      const error = new Error('Test error');
      logger.error('Error occurred', error);
      
      expect(consoleSpy.error).toHaveBeenCalled();
      const logs = logger.getRecentLogs(1);
      expect(logs[0]).toMatchObject({
        level: LogLevel.ERROR,
        message: 'Error occurred',
        metadata: {
          error: 'Test error',
          stack: expect.any(String)
        }
      });
    });
  });

  describe('Log levels', () => {
    it('should respect minimum log level', () => {
      logger.setMinLevel(LogLevel.WARN);
      
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warning message');
      logger.error('Error message');
      
      const logs = logger.getRecentLogs();
      expect(logs).toHaveLength(2);
      expect(logs[0].level).toBe(LogLevel.WARN);
      expect(logs[1].level).toBe(LogLevel.ERROR);
    });
  });

  describe('Correlation IDs', () => {
    it('should include correlation ID in logs', () => {
      const correlationId = 'test-correlation-123';
      logger.setCorrelationId(correlationId);
      
      logger.info('Test message');
      
      const logs = logger.getRecentLogs(1);
      expect(logs[0].correlationId).toBe(correlationId);
    });
  });

  describe('Performance tracking', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should track performance timers', () => {
      logger.startTimer('test-operation');
      
      // Advance time by 100ms
      jest.advanceTimersByTime(100);
      
      logger.endTimer('test-operation');
      
      const logs = logger.getRecentLogs(1);
      expect(logs[0]).toMatchObject({
        level: LogLevel.INFO,
        message: expect.stringContaining('Performance: test-operation'),
        metadata: expect.objectContaining({
          duration: '100.00ms'
        })
      });
    });
  });

  describe('Child loggers', () => {
    it('should create child logger with additional metadata', () => {
      const childLogger = logger.child({ component: 'TestComponent' });
      
      childLogger.info('Child logger message', { extra: 'data' });
      
      const logs = logger.getRecentLogs(1);
      expect(logs[0]).toMatchObject({
        metadata: {
          component: 'TestComponent',
          extra: 'data'
        }
      });
    });
  });
});