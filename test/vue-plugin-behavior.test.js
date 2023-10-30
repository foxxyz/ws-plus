import { watch } from 'vue'

import { createSocket } from '../vue'
import { MockSocket } from './mocks/socket'

global.WebSocket = MockSocket

const delay = ms => new Promise(res => setTimeout(res, ms))

describe('Vue 3 Plugin', () => {
    describe('Behavior', () => {
        it('makes the connected attribute reactive', async() => {
            const client = createSocket('ws://localhost:8888')
            const listener = jest.fn()
            watch(() => client.connected, listener)
            await delay(100)
            expect(client.connected).toBe(true)
            expect(listener).toHaveBeenCalledWith(true, false, expect.anything())
        })
    })
})