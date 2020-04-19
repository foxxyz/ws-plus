Wizzle: Dead Simple WebSockets
==============================

Dead simple WebSocket communication for both Node.js and in-browser.

 * Abstraction on top of the wonderful [`ws` library](https://www.npmjs.com/package/ws)
 * Event-based
 * Automatic reconnections
 * Automatic connection support
 * Subscription support
 * ES7 / Async support
 * [Vue](https://vuejs.org/) plugin support
 * Fully tested

Installation
------------

```shell
npm install wizzle
```

Usage Examples
--------------

### Server

```javascript
const { Server } = require('wizzle')

// Start server on port
const server = new Server(8088)

// React to an incoming message
server.on('ticket/request', (data, client) => {
    // Respond to client
    client.send('ticket/response', { ticket: '123' })
    // Or respond to all clients
    server.broadcast('ticket/response', ...)
})
```

### Client

```javascript
import { Client } from 'wizzle'

const client = new Client('ws://localhost:8082')

// Observe connect events
client.on('connect', () => {
    console.info('Connection successful!')
})

// React to specific events
client.on('ticket/response', ({ ticket }) => {
    console.info(`Ticket received: ${ticket}`)
})

// Send a message
client.send('ticket/request', { someData: 'etc' })
```

### Vue Plugin

When creating your app:

```javascript
import { Client } from 'wizzle'

// Create your client
const socketClient = new Client('ws://localhost:8082')

// Make socket available to all components
app.use(socketClient, { name: 'ws' }) // Use Vue.use(socketClient, { name: 'ws' }) in Vue 2.x
```

Inside a component:

```javascript
export default {
    ...
    click() {
        this.$ws.send('ticket/request', { data: ... })
    }
}
```

Contributing & Tests
--------------------

1. Install development dependencies: `npm install`
2. Run tests: `npm test`

License
-------

MIT
