const MockClient = require('ws')
const { Server } = require('../server')

describe('Server Creation', () => {
    it('should not fail', async() => {
        const server = new Server({ port: 54321, verbosity: 0 })
        await new Promise(res => server.server.on('listening', res))
        const mockClient = new MockClient('ws://localhost:54321')
        await new Promise((res, rej) => {
            mockClient.onopen = res
            mockClient.onerror = rej
        })
        expect(server.clients.length).toBe(1)
        await server.close()
    })
    it('delegates options to clients', async() => {
        const server = new Server({ port: 54321, verbosity: -1 })
        await new Promise(res => server.server.on('listening', res))
        const mockClient = new MockClient('ws://localhost:54321')
        await new Promise((res, rej) => {
            mockClient.onopen = res
            mockClient.onerror = rej
        })
        expect(server.clients[0].verbosity).toEqual(-1)
        await server.close()
    })
    it('allows host overrides', async() => {
        const info = jest.spyOn(console, 'info')
        const server = new Server({ host: '0.0.0.0'})
        await new Promise(res => server.server.on('listening', res))
        expect(info).toHaveBeenCalledWith('Serving websocket server at ws://0.0.0.0:8090. Awaiting clients...')
        await server.close()
    })
    it('sets sane defaults', async() => {
        const info = jest.spyOn(console, 'info')
        const server = new Server()
        await new Promise(res => server.server.on('listening', res))
        expect(info).toHaveBeenCalledWith('Serving websocket server at ws://127.0.0.1:8090. Awaiting clients...')
        await server.close()
    })
})
describe('Client Handling', () => {
    let server
    afterEach(async() => {
        await server.close()
    })
    beforeEach(async() => {
        server = new Server({ port: 54321, verbosity: 0 })
        await new Promise(res => server.server.on('listening', res))
    })
    it('accepts multiple connections', async() => {
        const clients = []
        for(let i = 0; i < 3; i++) {
            const mockClient = new MockClient('ws://localhost:54321')
            await new Promise((res, rej) => {
                mockClient.onopen = res
                mockClient.onerror = rej
            })
            clients.push(mockClient)
        }
        expect(server.clients.length).toBe(3)
    })
    it('removes clients', async() => {
        const clients = []
        for(let i = 0; i < 3; i++) {
            const mockClient = new MockClient('ws://localhost:54321')
            await new Promise((res, rej) => {
                mockClient.onopen = res
                mockClient.onerror = rej
            })
            clients.push(mockClient)
        }
        server.remove(server.clients[0])
        expect(server.clients.length).toBe(2)
    })
    it('broadcasts messages', async() => {
        const clients = []
        const receivers = []
        for(let i = 0; i < 3; i++) {
            const mockClient = new MockClient('ws://localhost:54321')
            await new Promise((res, rej) => {
                mockClient.onopen = res
                mockClient.onerror = rej
            })
            receivers.push(new Promise((res) => {
                mockClient.on('message', (data) => {
                    res(data == JSON.stringify(['testMessage', {testKey: 239}]))
                })
            }))
            clients.push(mockClient)
        }
        server.broadcast('testMessage', { testKey: 239 })
        const results = await Promise.all(receivers)
        expect(results).toEqual([true, true, true])
    })
    it('allows skipping of clients during broadcasts', async() => {
        const clients = []
        for(let i = 0; i < 3; i++) {
            const mockClient = new MockClient('ws://localhost:54321')
            await new Promise((res, rej) => {
                mockClient.onopen = res
                mockClient.onerror = rej
            })
            clients.push(mockClient)
        }
        const excludedClient = jest.spyOn(server.clients[0], 'send')
        const includedClient = jest.spyOn(server.clients[1], 'send')
        await server.broadcast('testMessage', { testKey: 239 }, server.clients[0])
        expect(includedClient).toHaveBeenCalled()
        expect(excludedClient).not.toHaveBeenCalled()
    })
    it('supports subscriptions', async() => {
        const clients = []
        const receivers = []
        for(let i = 0; i < 2; i++) {
            const mockClient = new MockClient('ws://localhost:54321')
            await new Promise((res, rej) => {
                mockClient.onopen = res
                mockClient.onerror = rej
            })
            receivers.push(new Promise((res, rej) => {
                let timeout = null
                mockClient.on('message', (data) => {
                    res(data === JSON.stringify(['specialMessage', {testKey: 239}]))
                    clearTimeout(timeout)
                })
                // Auto-timeout if no message received
                timeout = setTimeout(rej, 50)
            }))
            clients.push(mockClient)
            if (i === 0) mockClient.send(JSON.stringify(['subscribe', 'specialMessage']))
        }
        server.broadcastSubscribers('specialMessage', { testKey: 239 })
        await expect(receivers[0]).resolves.toBe(true)
        await expect(receivers[1]).rejects.toBe(undefined)
    })
    it('supports multiple subscriptions', async() => {
        const mockClient = new MockClient('ws://localhost:54321')
        await new Promise((res, rej) => {
            mockClient.onopen = res
            mockClient.onerror = rej
        })
        server.subscribe('test', server.clients[0])
        server.subscribe('test', server.clients[0])
        expect(server.subscribers.test.length).toEqual(2)
    })
    it('does not fail broadcasting to unset subscriptions', async() => {
        const result = server.broadcastSubscribers('fakeSubscription')
        expect(result).resolves.toEqual([])
    })
    it('releases subscriptions on disconnect', async() => {
        const mockClient = new MockClient('ws://localhost:54321')
        await new Promise((res, rej) => {
            mockClient.onopen = res
            mockClient.onerror = rej
        })
        server.subscribers['test'] = [server.clients[0]]
        server.remove(server.clients[0])
        expect(server.subscribers['test'].length).toBe(0)
    })
    it('supports unsubscriptions', async() => {
        const mockClient = new MockClient('ws://localhost:54321')
        await new Promise((res, rej) => {
            mockClient.onopen = res
            mockClient.onerror = rej
        })
        const receive = new Promise((res, rej) => {
            let timeout = null
            mockClient.on('message', (data) => {
                res(data === JSON.stringify(['specialMessage', { testKey: 239 }]))
                clearTimeout(timeout)
            })
            // Auto-timeout if no message received
            timeout = setTimeout(rej, 50)
        })
        // Force a subscription
        server.subscribers['specialMessage'] = [server.clients[0]]
        await mockClient.send(JSON.stringify(['unsubscribe', 'specialMessage']))
        await new Promise(res => setTimeout(res, 20))
        await server.broadcastSubscribers('specialMessage', { testKey: 239 })
        expect(receive).rejects.toBe(undefined)
    })
    it('does not fail unsubscribing from unset subscriptions', async() => {
        const mockClient = new MockClient('ws://localhost:54321')
        await new Promise((res, rej) => {
            mockClient.onopen = res
            mockClient.onerror = rej
        })
        server.unsubscribe('fakeSubscription', server.clients[0])
        expect(server.subscribers.fakeSubscription).toEqual(undefined)
    })
})

const TEST_MESSAGE = ['test', 'message']

describe('Server Client', () => {
    let mockClient, server
    afterEach(async() => {
        mockClient.close()
        await server.close()
    })
    beforeEach(async() => {
        server = new Server({ port: 54321, verbosity: 0 })
        mockClient = new MockClient('ws://localhost:54321')
        await new Promise((res, rej) => {
            mockClient.onopen = res
            mockClient.onerror = rej
        })
    })
    it('receives messages', async() => {
        const log = jest.spyOn(console, 'debug')
        const received = new Promise((res) => {
            server.clients[0].connection.on('message', res)
        })
        server.clients[0].verbosity = 2
        mockClient.send('["test", []]')
        await expect(received).resolves.toBe('["test", []]')
        expect(log).toHaveBeenCalledWith('Received \'test\':', [])
    })
    it('handles malformed messages', async() => {
        const error = jest.spyOn(console, 'error')
        const received = new Promise((res) => {
            server.clients[0].connection.on('message', res)
        })
        mockClient.send('test')
        await received
        expect(error).toHaveBeenCalledWith('Unparsable message received: test')
    })
    it('emits registered events', async() => {
        const emitted = new Promise((res) => {
            const listener = () => {
                res()
                server.off('test', listener)
            }
            server.on('test', listener)
        })
        await new Promise((res) => mockClient.send(JSON.stringify(TEST_MESSAGE), {}, res))
        await expect(emitted).resolves.toBe(undefined)
    })
    it('auto-broadcasts unregistered events', async() => {
        const otherMockClient = new MockClient('ws://localhost:54321')
        await new Promise((res, rej) => {
            otherMockClient.onopen = res
            otherMockClient.onerror = rej
        })
        const otherReceived = new Promise((res, rej) => {
            otherMockClient.on('message', (data) => {
                if (data === JSON.stringify(TEST_MESSAGE)) res()
                else rej()
            })
        })
        const received = new Promise((res, rej) => {
            let timer = null
            mockClient.on('message', (data) => {
                if (data === JSON.stringify(TEST_MESSAGE)) res()
                else rej()
                clearTimeout(timer)
            })
            // Auto-timeout if no message received
            timer = setTimeout(rej, 50)
        })
        mockClient.send(JSON.stringify(TEST_MESSAGE))
        await expect(otherReceived).resolves.toBe(undefined)
        await expect(received).rejects.toBe(undefined)
    })
    it('supports bouncing messages back', async() => {
        const otherMockClient = new MockClient('ws://localhost:54321')
        const bounceMessage = [...TEST_MESSAGE, true]
        await new Promise((res, rej) => {
            otherMockClient.onopen = res
            otherMockClient.onerror = rej
        })
        const otherReceived = new Promise(res => {
            otherMockClient.on('message', res)
        })
        const received = new Promise(res => {
            mockClient.on('message', res)
        })
        mockClient.send(JSON.stringify(bounceMessage))
        await expect(otherReceived).resolves.toBe(JSON.stringify(TEST_MESSAGE))
        await expect(received).resolves.toBe(JSON.stringify(TEST_MESSAGE))
    })
    it('sends messages', async() => {
        const client = server.clients[0]
        const received = new Promise((res) => {
            mockClient.on('message', res)
        })
        const result = client.send('testAction', 'testMessage')
        // Sent by our client
        await expect(result).resolves.toBe(undefined)
        // Received by the mock client
        await expect(received).resolves.toBe('["testAction","testMessage"]')
    })
    it('handles errors during sending', async() => {
        const client = server.clients[0]
        client.connection.close()
        const result = client.send('testAction', 'testMessage')
        await expect(result).rejects.toMatch(/Asynchronous error/)
    })
    it('handles buffer overflows', async() => {
        const client = server.clients[0]
        client.maxSendBuffer = 50
        Object.defineProperty(client.connection, 'bufferedAmount', {
            get: function() { return 70 }
        })
        const result = client.send('anotherAct', 'a really long message that exceeds the send buffer by a large margin')
        await expect(result).rejects.toMatch(/Send buffer overflow/)
    })
    it('reports ping latencies', async() => {
        const pong = new Promise(res => {
            server.clients[0].connection.on('pong', res)
        })
        await server.clients[0].ping()
        await pong
        expect(server.clients[0].latency).toBeGreaterThan(0)
    })
    it('resets pings on successful pong', async() => {
        server.clients[0].pong()
        expect(server.clients[0].pings).toEqual(0)
    })
    it('disconnects unreachable clients', async() => {
        const errorFunc = jest.spyOn(server.clients[0], 'error')
        // Manually close client connection
        const client = server.clients[0]
        client.connection.close()
        await client.ping()
        expect(errorFunc).toHaveBeenCalledWith('Error pinging client 0')
    })
    it('disconnects unresponsive clients', async() => {
        // Mock pong function to do nothing
        mockClient._sender.pong = () => {}
        const errorFunc = jest.spyOn(server.clients[0], 'error')
        server.clients[0].pingFrequency = 10
        await server.clients[0].ping()
        await new Promise(res => setTimeout(res, 50))
        expect(errorFunc).toHaveBeenCalledWith('No ping response from client 0')
    })
})