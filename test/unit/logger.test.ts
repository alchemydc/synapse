import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Logger Service', () => {
    const originalEnv = process.env;
    let consoleLogSpy: any;
    let consoleErrorSpy: any;
    let consoleWarnSpy: any;
    let consoleDebugSpy: any;

    beforeEach(() => {
        vi.resetModules();
        process.env = { ...originalEnv };
        consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => { });
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
        consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => { });
    });

    afterEach(() => {
        process.env = originalEnv;
        vi.restoreAllMocks();
    });

    async function getLogger() {
        return (await import('../../src/utils/logger')).logger;
    }

    it('should log everything when level is debug', async () => {
        process.env.LOG_LEVEL = 'debug';
        const logger = await getLogger();

        logger.debug('debug msg');
        logger.info('info msg');
        logger.warn('warn msg');
        logger.error('error msg');

        expect(consoleDebugSpy).toHaveBeenCalledWith('[DEBUG]', 'debug msg');
        expect(consoleLogSpy).toHaveBeenCalledWith('[INFO]', 'info msg');
        expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN]', 'warn msg');
        expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR]', 'error msg');
    });

    it('should log info and above when level is info', async () => {
        process.env.LOG_LEVEL = 'info';
        const logger = await getLogger();

        logger.debug('debug msg');
        logger.info('info msg');
        logger.warn('warn msg');
        logger.error('error msg');

        expect(consoleDebugSpy).not.toHaveBeenCalled();
        expect(consoleLogSpy).toHaveBeenCalledWith('[INFO]', 'info msg');
        expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN]', 'warn msg');
        expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR]', 'error msg');
    });

    it('should log warn and above when level is warn', async () => {
        process.env.LOG_LEVEL = 'warn';
        const logger = await getLogger();

        logger.debug('debug msg');
        logger.info('info msg');
        logger.warn('warn msg');
        logger.error('error msg');

        expect(consoleDebugSpy).not.toHaveBeenCalled();
        expect(consoleLogSpy).not.toHaveBeenCalled();
        expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN]', 'warn msg');
        expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR]', 'error msg');
    });

    it('should log error only when level is error', async () => {
        process.env.LOG_LEVEL = 'error';
        const logger = await getLogger();

        logger.debug('debug msg');
        logger.info('info msg');
        logger.warn('warn msg');
        logger.error('error msg');

        expect(consoleDebugSpy).not.toHaveBeenCalled();
        expect(consoleLogSpy).not.toHaveBeenCalled();
        expect(consoleWarnSpy).not.toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR]', 'error msg');
    });

    it('should default to info if LOG_LEVEL is invalid or missing', async () => {
        delete process.env.LOG_LEVEL;
        const logger = await getLogger();

        logger.debug('debug msg');
        logger.info('info msg');

        expect(consoleDebugSpy).not.toHaveBeenCalled();
        expect(consoleLogSpy).toHaveBeenCalledWith('[INFO]', 'info msg');
    });
});
