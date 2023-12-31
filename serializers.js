export class JSONArraySerializer {
    static encode(action, data, bounce) {
        const message = [action, data]
        if (bounce) message.push(bounce)
        return JSON.stringify(message)
    }
    static decode(buffer) {
        return JSON.parse(buffer.toString())
    }
}

export class JSONObjSerializer {
    static encode(action, data, bounce) {
        const message = { action, data }
        if (bounce) message.bounce = bounce
        return JSON.stringify(message)
    }
    static decode(buffer) {
        const { action, data, bounce } = JSON.parse(buffer.toString())
        return [action, data, bounce]
    }
}
