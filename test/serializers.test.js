import { JSONArraySerializer, JSONObjSerializer } from '../serializers'

describe('JSON Array Serialization', () => {
    it('serializes', () => {
        const res = JSONArraySerializer.encode('test', ['data', 23], false)
        expect(res).toEqual('["test",["data",23]]')
    })
    it('deserializes', () => {
        const [action, data, bounce] = JSONArraySerializer.decode('["test",["data",23]]')
        expect(action).toEqual('test')
        expect(data).toEqual(['data', 23])
        expect(bounce).not.toBe(true)
    })
    it('serializes, handling bounce', () => {
        const res = JSONArraySerializer.encode('test', { 0: 42 }, true)
        expect(res).toEqual('["test",{"0":42},true]')
    })
    it('deserializes, handling bounce', () => {
        const [action, data, bounce] = JSONArraySerializer.decode('["test",[], true]')
        expect(action).toEqual('test')
        expect(data).toEqual([])
        expect(bounce).toBe(true)
    })
})

describe('JSON Object Serialization', () => {
    it('serializes', () => {
        const res = JSONObjSerializer.encode('test', ['data', 23], false)
        expect(res).toEqual('{"action":"test","data":["data",23]}')
    })
    it('deserializes', () => {
        const [action, data, bounce] = JSONObjSerializer.decode('{"action":"test","data":["data",23]}')
        expect(action).toEqual('test')
        expect(data).toEqual(['data', 23])
        expect(bounce).not.toBe(true)
    })
    it('serializes, handling bounce', () => {
        const res = JSONObjSerializer.encode('test', { 0: 42 }, true)
        expect(res).toEqual('{"action":"test","data":{"0":42},"bounce":true}')
    })
    it('deserializes, handling bounce', () => {
        const [action, data, bounce] = JSONObjSerializer.decode('{"action":"test","data":[],"bounce":true}')
        expect(action).toEqual('test')
        expect(data).toEqual([])
        expect(bounce).toBe(true)
    })
})