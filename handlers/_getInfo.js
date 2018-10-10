/* Initialize vendor libraries. */
const ip = require('ip')

/* Initialize local libraries. */
const _utils = require('../libs/_utils')
const Discovery = require('../libs/discovery')
const Peer0 = require('../libs/peer0')

/**
 * Zite Configuration Request Handler
 */
// const _requestConfig = function (_peer, _destination) {
//     return new Promise(async (_resolve, _reject) => {
//         /* Create new Peer. */
//         const peer0 = new Peer0(_peer, _destination)
//
//         /* Open a new connection. */
//         const conn = await peer0.openConnection()
//             .catch((err) => {
//                 console.log('WHAT HAPPENED WITH OUR CONNECTION??')
//                 _reject(err)
//             })
//
//         if (conn && conn.action === 'HANDSHAKE') {
//             /* Start discovery of peers. */
//             const fileData = await peer0.requestFile('content.json', 0)
//                 .catch(_reject)
//
//             _resolve(fileData)
//         } else {
//             _reject(`Handshake with ${_peer} failed!`)
//         }
//     })
// }

/**
 * Information Request Handler
 */
const _handler = async function (_zeroEvent, _requestId, _data) {
    /* Initialize success. */
    let success = null

    /* Initialize peers. */
    let peers = null

    /* Initialize destination. */
    let destination = null

    /* Initialize info hash. */
    let infoHash = null

    // /* Destination dotBit detectoin. */
    // // NOTE Public key (Bitcoin address) validation should be first.
    // if (_isMagnetLink(_data.query)) {
    //     /* Retrieve info hash. */
    //     infoHash = _data.query.slice(20, 60)
    // } else if (_isDotBit(_data.query) || (!_isPublicKey(_data.query) && !_isInfoHash(_data.query))) {
    //     /* Update destination. */
    //     destination = _dotBitToPk(_data.query)
    // } else if (_isPublicKey(_data.query)) {
    //     /* Update destination. */
    //     destination = _data.query
    // } else if (_isInfoHash(_data.query)) {
    //     /* Update info hash. */
    //     infoHash = _data.query
    // }

    // console.log('DEST/INFO', destination, infoHash)

    /* Validate destination OR info hash. */
    if (!destination && !infoHash) {
        /* Initialize search handler. */
        const search = require('./_search')

        /* Handle request. */
        search(_conn, _zeroEvent, _requestId, _data.query)
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

        /* Emit message. */
        _zeroEvent.emit('response', _requestId, pkg)
    } else if (infoHash) {
        /* Emit message. */
        _zeroEvent.emit('getInfo', infoHash)
    }
}

module.exports = _handler
