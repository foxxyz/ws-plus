WS+: Dead Simple WebSockets
==============================

![tests](https://github.com/foxxyz/ws-plus/workflows/tests/badge.svg?branch=master)

Dead simple WebSocket communication for both Node.js and in-browser.

 * Abstraction on top of the wonderful [`ws` library](https://www.npmjs.com/package/ws)
 * Event-based
 * Automatic reconnections
 * Automatic connection support
 * Subscription support
 * ES7 / Async support
 * [Vue](https://vuejs.org/) plugin support (Vue 3 supported!)
 * Fully tested

Requirements
------------

 * Node 10+

Installation
------------

```shell
npm install ws-plus
```

Usage Examples
--------------

### Server

```javascript
const { Server } = require('ws-plus')

// Start server on port
const server = new Server({ port: 8088 })

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
import { Client } from 'ws-plus'

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

##### Vue 2

```javascript
import { Client } from 'ws-plus'

// Create your client
const socketClient = new Client('ws://localhost:8082')

// Make socket available to all components
Vue.use(socketClient, { name: 'ws' })
```

##### Vue 3

```javascript
import { createSocket } from 'ws-plus/vue'

// Create your client
const socketClient = createSocket('ws://localhost:8082')

// Make socket available to all components
app.use(socketClient)
```

#### Usage in a component

```javascript
export default {
    ...
    click() {
        this.$ws.send('ticket/request', { data: ... })
    }
}
```

#### Using with the Vue 3 Component API

The `listen` helper automatically calls `.on` and `.off` for specified action when the component is mounted and unmounted.

```javascript
import { inject } from 'vue'
import { listen } from 'ws-plus/vue'

export default {
    setup() {
        function receive({ ticket }) {
            console.info(`Ticket received: ${ticket}`)
        }

        listen({
            'ticket/receive': receive
        })

        const ws = inject('$ws')
        ws.send('ticket/request', { data: ... })
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
