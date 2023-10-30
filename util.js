const THRESHOLDS = {
    debug: 2,
    info: 1,
    warn: 1,
    error: 1,
    log: 1
}

// Helper function to consider verbosity when logging
export function createLogger({ verbosity }) {
    const log = function(delegate, threshold, ...msg) {
        if (verbosity >= threshold) delegate(...msg)
    }
    const logger = {}
    for (const severity of ['debug', 'info', 'log', 'warn', 'error']) {
        // eslint-disable-next-line no-console
        logger[severity] = log.bind(null, console[severity], THRESHOLDS[severity])
    }
    return logger
}
