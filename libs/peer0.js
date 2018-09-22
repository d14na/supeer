'use strict'

const Tracker = require('bittorrent-tracker')
const DHT = require('bittorrent-dht')
const net = require('net')

const _constants = require('./_constants')
const _handshake = require('./_handshake')
const _utils = require('./_utils')

/**
 * Class: Peer0
 */
class Peer0 {
    constructor(_address, _site) {
        /* Initialize a new peer id. */
        this._id = Buffer.from(_utils.getPeerId('US'))

        /* Initialize the peer address, ip and port. */
        const address = _address
        this._address = address
        this._ip = address.split(':')[0]
        this._port = address.split(':')[1]

        /* Initialize connection. */
        this._conn = null

        /* Initialize site from info hash. */
        this._site = _site

        /* Initialize inner path. */
        this._innerPath = null

        /* Initialize (internal) holders. */
        this._reqId = 0
        this._requests = []

        /* Initialize promise holders. */
        // this._resolve = null
        // this._reject = null
    }

    get id() {
        return this._id
    }

    get conn() {
        return this._conn
    }

    get address() {
        return this._address
    }

    get ip() {
        return this._ip
    }

    get port() {
        return this._port
    }

    get site() {
        return this._site
    }

    get innerPath() {
        return this._innerPath
    }

    get info() {
        return `
            Peer Id   : ${Buffer.from(peerId).toString('hex')} [ ${Buffer.from(peerId).toString()} ]
            Info Hash : ${Buffer.from(infoHash).toString('hex')}
        `
    }

    get reqId() {
        return this._reqId
    }

    get requests() {
        return this._requests
    }

    // get resolve() {
    //     return this._resolve
    // }
    //
    // get reject() {
    //     return this._reject
    // }

    set conn(_conn) {
        this._conn = _conn
    }

    set reqId(_reqId) {
        this._reqId = _reqId
    }

    set innerPath(_innerPath) {
        this._innerPath = _innerPath
    }

    // set resolve(_resolve) {
    //     this._resolve = _resolve
    // }
    //
    // set reject(_reject) {
    //     this._reject = _reject
    // }

    getRequestId(_reqId) {
        return this._requests[_reqId]
    }

    addRequest(_request) {
        /* Initialize request id (auto-increment). */
        const reqId = this.reqId++

        /* Add the new request. */
        this._requests[reqId] = _request

        /* Return the request id. */
        return reqId
    }

    ping() {
        console.log('Starting ping')

        const cmd = 'ping'

        const request = { cmd }

        const req_id = this._addRequest(request) // eslint-disable-line camelcase

        const pkg = {
            cmd,
            req_id,
            params: {}
        }

        /* Send request. */
        this.conn.write(this._encode(pkg), function () {
            console.log('sent ping', pkg)
        })
    }

    requestFile(_innerPath, _location) {
        /* Initialize a NEW client connection/handshake (if needed). */
        const promise = new Promise((resolve, reject) => {
            /* Initialize promise holders. */
            this.resolve = resolve
            this.reject = reject
        })

// console.log('STARTING FILE REQUEST')
        const cmd = 'getFile'
        const site = this.site
        this.innerPath = _innerPath
        const innerPath = _innerPath

        /* Initialize the location (file data pointer/index). */
        let location = _location

        /* Build a request object (for internal tracking). */
        const request = { cmd, site, innerPath, location }

        /* Add the request to the pool and receive a new request id. */
        const req_id = this.addRequest(request)

        const inner_path = innerPath

        const params = { site, inner_path, location }

        const pkg = { cmd, req_id, params }
        // console.log('SENDING PACKAGE', pkg)

console.log('THIS IS OUR FIRST INNER PATH', this.innerPath)
        /* Send request. */
        this.conn.write(_utils.encode(pkg), function () {
            console.log(`Sent request for [ ${inner_path} @ ${location} ]`)
        })

        return promise
    }

    openConnection() {
        /* Localize this. */
        const self = this

        /* Initailize promise holders. */
        let resolve = null
        let reject = null

        /* Initialize a NEW client connection/handshake (if needed). */
        const promise = new Promise((_resolve, _reject) => { // eslint-disable-line promise/param-names
            /* Initialize promise holders. */
            resolve = _resolve
            reject = _reject
        })

        /* Open connection to peer. */
        this.conn = net.createConnection(this.port, this.ip, () => {
            console.info(`Opened new connection [ ${this.ip}:${this.port} ]`)

            const cmd = 'handshake'
            const request = { cmd }

            const reqId = this.addRequest(request)

            /* Initialize handshake. */
            const handshake = _handshake(this.ip, this.port, this.id, reqId)

            /* Encode handshake package. */
            const pkg = _utils.encode(handshake)

            /* Send package. */
            this.conn.write(pkg)
        })

        /* Handle closed connection. */
        this.conn.on('close', function () {
            console.info(`Connection closed with ${address}`)
        })

        /* Handle connection errors. */
        this.conn.on('error', function (_err) {
            console.error(`Error detected with ${address} [ ${_err.message} ]`, )
        })

        /* Handle incoming data. */
        this.conn.on('data', async function (_data) {
            /* Initialize incoming data handler. */
            const handleIncomingData = require('./_handleIncomingData')

            /* Retrieve response from data handler. */
            const data = await handleIncomingData(self, _data)

            /* Validate data. */
            if (!data) {
                throw new Error('Data failed to be returned from handler.')
            }

if (_utils.isJson(data)) {
console.log(`Returned data is JSON OBJECT`, data)
} else if (_utils.isJson(data, true)) {
console.log(`Returned data is JSON STRING`, JSON.parse(data))
} else {
console.log(`Returned data is RAW\n${data.toString('hex')}\n${data.toString()}`)
}

            /* Handle handshakes. */
            if (data.success && data.action == 'HANDSHAKE') {
                return resolve(data)
            }

            /* Verify length of data body. */
            if (data.decoded && data.decoded.body) {
                const body = data.decoded.body
                console.log(`Data body length is [ ${body.length} ]`)
                console.log(`Data body hash is [ ${_utils.calcFileHash(body)} ]`)
            }

            /* Check for overload. */
            if (data.overload && data.location) {
                // console.log('CONTINUE WITH DATA REQUEST', _utils.innerPath, data.location)
                /* Continue with data request. */
                _requestFile(peer, data.location)
            }

            /* Parse and update the config files. */
            // if (data.request && data.request.innerPath === 'content.json') {
            //     const body = data.decoded.body
            //
            //     const files = JSON.parse(body).files
            //
            //     _utils._updateFiles(files)
            // }

        })

        /* Return the promise. */
        return promise
    }

}

module.exports = Peer0
