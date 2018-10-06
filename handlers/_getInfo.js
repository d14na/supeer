const ip = require('ip')

/* Initialize local libraries. */
const _utils = require('../libs/_utils')
const Discovery = require('../libs/discovery')
const Peer0 = require('../libs/peer0')
const Torrent = require('../libs/torrent')

/* Initialize local data sources. */
const dotBitNames = require('../data/names.json')

/**
 * Zite Configuration Request Handler
 */
const _requestConfig = function (_peer, _destination) {
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
            const fileData = await peer0.requestFile('content.json', 0)
                .catch(_reject)

            _resolve(fileData)
        } else {
            _reject(`Handshake with ${_peer} failed!`)
        }
    })
}

/**
 * Torrent Information Request Handler
 */
const _requestInfo = function (_infoHash) {
    return new Promise(async (_resolve, _reject) => {
        /* Create new Torrent manager. */
        const torrent = new Torrent(null, _infoHash)

        /* Initialize a new Torrent (DHT discovery). */
        const init = await torrent.init()
            .catch((_err) => {
                console.error('What happened with Torrent Initialization??')
                _reject(_err)
            })

        _resolve(init)
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
 * Magnet Link Validation
 *
 * FIXME Improve validation.
 */
const _isMagnetLink = function (_val) {
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
    publicKey = dotBitNames[_name.toLowerCase()]

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

    /* Initialize info hash. */
    let infoHash = null

    /* Retrieve destination. */
    // destination = _data.query
    // console.log('Querying peers for destination', destination)

    /* Destination dotBit detectoin. */
    // NOTE Public key (Bitcoin address) validation should be first.
    if (_isMagnetLink(_data.query)) {
        /* Retrieve info hash. */
        infoHash = _data.query.slice(20, 60)
    } else if (_isDotBit(_data.query) || (!_isPublicKey(_data.query) && !_isInfoHash(_data.query))) {
        /* Update destination. */
        destination = _dotBitToPk(_data.query)
    } else if (_isPublicKey(_data.query)) {
        /* Update destination. */
        destination = _data.query
    } else if (_isInfoHash(_data.query)) {
        /* Update info hash. */
        infoHash = _data.query
    }

    // console.log('DEST/INFO', destination, infoHash)

    /* Validate destination OR info hash. */
    if (!destination && !infoHash) {
        // return console.log(`Could NOT validate destination [ ${destination} ]`)

        /* Initialize search handler. */
        const search = require('./_search')

        /* Handle request. */
        pkg = await search(_data.query)

        /* Return package. */
        return pkg
    }

    /* Handle query. */
    if (destination) {
        /* Calculate info hash. */
        infoHash = Buffer.from(_utils.calcInfoHash(destination), 'hex')

        /* Create new Discovery. */
        const discovery = new Discovery(infoHash)

        /* Start discovery of peers. */
        peers = await discovery.startTracker()
        // console.log('FOUND THESE PEERS', peers)

        /* Filter peers. */
        const filtered = peers.filter((_peer) => {
            /* Retrieve ip address. */
            const ipAddress = _peer.split(':')[0]

            /* Retrieve port number. */
            const portNum = parseInt(_peer.split(':')[1])

            /* Filter out this host (as that will throw an error). */
            // console.log(`testing ip ${ipAddress} === ${ip.address()}`, ipAddress === ip.address())
            if (ipAddress === ip.address()) {
                return false
            }

            return portNum > 1
        })

        /* Initialize config. */
        let config = null

        // TEMP FOR TESTING PURPOSES ONLY
        filtered.unshift('185.142.236.207:10443')

        console.log(`Requesting 'content.json' from ${destination} via ${filtered[0]}`);
        config = await _requestConfig(filtered[0], destination)
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
    } else if (infoHash) {
        /* Initialize BitTorrent handler. */
        // const torrent = require('./_torrent')

        /* Initialize info. */
        let config = null

        /* Request torrent info from DHT nodes and peers. */
        info = await _requestInfo(infoHash)
            .catch((err) => {
                console.error(`Oops! Looks like ${null} was a dud, try again...`)
            })

        // console.log('THIS IS THE INFO WE GOT BACK', info)

        /* Add info hash to response. */
        info = {
            infoHash,
            ...info
        }

        /* Build package. */
        pkg = { info, success }

        /* Handle request. */
        // pkg = await torrent(infoHash)
    }

    return pkg
}

module.exports = _handler
