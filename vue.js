import { Client } from '.'
import { inject, onMounted, onUnmounted, reactive } from 'vue'

export function createSocket(url, { autoConnect=true, ...options } = {}) {
    const socket = reactive(new Client(url, { autoConnect: false, ...options }))
    // The reason automatic connection is handled differently here,
    // is because calling `this.connect()` in the constructor pre-empts
    // the reactivity of the object and makes users unable to watch the `connected`
    // attribute; so instead we run `connect()` on the reactive client
    if (autoConnect) socket.connect()
    return socket
}

export function listen(actions, { name='ws', subscribe=false }={}) {
    const client = inject(`$${name}`)
    onMounted(() => {
        for(const action in actions) {
            client.on(action, actions[action])
            if (subscribe) client.send('subscribe', action)
        }
    })
    onUnmounted(() => {
        for(const action in actions) {
            if (subscribe) client.send('unsubscribe', action)
            client.off(action, actions[action])
        }
    })
}
