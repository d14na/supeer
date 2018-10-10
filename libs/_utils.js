/* Initialize vendor libraries. */
const crypto = require('crypto')
const maxmind = require('maxmind')

/* Initialize local data sources. */
const dotBitNames = require(__dirname + '/../data/names.json')
const geoLite2Loc = __dirname + '/../data/GeoLite2-City.mmdb'

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
 * Calculate Peer Identity
 *
 * NOTE Returned by WHOAMI request.
 */
const calcIdentity = function (_data) {
    return calcInfoHash(_data)
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

/**
 * Parse Client Data
 */
const parseData = function (_data) {
    /* Retrieve data id. */
    const dataId = _data.dataId

    /* Validate data id. */
    if (dataId) {
        if (dataId.indexOf(':') !== -1) {
            /* Retrieve dest. */
            const dest = dataId.split(':')[0]

            /* Retrieve request. */
            const request = dataId.split(':')[1]

            // console.log('PARSED DATA ID', dest, request)

            /* Return data. */
            return { dest, request }
        } else {
            return null
        }
    } else {
        return null
    }
}

/**
 * Dot Bit Name Detection
 *
 * FIXME Improve validation.
 */
const isDotBit = function (_val) {
    if (_val.slice(-4).toUpperCase() === '.BIT') {
        return true
    } else {
        return false
    }
}

/**
 * Public Key Validation
 *
 * FIXME Improve validation.
 */
const isPublicKey = function (_val) {
    if (_val.slice(0, 1) === '1' && (_val.length === 33 || _val.length === 34)) {
        return true
    } else {
        return false
    }
}

/**
 * Magnet Link Validation
 *
 * FIXME Improve validation.
 */
const isMagnetLink = function (_val) {
    if (_val.slice(0, 20) === 'magnet:?xt=urn:btih:') {
        return true
    } else {
        return false
    }
}

/**
 * Info Hash Validation
 *
 * FIXME Improve validation.
 */
const isInfoHash = function (_val) {
    if (_val.length === 40) {
        return true
    } else {
        return false
    }
}

/**
 * Retrieve dotBit Public Key
 */
const dotBitToPk = function (_name) {
    // console.log(`Looking up public key for [ ${_name} ]`)

    /* Initialize public key. */
    let publicKey = null

    /* Validate name. */
    if (_name.toLowerCase().indexOf('.bit') === -1) {
        /* Append dotBit. */
        _name += '.bit'
    }

    /* Search for the public key. */
    publicKey = dotBitNames[_name.toLowerCase()]

    // console.log(`Public key is [ ${publicKey} ]`)

    /* Return public key. */
    return publicKey
}

/**
 * MaxMind's GeoLite2 City Lookup
 */
const geoLookup = function (_ipAddress) {
    return new Promise((_resolve, _reject) => {
        maxmind.open(geoLite2Loc, (_err, _cityLookup) => {
            if (_err) {
                return _reject(_err)
            }

            /* Retrieve city. */
            const city = _cityLookup.get(_ipAddress)

            /* Resolve results. */
            _resolve(city)
        })
    })
}

module.exports = {
    arrayMatch,
    calcInfoHash,
    calcFileHash,
    calcIdentity,
    concatOverload,
    decode,
    encode,
    getPeerId,
    isJson,
    parseIp,
    parsePort,

    parseData,
    isDotBit,
    isPublicKey,
    isMagnetLink,
    isInfoHash,
    dotBitToPk,

    geoLookup
}
