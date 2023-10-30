import { jest } from '@jest/globals'

import { Client } from '..'
import { createSocket, listen } from '../vue'
import { Server } from '../server'

const cache = {}
jest.unstable_mockModule('vue', () => ({
    reactive: jest.fn(),
    inject: jest.fn(),
    onBeforeUnmount: jest.fn()
}))
const { reactive, inject, onBeforeUnmount } = await import('vue')

const delay = ms => new Promise(res => setTimeout(res, ms))

describe('Vue 2 Plugin', () => {
    let MockFramework
    beforeEach(() => {
        MockFramework = class {}
        MockFramework.util = { defineReactive: () => {} }
    })
    it('can be installed', () => {
        const client = new Client('ws://localhost:8888', { autoConnect: false, verbosity: 0 })
        client.install(MockFramework)
        const app = new MockFramework()
        expect(app.$ws).toBe(client)
    })
    it('allows overriding global reference name', () => {
        const client = new Client('ws://localhost:8888', { autoConnect: false, verbosity: 0 })
        client.install(MockFramework, { name: 'anotherSocket' })
        const app = new MockFramework()
        expect(app.$anotherSocket).toBe(client)
    })
})

describe('Vue 3 Plugin', () => {
    let MockApp, server, app, unmountFn
    beforeEach(() => {
        MockApp = class {
            constructor() {
                this.config = {
                    globalProperties: {}
                }
            }
            // eslint-disable-next-line class-methods-use-this
            provide(name, obj) {
                cache[name] = obj
            }
            use(plugin, options) {
                plugin.install(this, options)
            }
            // eslint-disable-next-line class-methods-use-this
            unmount() {
                if (unmountFn) unmountFn()
                unmountFn = null
            }
        }
        reactive.mockImplementation(a => a)
        inject.mockImplementation(name => cache[name])
        onBeforeUnmount.mockImplementation(fn => unmountFn = fn)
    })
    afterEach(async() => {
        app.unmount()
        if (server) await server.close()
    })
    it('can be installed', () => {
        const client = createSocket('ws://localhost:8888', { autoConnect: false, verbosity: 0 })
        app = new MockApp()
        app.use(client)
        expect(app.config.globalProperties.$ws).toBe(client)
    })
    it('allows overriding global reference name', () => {
        const client = createSocket('ws://localhost:8888', { autoConnect: false, verbosity: 0 })
        app = new MockApp()
        app.use(client, { name: 'anotherSocket' })
        expect(app.config.globalProperties.$anotherSocket).toBe(client)
    })
    it('allows easy listening in components', () => {
        const client = createSocket('ws://localhost:8888', { autoConnect: false, verbosity: 0 })
        app = new MockApp()
        app.use(client)

        const testAction = jest.fn()
        listen({ testAction })

        client.receive({ data: '["testAction", "testData"]' })

        expect(testAction).toHaveBeenCalledWith('testData')
    })
    it('allows easy listening on specific sockets', () => {
        const client = createSocket('ws://localhost:8888', { autoConnect: false, verbosity: 0 })
        app = new MockApp()
        app.use(client, { name: 'secondary' })

        const action2 = jest.fn()
        listen({ action2 }, { name: 'secondary' })

        client.receive({ data: '["action2", "data2"]' })

        expect(action2).toHaveBeenCalledWith('data2')
    })
    it('allows easy listening with a subscription in components', async() => {
        server = new Server({ port: 54322, verbosity: 0 })
        await new Promise(res => server.server.on('listening', res))

        const client = createSocket('ws://127.0.0.1:54322')
        const client2 = createSocket('ws://127.0.0.1:54322')
        app = new MockApp()
        app.use(client, { name: 'ws1' })
        app.use(client2, { name: 'ws2' })

        await new Promise(res => client.once('connect', res))

        // Attempt to listen without subscribing on client1
        const testListener1 = jest.fn()
        listen({ privateAction: testListener1 }, { name: 'ws1' })
        // Listen with subscription on client2
        const testListener2 = jest.fn()
        listen({ privateAction: testListener2 }, { name: 'ws2', subscribe: true })

        // Ensure subscriptions are set
        await delay(10)

        server.broadcastSubscribers('privateAction', 'testData')

        // Time to receive messages
        await delay(10)

        expect(testListener1).not.toHaveBeenCalled()
        expect(testListener2).toHaveBeenCalledWith('testData')

        // Close both clients
        const closing = new Promise(res => client.once('close', res))
        const closing2 = new Promise(res => client2.once('close', res))
        client.close()
        client2.close()
        await Promise.all([closing, closing2])
    })
})