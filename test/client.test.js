import { Client } from '..'

// Stand-in for a real WebSocket
class MockSocket {
    constructor(url) {
        this.url = url
        this.onmessage = () => {}
        this.onopen = () => {}
        this.onclose = () => {}
        // Simulate connection attempt
        setTimeout((() => {
            if (!this.url.startsWith('ws://') ) {
                const err = new Error(`connect ECONNREFUSED ${url}`)
                if (!this.onerror) {
                    throw err
                }
                this.onerror(err)
                this.close(1006)
            } else {
                this.onopen()
            }
        }).bind(this), 50)
    }
    close(code) {
        this.onclose({ code })
    }
    send() {}
}
global.WebSocket = MockSocket

const delay = (ms) => new Promise((res) => setTimeout(res, ms))

describe('Client', () => {
    it('should connect to a server', async () => {
        const client = new Client('ws://localhost:8888')
        await delay(60)
        expect(client.connected).toBe(true)
        client.close()
    })
    it('should emit connect events', async() => {
        const client = new Client('ws://localhost:8888')
        let flag = false
        client.on('connect', () => flag = true)
        await delay(60)
        expect(flag).toBe(true)
        client.close()
    })
    it('should send messages', async() => {
        const client = new Client('ws://localhost:8888')
        await delay(60)
        const sendFunction = jest.spyOn(client.socket, 'send')
        client.send('test', 'test')
        const message = JSON.stringify(['test', 'test'])
        expect(sendFunction).toHaveBeenCalledWith(message)
        client.close()
    })
    it('should broadcast messages', async() => {
        const client = new Client('ws://localhost:8888')
        await delay(60)
        const sendFunction = jest.spyOn(client.socket, 'send')
        client.broadcast('test', 'test')
        const message = JSON.stringify(['test', 'test', true])
        expect(sendFunction).toHaveBeenCalledWith(message)
        client.close()
    })
    it('should receive messages', async() => {
        const client = new Client('ws://localhost:8888')
        await delay(60)
        let flag = false
        client.on('testAction', (data) => flag = data)
        client.socket.onmessage({ data: '["testAction", "testData"]' })
        expect(flag).toBe('testData')
        client.close()
    })
    it('should allow listeners to be cleared', async() => {
        const client = new Client('ws://localhost:8888')
        await delay(60)
        let flag = false
        const f = (data) => flag = data
        client.on('testAction', f)
        client.off('testAction', f)
        client.socket.onmessage({ data: '["testAction", "testData"]' })
        expect(flag).toBe(false)
        client.close()
    })
    it('should queue messages when not connected', async() => {
        const client = new Client('ws://localhost:8888', { autoConnect: false })
        client.send('test', 'test')
        expect(client.queue.length).toBe(1)
    })
    it('should not exceed queue size when queuing messages', async() => {
        const client = new Client('ws://localhost:8888', { maxQueueSize: 2, autoConnect: false })
        client.send('test', 'test')
        client.send('test', 'test2')
        client.send('test', 'test3')
        expect(client.queue.length).toBe(2)
    })
    it('should send and clear queued messages on next connection', async() => {
        const client = new Client('ws://localhost:8888')
        client.queue = [['testAction', 'testData']]
        const sendFunction = jest.spyOn(client.socket, 'send')
        await delay(60)
        expect(sendFunction).toHaveBeenCalled()
        expect(client.queue.length).toBe(0)
        client.close()
    })
    it('should reconnect automatically', async() => {
        const client = new Client('ws://localhost:8888')
        // Set 10ms reconnect interval
        client.reconnectInterval = .01
        await delay(60)
        // Spy on connect function
        const connectFunction = jest.spyOn(client, 'connect')
        // Force close
        client.socket.close()
        // Wait at least reconnect interval
        await delay(100)
        expect(connectFunction).toHaveBeenCalled()
        client.close()
    })
    it('should retry initial connect automatically', async() => {
        const client = new Client('invalid-url')
        // Set 10ms reconnect interval
        client.reconnectInterval = .01
        await delay(60)
        // Spy on connect function
        const connectFunction = jest.spyOn(client, 'connect')
        // Wait at least reconnect interval
        await delay(100)
        expect(connectFunction).toHaveBeenCalled()
        // Trigger connection with valid URL
        client.url = 'ws://localhost:8888'
        // Wait at least reconnect interval for initial retry to finish
        await delay(100)
        client.close()
    })
})

describe('Vue Plugin', () => {
    let MockFramework
    beforeEach(() => {
        MockFramework = class {}
        MockFramework.util = { defineReactive: () => {}}
    })
    it('should be installable as a Vue plugin', async() => {
        const client = new Client('ws://localhost:8888', { autoConnect: false })
        client.install(MockFramework)
        const app = new MockFramework()
        expect(app.$ws).toBe(client)
    })
    it('should allow override of global reference name', async() => {
        const client = new Client('ws://localhost:8888', { autoConnect: false })
        client.install(MockFramework, { name: 'anotherSocket' })
        const app = new MockFramework()
        expect(app.$anotherSocket).toBe(client)
    })
})