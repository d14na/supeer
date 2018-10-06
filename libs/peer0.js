const Tracker = require('bittorrent-tracker')
const DHT = require('bittorrent-dht')
const net = require('net')

/* Initialize local library. */
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

        /* Initialize promise holders (used for file requests). */
        this._resolve = null
        this._reject = null

        /* Initialize data handling helpers. */
        this._payload = null
        this._overload = null
        this._handshakeComplete = false
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

    get handshakeComplete() {
        return this._handshakeComplete
    }

    get overload() {
        return this._overload
    }

    get port() {
        return this._port
    }

    get payload() {
        return this._payload
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

    get resolve() {
        return this._resolve
    }

    get reject() {
        return this._reject
    }

    set conn(_conn) {
        this._conn = _conn
    }

    set handshakeComplete(_status) {
        this._handshakeComplete = _status
    }

    set overload(_data) {
        this._overload = _data
    }

    set payload(_data) {
        this._payload = _data
    }

    set conn(_conn) {
        this._conn = _conn
    }

    set reqId(_reqId) {
        this._reqId = _reqId
    }

    set innerPath(_innerPath) {
        this._innerPath = _innerPath
    }

    set resolve(_resolve) {
        this._resolve = _resolve
    }

    set reject(_reject) {
        this._reject = _reject
    }

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
        const promise = new Promise((_resolve, _reject) => {
            /* Initialize promise holders. */
            this.resolve = _resolve
            this.reject = _reject
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
        // console.log('THIS.CONN', this.conn)

        /* Handle closed connection. */
        this.conn.on('close', function () {
            console.info(`Connection closed with ${this.address}`)
        })

        /* Handle connection errors. */
        this.conn.on('error', function (_err) {
            console.error(`Error detected with ${this.address} [ ${_err.message} ]`, )
        })

        /* Handle incoming data. */
        this.conn.on('data', async function (_data) {
            // console.log('INCOMING DATA', _data)

            /* Retrieve response from data handler. */
            const data = await self._handleIncomingData(_data)
                .catch((err) => console.error('handleIncomingData ERROR', err))

            /* Validate data. */
            if (!data) {
                throw new Error('Data failed to be returned from handler.')
            }

            // if (_utils.isJson(data)) {
            //     console.log(`Returned data is JSON OBJECT`, data)
            // } else if (_utils.isJson(data, true)) {
            //     console.log(`Returned data is JSON STRING`, JSON.parse(data))
            // } else {
            //     console.log(`Returned data is RAW\n${data.toString('hex')}\n${data.toString()}`)
            // }

            /* Handle handshakes. */
            if (data.success && data.action == 'HANDSHAKE') {
                return resolve(data)
            }

            /* Verify length of data body. */
            if (data.decoded && data.decoded.body) {
                const body = data.decoded.body
                console.log(`Data body length is [ ${body.length} ]`)
                console.log(`Data body hash is [ ${_utils.calcFileHash(body)} ]`)

                /* Resolve (this object's) promise. */
                self.resolve(body)
            }

            /* Check for overload. */
            if (data.overload && data.location) {
                // console.log('CONTINUE WITH DATA REQUEST', _utils.innerPath, data.location)
                /* Continue with data request. */
                _requestFile(peer, data.location)
            }
        })

        /* Return the promise. */
        return promise
    }

    _handleIncomingData(_data) {
        /* Initailize promise holders. */
        let resolve = null
        let reject = null

        /* Add data to current payload. */
        if (this.payload) {
            this.payload = Buffer.concat([this.payload, _data])
        } else {
            this.payload = _data
        }

        // console.log('INCOMING =>', _data.length, msg, _data.toString())
        // console.log('msg location', msg['location'])
        // console.log('incoming msg', msg, _data.toString())

        const _arrayMatch = function (_arr1, _arr2) {
            if (_arr1.length === _arr2.length && _arr1.every(function (u, i) {
                return u === _arr2[i]
            })) {
                return true
            } else {
                return false
            }
        }

        /* Initialize a NEW client connection/handshake (if needed). */
        const promise = new Promise((_resolve, _reject) => { // eslint-disable-line promise/param-names
            /* Initialize promise holders. */
            resolve = _resolve
            reject = _reject
        })

        // console.log('%d bytes incoming', _data.length, _data)

        // console.log(
        //     '%d bytes incoming (hex)',
        //     Buffer.from(this.payload).toString('hex').length,
        //     Buffer.from(this.payload).toString('hex'),
        //     Buffer.from(this.payload).toString())

        /* Initialize decoded holder. */
        let decoded = null

        /* Initialize (msgpack) ending flag. */
        let hasEnded = null

        /***********************************************************************
          Variable Integer Format
          -----------------------

          [CC] supports sizes <= 255 bytes (8-bit)
          [CD] supports sizes <= 65,535 bytes (16-bit)
          [CE] supports sizes > 65,535 bytes (32-bit)

          (no support for files larger than 32-bit)
        ***********************************************************************/

        /* Initialize (msgpack) ending hash. */
        const sizeEndingCC = Buffer.from('a473697a65cc', 'hex')
        const sizeEndingCD = Buffer.from('a473697a65cd', 'hex')
        const sizeEndingCE = Buffer.from('a473697a65ce', 'hex')

        /* Retrieve the ending bytes. */
        const sizeCheckCC = Buffer.from(this.payload.slice(-7, -1))
        const sizeCheckCD = Buffer.from(this.payload.slice(-8, -2))
        const sizeCheckCE = Buffer.from(this.payload.slice(-10, -4))
        // console.log('sizeCheck IS', sizeCheck, sizeCheck.toString('hex'), sizeCheck.toString())
        // console.log(`\nPayload length is [ ${this.payload.length} ] of [ 19-bit max: ${2 ** 19} ]`)
        // console.log('\nFirst 50 bytes', Buffer.from(this.payload.slice(0, 50)).toString(), Buffer.from(this.payload.slice(0, 50)).toString('hex'))
        // console.log('\nLast 50 bytes', Buffer.from(this.payload.slice(-50)).toString(), Buffer.from(this.payload.slice(-50)).toString('hex'))

        /* Match the endings for end-of-file detection. */
        if (
            _arrayMatch(sizeEndingCC, sizeCheckCC) ||
            _arrayMatch(sizeEndingCD, sizeCheckCD) ||
            _arrayMatch(sizeEndingCE, sizeCheckCE)
        ) {
            /* Retrieve the current (data) location. */
            const dataLocation = Buffer.from(this.payload.slice(-15, -10))

            /* Retrieve the current (data) location. */
            const fileSize = Buffer.from(this.payload.slice(-5))

            /* Search for an overload. */
            // NOTE We only check 32-bit file sizes.
            if (_arrayMatch(sizeEndingCE, sizeCheckCE) && !_arrayMatch(dataLocation, fileSize)) {
                // console.log('CHECKING FOR OVERLOAD', dataLocation.toString('hex'), fileSize.toString('hex'))

                // console.log('*** WE FOUND AN OVERLOAD --- REQUEST A DATA CONTINUATION')

                /* Add payload to current overload. */
                if (this.overload) {
                    // console.log('OVERLOAD', this.overload.length)
                    // console.log('PAYLOAD', this.payload.length)
                    /* Add the current payload (body) to the overload (body). */
                    this.overload = _utils.concatOverload(this.overload, this.payload)
                } else {
                    // console.log('FIRST PAYLOAD', _utils.decode(this.payload))
                    this.overload = this.payload
                }

                /* Clear the payload. */
                this.payload = null

                /* Build overload package. */
                const pkg = {
                    overload: true,
                    location: dataLocation.readUInt32BE(1)
                }

                /* Return */
                resolve(pkg)
            } else {
                /* Set file ending flag. */
                hasEnded = true

                /* Process the data overload. */
                if (this.overload) {
                    /* Add (FINAL) payload to current overload. */
                    this.overload = _utils.concatOverload(this.overload, this.payload)
                    // console.log('HANDLE THE OVERLOAD 1', this.overload.length)

                    /* Copy the overload holder to the payload. */
                    this.payload = this.overload
                    // console.log('HANDLE THE PAYLOAD', this.payload.length)

                    /* Clear the overload. */
                    this.overload = null
                    // console.log('HANDLE THE OVERLOAD 2', this.overload)
                }
            }
        }

        /* Handle file data parsing. */
        if (hasEnded || !this.handshakeComplete) {
            // console.log('DATA STREAM HAS ENDED!!!', this.payload.length)

            /* Decode the payload. */
            decoded = _utils.decode(this.payload)
            // console.log('DECODED 1', decoded)

            /* Initialize request. */
            let request = null

            /* Retrieve the request id. */
            if (decoded.to !== null) {
                const reqId = decoded.to
                // console.log('Decoded reqId', reqId)

                /* Retrieve the request. */
                request = this.getRequestId(reqId)
                // console.log('Decoded request', request)
            }

            if (decoded.cmd === 'response' && decoded.error) {
                console.error(decoded.error)

                /* Clear the payload. */
                this.payload = null

                // delete the request cmd
                delete request.cmd

                reject(decoded.error)
            }

            if (decoded.cmd === 'response' && request.cmd === 'handshake') {
                console.info('Handshake completed successfully!')

                /* Set handshake flag. */
                this.handshakeComplete = true

                /* Clear the payload. */
                this.payload = null

                const pkg = {
                    success: true,
                    action: 'HANDSHAKE'
                }

                resolve(pkg)
            }

            if (decoded.cmd === 'response' && request.cmd === 'ping') {
                console.info('Ping completed successfully!')

                /* Clear the payload. */
                this.payload = null
            }

            if (decoded.cmd === 'response' && request.cmd === 'getFile') {
                /* Clear the payload. */
                this.payload = null

                // console.log('*** DECODED', decoded)
                // console.log('*** REQUEST', request)

                const pkg = { request, decoded }

                resolve(pkg)
            }

            if (decoded.cmd === 'response' && request.cmd === 'pex') {
                let peers = decoded.peers
                // let peers = JSON.parse(decoded.peers)
                console.info('Check out my PEX peers', peers)

                for (let i = 0; i < peers.length; i++) {
                    console.log('peer', peers[i].length, peers[i])

                    const ipBuffer = Buffer.from(peers[i], 'binary')
                    // const ipBuffer = Buffer.from(peers[i])

                    if (ipBuffer.length === 6) {
                        console.log('#%d IP:Port', i, ipBuffer)

                        const peer = {
                            ip: _utils.parseIp(ipBuffer),
                            port: _utils.parsePort(ipBuffer)
                        }
                        console.log('PEX Peer (buffer)', peer)
                    }
                }

                /* Clear the payload. */
                this.payload = null
            }
        }

        if (decoded && this.payload !== null) {
            console.error('FAILED TO RECOGNIZE -- clearing payload')

            /* Clear the payload. */
            this.payload = null
        }

        /* Return the promise. */
        return promise
    }
}

module.exports = Peer0
