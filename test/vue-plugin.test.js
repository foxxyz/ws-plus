import { onMounted, reactive, inject } from 'vue'

import { Client } from '..'
import { createSocket, listen } from '../vue'

const cache = {}
jest.mock('vue')

describe('Vue 2 Plugin', () => {
    let MockFramework
    beforeEach(() => {
        MockFramework = class {}
        MockFramework.util = { defineReactive: () => {} }
    })
    it('can be installed', () => {
        const client = new Client('ws://localhost:8888', { autoConnect: false })
        client.install(MockFramework)
        const app = new MockFramework()
        expect(app.$ws).toBe(client)
    })
    it('allows overriding global reference name', () => {
        const client = new Client('ws://localhost:8888', { autoConnect: false })
        client.install(MockFramework, { name: 'anotherSocket' })
        const app = new MockFramework()
        expect(app.$anotherSocket).toBe(client)
    })
})

describe('Vue 3 Plugin', () => {
    let MockApp
    beforeEach(() => {
        MockApp = class {
            constructor() {
                this.config = {
                    globalProperties: {}
                }
            }
            provide(name, obj) {
                cache[name] = obj
            }
            use(plugin, options) {
                plugin.install(this, options)
            }
        }
        reactive.mockImplementation(a => a)
        inject.mockImplementation(name => cache[name])
        onMounted.mockImplementation(fn => fn())
    })
    it('can be installed', () => {
        const client = createSocket('ws://localhost:8888')
        const app = new MockApp()
        app.use(client)
        expect(app.config.globalProperties.$ws).toBe(client)
    })
    it('allows overriding global reference name', () => {
        const client = createSocket('ws://localhost:8888')
        const app = new MockApp()
        app.use(client, { name: 'anotherSocket' })
        expect(app.config.globalProperties.$anotherSocket).toBe(client)
    })
    it('allows easy listening in components', () => {
        const client = createSocket('ws://localhost:8888')
        const app = new MockApp()
        app.use(client)

        const testAction = jest.fn()
        listen({ testAction })

        client.socket.onmessage({ data: '["testAction", "testData"]' })

        expect(testAction).toHaveBeenCalledWith('testData')
    })
    it('allows easy listening on specific sockets', () => {
        const client = createSocket('ws://localhost:8888')
        const app = new MockApp()
        app.use(client, { name: 'secondary' })

        const action2 = jest.fn()
        listen({ action2 }, { name: 'secondary' })

        client.socket.onmessage({ data: '["action2", "data2"]' })

        expect(action2).toHaveBeenCalledWith('data2')
    })
})