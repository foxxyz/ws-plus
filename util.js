// Helper function to consider verbosity when logging
function createLogger({ verbosity }) {
    const log = function(severity, msg) {
        if (!verbosity) return
        console[severity](msg)
    }
    return {
        info: log.bind(null, 'info'),
        warn: log.bind(null, 'warn'),
        error: log.bind(null, 'error')
    }
}

module.exports = { createLogger }