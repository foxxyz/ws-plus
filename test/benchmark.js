import Benchmark from 'benchmark'
import { Client } from '../index.js'
import { MockSocket } from './mocks/socket.js'

global.WebSocket = MockSocket

const client = new Client('ws://localhost:8888')
client.connected = true

const suite = new Benchmark.Suite

const smallData = {
    obj: 'test',
    encoded: {
        entry: 23489238426427,
        one: new Date()
    }
}

const smallEncoded = Buffer.from(JSON.stringify(['test', smallData]))

const bigData = {
    obj: [
        {
            two: 'three',
            four: [89, 88, 17]
        },
        {
            five: 'six',
            seven: [55, 7234, { entry: 'three' }]
        }
    ],
    encoded: {
        entries: [{ x: 17, y: 18, z: 19 }, new Date(), { x: 17, y: 18, z: 19 }, { x: 17, y: 18, z: 19 }],
        encoded: {
            entry: 23489238426427,
            one: new Date(),
            encoded: {
                entry: 23489238426427,
                one: new Date()
            }
        }
    }
}

const bigEncoded = Buffer.from(JSON.stringify(['test', bigData]))

// benchmark sending/receiving
suite
    .add('Client#send (small)', () => {
        client.send('test', smallData)
    })
    .add('Client#send (large)', () => {
        client.send('test', bigData)
    })
    .add('Client#receive (small)', () => {
        client.receive({ data: smallEncoded })
    })
    .add('Client#receive (large)', () => {
        client.receive({ data: bigEncoded })
    })
    .on('cycle', event => {
        console.log(String(event.target))
    })
    .run({ async: true })
