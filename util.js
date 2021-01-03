const THRESHOLDS = {
    debug: 2,
    info: 1,
    warn: 1,
    error: 1,
    log: 1
}

// Helper function to consider verbosity when logging
function createLogger({ verbosity }) {
    const log = function(delegate ,threshold, ...msg) {
        if (verbosity >= threshold) delegate(...msg)
    }
    const logger = {}
    for(const severity of ['debug', 'info', 'log', 'warn', 'error']) {
        logger[severity] = log.bind(null, console[severity], THRESHOLDS[severity])
    }
    return logger
}

module.exports = { createLogger }