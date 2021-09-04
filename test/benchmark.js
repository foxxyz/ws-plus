const Benchmark = require('benchmark')
const { Client } = require('..')
const { MockSocket } = require('./__mocks__/socket')

global.WebSocket = MockSocket

const client = new Client('ws://localhost:8888')
client.connected = true

var suite = new Benchmark.Suite

const smallData = {
    obj: 'test',
    encoded: {
        entry: 23489238426427,
        one: new Date()
    }
}

const smallEncoded = JSON.stringify(['test', smallData])

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

const bigEncoded = JSON.stringify(['test', bigData])


// benchmark sending/receiving
suite
    .add('Client#send (small)', function() {
        client.send('test', smallData)
    })
    .add('Client#send (large)', function() {
        client.send('test', bigData)
    })
    .add('Client#receive (small)', function() {
        client.receive({ data: smallEncoded })
    })
    .add('Client#receive (large)', function() {
        client.receive({ data: bigEncoded })
    })
    .on('cycle', function(event) {
        console.log(String(event.target))
    })
    .run({ async: true })
