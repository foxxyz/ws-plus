// Stand-in for a real WebSocket
class MockSocket {
    constructor(url) {
        this.url = url
        this.onmessage = () => {}
        this.onopen = () => {}
        this.onclose = () => {}
        // Simulate connection attempt
        setTimeout((() => {
            if (!this.url.startsWith('ws://') ) {
                const err = new Error(`connect ECONNREFUSED ${url}`)
                if (!this.onerror) {
                    throw err
                }
                this.onerror(err)
                this.close(1006)
            } else {
                this.onopen()
            }
        }).bind(this), 50)
    }
    close(code) {
        this.onclose({ code })
    }
    send() {}
}

module.exports = { MockSocket }