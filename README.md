WS+: Dead Simple WebSockets
==============================

![tests](https://github.com/foxxyz/ws-plus/workflows/tests/badge.svg?branch=master)

Dead simple WebSocket communication for both Node.js and in-browser.

* Abstraction on top of the wonderful [`ws` library](https://www.npmjs.com/package/ws)
* Event-based
* Automatic reconnections
* Automatic connection support
* [Subscription support](#subscriptions)
* ES7 / Async support
* [Vue](https://vuejs.org/) plugin support (Vue 3 supported!)
* Fully tested

##### Contents

- [Requirements](#requirements)
- [Installation](#installation)
- [Examples](#usage-examples)
    - [Server](#server)
    - [Client](#client)
    - [Subscriptions](#subscriptions)
    - [Vue Plugin](#vue-plugin)
- [API Docs](#-api-docs)
    - [Class Client](#class-client)
    - [Class Server](#class-server)
    - [Class ServerClient](#class-serverclient)
    - [Vue Module](#vue-module-ws-plusvue)
- [Contributing](#contributing--tests)
- [License](#license)

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

### Subscriptions

WS+ supports subscriptions to allow clients to only receive certain messages if they are interested in them. Example below.

#### Example

##### Server-Side

```javascript
// Only clients that have subscribed to `specialMessage` will receive this
server.broadcastSubscribers('specialMessage', { secretCode: 1234 })
```

##### Client-Side

```javascript
client.on('specialMessage', ({ secretCode }) => {
    // Do some secret things
})

// Required to receive the message above
client.send('subscribe', 'specialMessage')
```

#### Multiple Subscriptions

You can also subscribe to multiple actions at the same time:

```javascript
client.send('subscribe', ['specialMessage', 'anotherAction'])
```

#### Unsubscribing

Unsubscribing is handled the same way as subscribing.

```javascript
client.send('unsubscribe', ['specialMessage', 'anotherAction'])
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

#### Usage in a Component

```javascript
export default {
    ...
    click() {
        this.$ws.send('ticket/request', { data: ... })
    }
}
```

#### Using with the Vue 3 Component API

The [`listen` helper](#listenactions--object-options---name-) automatically calls `.on` and `.off` for specified action when the component is mounted and unmounted.

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

#### Multiple Clients

You can connect to multiple WebSocket servers by passing a different name when calling `app.use()` (Vue 3) or `Vue.use()` (Vue 2). The default name is `ws`.

```javascript
import { createSocket } from 'ws-plus/vue'

// Connect to one client
const client1 = createSocket('ws://localhost:8082')
// Connect to another
const client2 = createSocket('ws://localhost:15600')

// Will be accessible as inject('$foo')
app.use(client1, { name: 'foo' })
// Will be accessible as inject('$bar')
app.use(client2, { name: 'bar' })
```

📝 API Docs
-----------

### Class `Client`

Clients connect to other WebSocket servers and can be created either in a back-end (Node) or front-end (browser) environment.

All incoming messages are emitted as action events and can be subscribed to via [`client.on()`](#clientoneventname--string-listener--functiondata-).

#### `new Client(url : String, options? = { reconnectInterval?, maxQueueSize?, autoConnect?, verbosity? })`

Create a new WebSocket client.

 - `url`: URL to connect to (example: `ws://localhost:8090`)

Options:

 - `autoConnect`: Automatically connect during construction. Set this to false if you prefer to call `.connect()` manually. (default: `true`)
 - `maxQueueSize`: Maximum amount of messages to queue when not connected (for example, if still awaiting connection) (default: `100`)
 - `reconnectInterval`: How many seconds to wait until attempting a reconnect when disconnected (default: `10`)
 - `verbosity`: Show more/less log messages (default: `1`). Set to `0` to silence.

#### Event: `'connect'`

Emitted when connection to a server succeeds.

#### Event: `'close'`

Emitted when the client closes, either normally or abnormally (E.G. during a reconnect).

#### `client.broadcast(action : String, data : Any)`

Send message to all other connected clients (including yourself).

Alias for calling [`client.send(action, data, true)`](#clientsendaction--string-data--any-bounce--boolean).

#### `client.close()`

Close socket.

#### `client.connect()`

Connect this client. Called automatically if [`reconnectInterval`](#new-clienturl--string-options---reconnectinterval-maxqueuesize-autoconnect-verbosity-) is set.

#### `client.on(eventName : String, listener : function(data) {})`

Listen for messages or events.

 - `eventName`: Event to listen for. Can be one of the [default events](#event-connect) or any message action sent by the server.
 - `listener`: Function to be called with `data` when action is received

#### `client.off(eventName : String, listener : Function)`

Stop listening for messages or events.

Alias for [client.removeListener()](https://nodejs.org/api/events.html#events_emitter_removelistener_eventname_listener)

 - `eventName`: Event to unregister. Can be one of the [default events](#event-connect) or any message action sent by the server.
 - `listener`: Function to unregister

#### `client.send(action : String, data : Any, bounce? : Boolean)`

Send message to server.

 - `action`: Action name
 - `data`: Data to send
 - `bounce`: Bounce message back to this and all other connected clients on the server (default: `false`)

### Class `Server`

Allows clients to connect to it. Only used in back-end environments.

#### `new Server(options? = { host?, port?, maxSendBuffer?, verbosity? })`

Create a new server.

Options:

 - `host`: Host to listen on (default: `127.0.0.1`). Use `0.0.0.0` to accept any incoming connection.
 - `port`: Port to listen on (default: `8090`)
 - `maxSendBuffer`: Size of the send buffer in bytes. This governs how much the server can queue to an unacknowledging recipient (for example, during slow connections) before giving up. Messages that exceed the send buffer are dropped. (default: `20000`)
 - `verbosity`: Show more/less log messages (default `1`). Use `0` to silence.

#### Event: `'connect'`

Special event emitted when a client connects to this server.

On emission, the listening function will be called with the `ServerClient` instance of the newly connected client.

#### `server.broadcast(action : String, data : Any, skipClient? : ServerClient) : Promise`

Broadcast a message to all clients.

 - `action`: Action name
 - `data`: Data to send
 - `skipClient`: A `ServerClient` that should not receive this broadcast

#### `server.broadcastSubscribers(action : String, data : Any) : Promise`

Broadcast a message only to clients subscribed to this action.

For more information, see [subscriptions](#subscriptions).

 - `action`: Action name
 - `data`: Data to send

#### `server.close() : Promise`

Close this server. `await` this method to ensure all clients have disconnected.

#### `server.on(eventName : String, listener : function(data, client) {})`

Listen for specific message actions from clients or events.

 - `eventName`: Event to listen for. Can be one of the default events or any message action sent by a client.
 - `listener`: Function to be called with the incoming `data` and the specific `client` who sent it

### Class `ServerClient`

A representation of each client connected to the server. These instances are automatically created by the server and should not be instantiated directly. However, `ServerClient` instances may be interacted via event listeners on `Server`.

#### `serverClient.deliver(action : String, data : Any) : Promise`

Deliver a message to this client only. Rejects if message could not be delivered.

Useful for critical information.

 - `action`: Action name
 - `data`: Data to send

#### `serverClient.send(action : String, data : Any) : Promise`

Send a message to this client only. Failures will not reject, but will log.

 - `action`: Action name
 - `data`: Data to send

#### `serverClient.toString() : String`

Return a string representation of this client.

### Vue Module (`ws-plus/vue`)

This module contains functions to ease development using [Vue.js](https://vuejs.org/).

[Usage Examples](#vue-plugin)

#### `createSocket(url: String, options? : {}) : Client`

Create and return a reactive socket.

 - `url`: URL to connect to (example: `ws://localhost:8090`)
 - `options`: Options to pass to to Client (see [`new Client()`](#new-clienturl--string-options---reconnectinterval-maxqueuesize-autoconnect-verbosity-) for all options)

#### `listen(actions : Object, options? : { name? })`

Register multiple listeners at once on a particular client.

 - `actions`: Object with action names as keys and listener functions as values

Options:
 - `name`: Websocket name to listen to (default: `ws`)

Example:
```javascript
function foo(incoming) {
    console.log(incoming)
}

listen({
    action1: foo,
    action2: foo
})
```
Equivalent to doing:
```javascript
const client = inject('$ws')

onMounted(() => {
    client.on('action1', foo)
    client.on('action2', foo)
})

onUnmounted(() => {
    client.off('action1', foo)
    client.off('action2', foo)
})
```

Contributing & Tests
--------------------

1. Install development dependencies: `npm install`
2. Run tests: `npm test`

License
-------

MIT
