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
    describe('Basic Operation', () => {
        let client
        beforeEach(() => {
            client = new Client('ws://localhost:8888')
        })
        afterEach(() => {
            client.close()
        })
        it('connects', async () => {
            await delay(60)
            expect(client.connected).toBe(true)
        })
        it('emits connect events', async() => {
            let flag = false
            client.on('connect', () => flag = true)
            await delay(60)
            expect(flag).toBe(true)
        })
        it('sends messages', async() => {
            await delay(60)
            const sendFunction = jest.spyOn(client.socket, 'send')
            client.send('test', 'test')
            const message = JSON.stringify(['test', 'test'])
            expect(sendFunction).toHaveBeenCalledWith(message)
        })
        it('broadcasts messages', async() => {
            await delay(60)
            const sendFunction = jest.spyOn(client.socket, 'send')
            client.broadcast('test', 'test')
            const message = JSON.stringify(['test', 'test', true])
            expect(sendFunction).toHaveBeenCalledWith(message)
        })
        it('receives messages', async() => {
            await delay(60)
            let flag = false
            client.on('testAction', (data) => flag = data)
            client.socket.onmessage({ data: '["testAction", "testData"]' })
            expect(flag).toBe('testData')
        })
        it('allows clearing of listeners', async() => {
            await delay(60)
            let flag = false
            const f = (data) => flag = data
            client.on('testAction', f)
            client.off('testAction', f)
            client.socket.onmessage({ data: '["testAction", "testData"]' })
            expect(flag).toBe(false)
        })
        it('clears queued messages on reconnect', async() => {
            client.queue = [['testAction', 'testData']]
            const sendFunction = jest.spyOn(client.socket, 'send')
            await delay(60)
            expect(sendFunction).toHaveBeenCalled()
            expect(client.queue.length).toBe(0)
        })
        it('reconnects automatically', async() => {
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
        })
    })
    describe('Edge Cases', () => {
        it('queues messages when not connected', async() => {
            const client = new Client('ws://localhost:8888', { autoConnect: false })
            client.send('test', 'test')
            expect(client.queue.length).toBe(1)
        })
        it('prevents message queue overflow', async() => {
            const client = new Client('ws://localhost:8888', { maxQueueSize: 2, autoConnect: false })
            client.send('test', 'test')
            client.send('test', 'test2')
            client.send('test', 'test3')
            expect(client.queue.length).toBe(2)
        })
        it('retries initial connect automatically', async() => {
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
        it('does not log messages when silenced', async() => {
            const infoLogger = jest.spyOn(console, 'info')
            const warnLogger = jest.spyOn(console, 'warn')
            const client = new Client('ws://localhost:8888', { verbosity: 0 })
            await delay(60)
            // Force close
            client.socket.close()
            expect(infoLogger).not.toHaveBeenCalled()
            expect(warnLogger).not.toHaveBeenCalled()
            client.close()
        })
        it('logs messages in verbose mode', async() => {
            const infoLogger = jest.spyOn(console, 'info')
            const warnLogger = jest.spyOn(console, 'warn')
            const client = new Client('ws://localhost:8888', { verbosity: 1 })
            await delay(60)
            expect(infoLogger).toHaveBeenCalledWith('Socket connected at ws://localhost:8888')
            // Force close
            client.socket.close()
            expect(warnLogger).toHaveBeenCalledWith('Socket closed. Retrying in 10 seconds...')
            client.close()
        })
    })
})