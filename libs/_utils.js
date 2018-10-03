const crypto = require('crypto')

// /**
//  * Get Request Id
//  */
// const getRequestId = function (_reqId) {
//     return _requests[_reqId]
// }
//
// /**
//  * Get Request Id
//  */
// const getRequests = function () {
//     return _requests
// }

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
    // console.log('D OVERLOAD 1', dOverload)
    // console.log('D OVERLOAD 2', dOverload.body.length)

    /* Decode the payload. */
    const dPayload = decode(_payload)
    // console.log('D PAYLOAD 1', dPayload)
    // console.log('D PAYLOAD 2', dPayload.body.length)

    dOverload.body = Buffer.concat([dOverload.body, dPayload.body])
    dOverload.location += dPayload.body.length

    /* Encode a new load. */
    const newload = encode(dOverload)
    // console.log('RE-ENCODED NEWLOAD', newload)

    return newload
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

module.exports = {
    arrayMatch,
    calcInfoHash,
    calcFileHash,
    concatOverload,
    decode,
    encode,
    getPeerId,
    isJson,
    parseIp,
    parsePort
}
