import { Client } from '.'
import { inject, onMounted, onUnmounted, reactive } from 'vue'

export function createSocket(url, options) {
    const socket = reactive(new Client(url, { autoConnect: false, ...options }))
    socket.connect()
    return socket
}

export function listen(actions, { name='ws'}={}) {
    const client = inject(`$${name}`)
    onMounted(() => {
        for(const action in actions) {
            client.on(action, actions[action])
        }
    })
    onUnmounted(() => {
        for(const action in actions) {
            client.off(action, actions[action])
        }
    })
}
