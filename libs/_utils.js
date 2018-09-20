const crypto = require('crypto')

/* Initialize (internal) flags. */
let _summaryDisplayed = false

/* Initialize (internal) holders. */
let _foundPeers = []
let _foundDups = 0
let _reqId = 0
let _requests = []

/**
 * Get Found Peers
 */
const getFoundPeers = function () {
    return _foundPeers
}

/**
 * Get Request Id
 */
const getRequestId = function (_reqId) {
    return _requests[_reqId]
}

/**
 * Get Request Id
 */
const getRequests = function () {
    return _requests
}

/**
 * Get Peer Id
 *
 * Generates a new peer id with the following format:
 *     1. Standard 0NET prefix
 *     2. Country Code
 *     3. Random string
 */
const getPeerId = function (_countryCode) {
    const prefix = '0PEN'
    const rndStringLen = 12
    const charset = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

    let rndString = ''

    for (let i = 0; i < rndStringLen; i++) {
        rndString += charset[Math.floor(Math.random() * charset.length)]
    }

    return `${prefix}-${_countryCode}-${rndString}`
}

/**
 * Get Summary Displayed (flag)
 */
const getSummaryDisplayed = function () {
    return _summaryDisplayed
}

/**
 * Add a New Peer
 */
const addPeer = function (_peer) {
    if (_foundPeers.indexOf(_peer) === -1) {
        _foundPeers.push(_peer)
        // console.log(`Peer count is now ${_foundPeers.length}`)
    } else {
        _foundDups++
        // console.log(`${_peer} is 1 of ${_foundDups} duplicate(s)`)
    }

    if (_foundPeers.length + _foundDups === 100) {
        /* Display the summary. */
        // NOTE Wait a tick to allow return value to be processed and displayed.
        setTimeout(() => {
            displaySummary()
        }, 0)


        /* Set summary display flag. */
        _summaryDisplayed = true
    }

    return _foundPeers.length
}

const addRequest = function (_request) {
    /* Initialize request id (auto-increment). */
    const reqId = _reqId++

    _requests[reqId] = _request

    /* Return the request id. */
    return reqId
}

/**
 * Array Match
 */
const arrayMatch = function (_arr1, _arr2) {
    if (_arr1.length === _arr2.length && _arr1.every(function (u, i) {
        return u === _arr2[i]
    })) {
        return true
    } else {
        return false
    }
}

/**
 * Calculate Info Hash
 */
const calcInfoHash = function (_data) {
    /* Compute the SHA-1 hash of the data provided. */
    return crypto.createHash('sha1').update(_data).digest('hex')
}

/**
 * Calculate File Hash
 *
 * NOTE Only the first half of the SHA-512 is used in verification.
 */
const calcFileHash = function (_data) {
    /* Calculate the sha512 hash. */
    const hash = crypto.createHash('sha512').update(_data).digest()

    /* Truncate to 256-bit and return hex. */
    return hash.toString('hex').slice(0, 64)
}

/**
 * Concatenate the overload the payload.
 */
const concatOverload = function (_overload, _payload) {
    /* Decode the overload. */
    const dOverload = decode(_overload)
console.log('D OVERLOAD 1', dOverload)
console.log('D OVERLOAD 2', dOverload.body.length)

    /* Decode the payload. */
    const dPayload = decode(_payload)
console.log('D PAYLOAD 1', dPayload)
console.log('D PAYLOAD 2', dPayload.body.length)

    dOverload.body = Buffer.concat([dOverload.body, dPayload.body])
    dOverload.location += dPayload.body.length

    /* Encode a new load. */
    const newload = encode(dOverload)
    // console.log('RE-ENCODED NEWLOAD', newload)

    return newload
}

/**
 * Display Summary
 */
const displaySummary = function () {
    console.log(
`
Tracker(s) Peer Summary
_______________________________________

Total Unique Peers    : ${_foundPeers.length}
Total Duplicate Peers : ${_foundDups}
    `)
}

const encode = function (_msg) {
    const msgpack = require('zeronet-msgpack')()
    const encode = msgpack.encode

    return encode(_msg)
}

const decode = function (_msg) {
    const msgpack = require('zeronet-msgpack')()
    const decode = msgpack.decode

    return decode(_msg)
}

const isJson = function (_str, stringified = false) {
    if (!stringified) {
        _str = JSON.stringify(_str)
    }

    try {
        JSON.parse(_str)
    } catch (e) {
        return false
    }

    return true
}

const parseIp = function (_buf) {
    const ip = _buf.readUInt8(0) +
        '.' + _buf.readUInt8(1) +
        '.' + _buf.readUInt8(2) +
        '.' + _buf.readUInt8(3)

    return ip
}

const parsePort = function (_buf) {
    const port = (_buf.readUInt8(5) * 256) + _buf.readUInt8(4)

    return port
}

const ping = function () {
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
    this.client.send(this._encode(pkg), function () {
        console.log('sent ping', pkg)
    })
}

module.exports = {
    addPeer,
    addRequest,
    arrayMatch,
    calcInfoHash,
    calcFileHash,
    concatOverload,
    decode,
    displaySummary,
    encode,
    getFoundPeers,
    getRequestId,
    getRequests,
    getPeerId,
    getSummaryDisplayed,
    isJson,
    parseIp,
    parsePort,
    ping
}
