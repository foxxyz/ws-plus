import { jest } from '@jest/globals'
import { JSDOM } from 'jsdom'

// Set up DOM globals before importing any modules that need it
const dom = new JSDOM('<body><div id="app" /></body>')
global.window = dom.window
global.Element = dom.window.Element
global.SVGElement = dom.window.SVGElement
global.document = dom.window.document
global.WebSocket = dom.window.WebSocket
const { createApp } = await import('vue')
const { Client, Server } = await import('..')
const { createSocket, listen } = await import('../vue.js')

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
    let server, app
    afterEach(async() => {
        app.unmount()
        if (server) await server.close()
    })
    it('can be installed', () => {
        const client = createSocket('ws://localhost:8888', { autoConnect: false, verbosity: 0 })
        const component = {
            template: '<div/>'
        }
        app = createApp(component)
        app.use(client)
        app.mount(dom.window.document.querySelector('#app'))
        expect(app.config.globalProperties.$ws).toBe(client)
    })
    it('allows overriding global reference name', () => {
        const client = createSocket('ws://localhost:8888', { autoConnect: false, verbosity: 0 })
        const component = {
            template: '<div/>'
        }
        app = createApp(component)
        app.use(client, { name: 'anotherSocket' })
        app.mount(dom.window.document.querySelector('#app'))
        expect(app.config.globalProperties.$anotherSocket).toBe(client)
    })
    it('allows easy listening in components', () => {
        const client = createSocket('ws://localhost:8888', { autoConnect: false, verbosity: 0 })

        const testAction = jest.fn()
        const component = {
            template: '<div/>',
            setup() {
                listen({ testAction })
            }
        }
        app = createApp(component)
        app.use(client)
        app.mount(dom.window.document.querySelector('#app'))

        client.receive({ data: '["testAction", "testData"]' })

        expect(testAction).toHaveBeenCalledWith('testData')
    })
    it('allows easy listening on specific sockets', () => {
        const client = createSocket('ws://localhost:8888', { autoConnect: false, verbosity: 0 })

        const action2 = jest.fn()
        const component = {
            template: '<div/>',
            setup() {
                listen({ action2 }, { name: 'secondary' })
            }
        }
        app = createApp(component)
        app.use(client, { name: 'secondary' })
        app.mount(dom.window.document.querySelector('#app'))

        client.receive({ data: '["action2", "data2"]' })

        expect(action2).toHaveBeenCalledWith('data2')
    })
    it('allows easy listening with a subscription in components', async() => {
        server = new Server({ port: 54322, verbosity: 0 })
        await new Promise(res => server.server.on('listening', res))

        const client = createSocket('ws://127.0.0.1:54322')
        const client2 = createSocket('ws://127.0.0.1:54322')

        const testListener1 = jest.fn()
        const testListener2 = jest.fn()
        const component = {
            template: '<div/>',
            setup() {
                // Attempt to listen without subscribing on client1
                listen({ privateAction: testListener1 }, { name: 'ws1' })
                // Listen with subscription on client2
                listen({ privateAction: testListener2 }, { name: 'ws2', subscribe: true })
            }
        }
        app = createApp(component)
        app.use(client, { name: 'ws1' })
        app.use(client2, { name: 'ws2' })
        app.mount(dom.window.document.querySelector('#app'))

        await new Promise(res => client2.once('connect', res))

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