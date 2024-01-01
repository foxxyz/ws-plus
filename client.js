import EventEmitter from 'events'
import { createLogger } from './util.js'
import { JSONArraySerializer } from './serializers.js'

export class Client extends EventEmitter {
    // Support Vue components
    install(app, { name = 'ws' } = {}) {
        app.config.globalProperties[`$${name}`] = this
        app.provide(`$${name}`, this)
    }
    constructor(url, { reconnectInterval = 10, maxQueueSize = 100, autoConnect = true, verbosity = 1, serializer = JSONArraySerializer } = {}) {
        super()
        this.connected = false
        this.queue = []
        this.url = url
        this.reconnectInterval = reconnectInterval
        this.maxQueueSize = maxQueueSize
        this.serializer = serializer
        this.log = createLogger({ verbosity })
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
        this.emit('close')
        // Regular closure, do not reconnect
        if (e.code === 1000) return
        // Otherwise, reconnect
        this.log.warn(`Socket closed. Retrying in ${this.reconnectInterval} seconds...`)
        setTimeout(this.connect.bind(this), this.reconnectInterval * 1000)
    }
    error() {
        this.log.warn(`Socket connection to ${this.url} refused`)
    }
    async connect() {
        // For node.js usage outside of browsers
        if (typeof WebSocket === 'undefined') {
            global.WebSocket = (await import('ws')).WebSocket
        }
        this.socket = new WebSocket(this.url)
        this.socket.onerror = this.error.bind(this)
        this.socket.onmessage = this.receive.bind(this)
        this.socket.onopen = this.opened.bind(this)
        this.socket.onclose = this.closed.bind(this)
    }
    opened() {
        this.connected = true
        this.emit('connect', this)
        this.log.info(`Socket connected at ${this.socket.url}`)
        // Empty queue of messages waiting for connection
        while (this.queue.length) {
            this.send(...this.queue.shift())
        }
    }
    receive({ data }) {
        this.emit(...this.serializer.decode(data))
    }
    send(action, data, bounce) {
        // If not currently connect, queue for next connection
        if (!this.connected) {
            if (this.queue.length >= this.maxQueueSize) return
            this.log.warn(`'${action}' message queued, waiting for next connection...`)
            this.queue.push([action, data, bounce])
            if (this.queue.length === this.maxQueueSize) this.log.warn('Max queue size reached for socket, no further messages will be queued')
            return
        }
        this.socket.send(this.serializer.encode(action, data, bounce))
    }
}
