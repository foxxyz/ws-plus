// For node.js usage outside of browsers
if (typeof(WebSocket) === 'undefined') {
    global.WebSocket = require('ws')
}
const EventEmitter = require('events')

class Client extends EventEmitter {
    // Support Vue components
    install(app, { name='ws' }={}) {
        // Vue 3
        if (app.config) {
            app.config.globalProperties[`$${name}`] = this
            app.provide(`$${name}`, this)
        }
        // Vue 2
        else {
            app.prototype[`$${name}`] = this
            app.util.defineReactive(this, 'connected', this.connected)
        }
    }
    constructor(url, { reconnectInterval=10, maxQueueSize=100, autoConnect=true, verbosity=1 }={}) {
        super()
        this.connected = false
        this.queue = []
        this.url = url
        this.reconnectInterval = reconnectInterval
        this.maxQueueSize = maxQueueSize
        this.verbosity = verbosity
        if (autoConnect) this.connect()
    }
    broadcast(action, data) {
        this.send(action, data, true)
    }
    close() {
        // Close with correct disconnection code
        this.socket.close(1000)
    }
    closed(e) {
        this.connected = false
        // Regular closure, do not reconnect
        if (e.code === 1000) return
        // Otherwise, reconnect
        console.warn(`Socket closed. Retrying in ${this.reconnectInterval} seconds...`)
        setTimeout(this.connect.bind(this), this.reconnectInterval * 1000)
    }
    error() {
        console.warn(`Socket connection to ${this.url} refused`)
    }
    connect() {
        this.socket = new WebSocket(this.url)
        this.socket.onerror = this.error.bind(this)
        this.socket.onmessage = this.receive.bind(this)
        this.socket.onopen = this.opened.bind(this)
        this.socket.onclose = this.closed.bind(this)
    }
    // Convenience method for EventEmitter.removeListener
    off() {
        this.removeListener(...arguments)
    }
    opened() {
        this.connected = true
        this.emit('connect', this)
        if (this.verbosity > 0) console.info(`Socket connected at ${this.socket.url}`)
        // Empty queue of messages waiting for connection
        while(this.queue.length) {
            this.send(...this.queue.shift())
        }
    }
    receive({ data }) {
        this.emit(...JSON.parse(data))
    }
    send(action, data, bounce) {
        // If not currently connect, queue for next connection
        if (!this.connected) {
            if (this.queue.length >= this.maxQueueSize) return
            console.warn(`'${action}' message queued, waiting for next connection...`)
            this.queue.push(arguments)
            if (this.queue.length === this.maxQueueSize) console.warn('Max queue size reached for socket, no further messages will be queued')
            return
        }
        const message = [action, data]
        if (bounce) message.push(bounce)
        this.socket.send(JSON.stringify(message))
    }
}

module.exports = { Client }
