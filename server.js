const WebSocketServer = require('ws').Server
const { performance } = require('perf_hooks')
const EventEmitter = require('events')

class Server extends EventEmitter {
    constructor({ host='127.0.0.1', port=8090, verbosity=1 }={}) {
        super()
        this.clients = []
        this.idTracker = 0
        this.clientOptions = { verbosity }
        this.verbosity = verbosity
        this.subscribers = {}
        this.server = new WebSocketServer({ host, port, perMessageDeflate: false })
        this.server.on('connection', this.add.bind(this))
        // Allow clients to subscribe to specific events
        this.on('subscribe', this.subscribe.bind(this))
        this.on('unsubscribe', this.unsubscribe.bind(this))
        if (this.verbosity > 0) console.info(`Serving websocket server at ws://${this.server.options.host}:${this.server.options.port}. Awaiting clients...`)
    }
    add(connection) {
        this.clients.push(new ServerClient(this, connection, this.idTracker++, this.clientOptions))
    }
    async broadcast(action, data, skipClient) {
        return Promise.all(this.clients.map(c => skipClient == c ? Promise.resolve() : c.send(action, data)))
    }
    async broadcastSubscribers(action, data) {
        const subscribers = this.subscribers[action] || []
        return Promise.all(subscribers.map(c => c.send(action, data)))
    }
    async close() {
        await new Promise(res => this.server.close(res))
        // Wait for all clients to be disconnected
        return new Promise(res => {
            const poller = setInterval(() => {
                if (this.clients.length == 0) {
                    clearInterval(poller)
                    res()
                }
            }, 5)
        })
    }
    remove(client) {
        for(const key in this.subscribers) {
            this.subscribers[key] = this.subscribers[key].filter(c => c.id != client.id)
        }
        this.clients = this.clients.filter(c => c.id != client.id)
    }
    subscribe(actions, client) {
        if (this.verbosity > 0) console.info(`Client ${client.id} subscribing to ${actions}`)
        actions = [].concat(actions)
        for(const action of actions) {
            if (!this.subscribers[action]) this.subscribers[action] = []
            this.subscribers[action].push(client)
        }
    }
    unsubscribe(actions, client) {
        if (this.verbosity > 0) console.info(`Client ${client.id} unsubscribing from ${actions}`)
        actions = [].concat(actions)
        for(const action of actions) {
            if (!this.subscribers[action]) continue
            this.subscribers[action] = this.subscribers[action].filter(c => c.id != client.id)
        }
    }
}

class ServerClient {
    constructor(server, connection, id, { verbosity, maxSendBuffer }) {
        this.id = id
        this.connection = connection
        this.server = server
        this.pings = 0
        this.pingFrequency = 75000 // 75 second pings
        this.pingTimer = null
        this.lastPing = null
        this.verbosity = verbosity
        // Max allowed send buffer in bytes
        this.maxSendBuffer = maxSendBuffer || 20000
        this.connect()
        this.connection.on('close', this.disconnect.bind(this))
        this.connection.on('message', this.receive.bind(this))
        this.connection.on('error', this.error.bind(this))
        this.connection.on('pong', this.pong.bind(this))
    }
    connect() {
        if (this.verbosity > 0) console.info(`Connected ${this.toString()} (${this.server.clients.length + 1} total)`)
        this.pingTimer = setTimeout(this.ping.bind(this), this.pingFrequency)
        this.server.emit('connect', this)
    }
    // Attempt to deliver a message (rejects on fail)
    deliver(action, data) {
        // Skip if there's a lot of buffered data
        if (this.connection.bufferedAmount > this.maxSendBuffer) return Promise.reject('Send buffer overflow')
        return new Promise((res, rej) => {
            this.connection.send(JSON.stringify([action, data]), (e) => {
                // Error callback for async errors
                if (e) return rej(e.message)
                res()
            })
        })
    }
    disconnect() {
        clearTimeout(this.pingTimer)
        this.server.remove(this)
        if (this.verbosity > 0) console.info(`${this.toString()} disconnected. (${this.server.clients.length} remaining)`)
    }
    error(err) {
        console.error(err)
        this.disconnect()
    }
    async ping() {
        if (this.pings >= 2) {
            return this.error(`No ping response from client ${this.id}`)
        }
        try {
            await new Promise((res, rej) => {
                function callback(err) {
                    if (err) return rej(err)
                    res()
                }
                this.connection.ping(undefined, undefined, callback)
            })
        }
        catch(e) {
            return this.error(`Error pinging client ${this.id}`)
        }
        this.pings++
        this.lastPing = performance.now()
        if (this.verbosity > 0) console.log('Pinging client ' + this.id)
        clearTimeout(this.pingTimer)
        this.pingTimer = setTimeout(this.ping.bind(this), this.pingFrequency)
    }
    pong() {
        if (this.lastPing) {
            this.latency = performance.now() - this.lastPing
            if (this.verbosity > 0) console.log('Client ' + this.id + ' latency: ' + this.latency.toFixed(3) + 'ms')
        }
        this.pings = 0
    }
    receive(message) {
        var decoded = ''
        try {
            decoded = JSON.parse(message)
            if (this.verbosity > 1) console.debug(`Received '${decoded[0]}':`, decoded[1])
        } catch (e) {
            console.error(`Unparsable message received: ${message}`)
            return
        }
        // Execute action if registered
        if (this.server.listenerCount(decoded[0])) this.server.emit(decoded[0], decoded[1], this)
        // Otherwise, broadcast
        else this.server.broadcast(decoded[0], decoded[1], decoded[2] ? undefined : this)
    }
    async send(action, data) {
        try {
            await this.deliver(action, data)
        }
        // Log delivery errors
        catch(e) {
            console.error(`${this.toString()}: Unable to deliver "${action}" message: ${e}`)
        }
    }
    // Print out client info
    toString() {
        return `Client ${this.id}`
    }
}

module.exports = { Server }