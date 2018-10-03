/* Initialize local libraries. */
const _utils = require('../libs/_utils')
const Discovery = require('../libs/discovery')
const Peer0 = require('../libs/peer0')

/* Initialize local data sources. */
const dotBitNames = require('../data/names.json')

/**
 * File Request Handler
 */
const _requestFile = function (_peer, _destination, _innerPath) {
    return new Promise(async (_resolve, _reject) => {
        /* Create new Peer. */
        const peer0 = new Peer0(_peer, _destination)

        /* Open a new connection. */
        const conn = await peer0.openConnection()
            .catch((err) => {
                console.log('WHAT HAPPENED WITH OUR CONNECTION??')
                _reject(err)
            })

        if (conn && conn.action === 'HANDSHAKE') {
            /* Start discovery of peers. */
            const fileData = await peer0.requestFile(_innerPath, 0)
                .catch(_reject)

            _resolve(fileData)
        } else {
            _reject(`Handshake with ${_peer} failed!`)
        }
    })
}

/**
 * Dot Bit Name Detection
 *
 * FIXME Improve validation.
 */
const _isDotBit = function (_val) {
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
const _isPublicKey = function (_val) {
    if (_val.slice(0, 1) === '1' && (_val.length === 33 || _val.length === 34)) {
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
const _isInfoHash = function (_val) {
    if (_val.length === 40) {
        return true
    } else {
        return false
    }
}

/**
 * Retrieve dotBit Public Key
 */
const _dotBitToPk = function (_name) {
    console.log(`Looking up public key for [ ${_name} ]`)

    /* Initialize public key. */
    let publicKey = null

    /* Validate name. */
    if (_name.toLowerCase().indexOf('.bit') === -1) {
        /* Append dotBit. */
        _name += '.bit'
    }

    /* Search for the public key. */
    publicKey = dotBitNames[_name]

    console.log(`Public key is [ ${publicKey} ]`)

    /* Return public key. */
    return publicKey
}

/**
 * Information Request Handler
 */
const _handler = async function (_data) {
    /* Initialize success. */
    let success = null

    /* Initialize peers. */
    let peers = null

    /* Initialize destination. */
    let destination = null

    /* Retrieve destination. */
    destination = _data.dest
    console.log('Querying peers for destination', destination)

    /* Destination dotBit detectoin. */
    if (_isDotBit(destination) || (!_isPublicKey(destination) && !_isInfoHash(destination))) {
        /* Update destination. */
        destination = _dotBitToPk(destination)
    }

    /* Validate destination. */
    if (!destination) {
        return console.log(`Could NOT validate destination [ ${destination} ]`)
    }

    /* Calculate info hash. */
    const infoHash = Buffer.from(_utils.calcInfoHash(destination), 'hex')

    /* Create new Discovery. */
    const discovery = new Discovery(infoHash)

    /* Start discovery of peers. */
    peers = await discovery.startTracker()
    // console.log('FOUND THESE PEERS', peers)

    /* Filter peers. */
    const filtered = peers.filter((_peer) => {
        /* Retrieve port. */
        const port = parseInt(_peer.split(':')[1])

        return port > 1
    })

    /* Retrieve inner path. */
    const innerPath = 'content.json'

    /* Initialize config. */
    let config = null

    // FOR TESTING PURPOSES ONLY
    filtered.unshift('185.142.236.207:10443')

    console.log(`Requesting ${innerPath} from ${destination} via ${filtered[0]}`);
    config = await _requestFile(filtered[0], destination, innerPath)
        .catch((err) => {
            console.error(`Oops! Looks like ${destination} was a dud, try again...`)
        })

    /* Validate results. */
    if (filtered && filtered.length > 0 && config) {
        success = true
    } else {
        success = false
    }

    /* Parse configuration. */
    config = JSON.parse(config)

    /* Build package. */
    pkg = { peers: filtered, config, success }

    return pkg
}

module.exports = _handler
