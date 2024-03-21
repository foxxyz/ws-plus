import { Client } from '../index.js'
import { JSONObjSerializer } from '../serializers'
import { MockSocket } from './mocks/socket'
import { jest } from '@jest/globals'

global.WebSocket = MockSocket

const delay = ms => new Promise(res => setTimeout(res, ms))

describe('Client', () => {
    describe('Basic Operation', () => {
        let client
        beforeEach(() => {
            client = new Client('ws://localhost:8888', { verbosity: 0 })
        })
        afterEach(() => {
            client.close()
        })
        it('connects', async() => {
            await delay(60)
            expect(client.connected).toBe(true)
        })
        it('emits connect events', async() => {
            const func = jest.fn()
            client.on('connect', func)
            await delay(60)
            expect(func).toHaveBeenCalled()
        })
        it('emits close events on normal close', async() => {
            const func = jest.fn()
            client.on('close', func)
            await delay(60)
            client.close()
            expect(func).toHaveBeenCalled()
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
            client.on('testAction', data => flag = data)
            client.socket.onmessage({ data: '["testAction", "testData"]' })
            expect(flag).toBe('testData')
        })
        it('allows clearing of listeners', async() => {
            await delay(60)
            let flag = false
            const f = data => flag = data
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
        it('quits reconnecting on manual close', async() => {
            // Set 10ms reconnect interval
            client.reconnectInterval = 0.01
            await delay(60)
            // Spy on connect function
            const connectFunction = jest.spyOn(client, 'connect')
            // Force close
            client.socket.close()
            // Manually close
            client.close()
            // Reconnect
            client.connect()
            // Wait at least reconnect interval
            await delay(100)
            expect(connectFunction).toHaveBeenCalledTimes(1)
        })
        it('reconnects automatically', async() => {
            // Set 10ms reconnect interval
            client.reconnectInterval = 0.01
            await delay(60)
            // Spy on connect function
            const connectFunction = jest.spyOn(client, 'connect')
            // Force close
            client.socket.close()
            // Wait at least reconnect interval
            await delay(100)
            expect(connectFunction).toHaveBeenCalled()
        })
        it('emits close events during abnormal close', async() => {
            // Set 10ms reconnect interval to prevent hanging
            client.reconnectInterval = 0.01
            const func = jest.fn()
            client.on('close', func)
            await delay(60)
            client.socket.close()
            expect(func).toHaveBeenCalled()
        })
    })
    describe('Edge Cases', () => {
        it('queues messages when not connected', () => {
            const client = new Client('ws://localhost:8888', { autoConnect: false, verbosity: 0 })
            client.send('test', 'test')
            expect(client.queue.length).toBe(1)
        })
        it('prevents message queue overflow', () => {
            const client = new Client('ws://localhost:8888', { maxQueueSize: 2, autoConnect: false, verbosity: 0 })
            client.send('test', 'test')
            client.send('test', 'test2')
            client.send('test', 'test3')
            expect(client.queue.length).toBe(2)
        })
        it('sends messages as objects if object serializer used', async() => {
            const client = new Client('ws://localhost:8888', { serializer: JSONObjSerializer, verbosity: 0 })
            const receiver = new Promise((res, rej) => {
                client.socket.send = data => Array.isArray(JSON.parse(data)) ? rej() : res(true)
            })
            client.send('test', 'test')
            await expect(receiver).resolves.toBe(true)
        })
        it('supports other serializers', async() => {
            const client = new Client('ws://localhost:8888', { serializer: JSONObjSerializer, verbosity: 0 })
            const listener = new Promise((res, rej) => {
                client.on('test', data => data === 'test' ? res(true) : rej())
            })
            client.receive({ data: '{"action":"test","data":"test"}' })
            await expect(listener).resolves.toBe(true)
        })
        it('retries initial connect automatically', async() => {
            const client = new Client('invalid-url', { verbosity: 0 })
            // Set 10ms reconnect interval
            client.reconnectInterval = 0.01
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
            // Set 10ms reconnect interval to prevent hanging
            client.reconnectInterval = 0.01
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
            // Set 10ms reconnect interval to prevent hanging
            client.reconnectInterval = 0.01
            await delay(60)
            expect(infoLogger).toHaveBeenCalledWith('Socket connected at ws://localhost:8888')
            // Force close
            client.socket.close()
            expect(warnLogger).toHaveBeenCalledWith('Socket closed. Retrying in 0.01 seconds...')
            await new Promise(res => client.once('connect', res))
            client.close()
        })
    })
})