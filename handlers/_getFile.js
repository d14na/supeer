/* Initialize local libraries. */
const _utils = require('../libs/_utils')
const Discovery = require('../libs/discovery')
const Peer0 = require('../libs/peer0')

/**
 * Request Zeronet File
 */
const _requestFile = function (_zeroEvent, _peer, _dest, _innerPath) {
    return new Promise(async (_resolve, _reject) => {
        /* Create new Peer. */
        const peer0 = new Peer0(_zeroEvent, _peer)

        /* Open a new connection. */
        const conn = await peer0.init()
            .catch(_reject)

        /* Validate handshake. */
        if (conn && conn.action === 'HANDSHAKE') {
            /* Start discovery of peers. */
            const fileData = await peer0.requestFile(_dest, _innerPath, 0)
                .catch(_reject)

            _resolve(fileData)
        } else {
            _reject(`Handshake with ${_peer} failed!`)
        }
    })
}

const _handler = async function (_zeroEvent, _requestId, _data) {
    console.log('RECEIVED GETFILE REQUEST', _data)

    /* Initialize data. */
    let data = null

    /* Parse data. */
    data = _utils.parseData(_data)
    // console.log('PARSED DATA', data)

    /* Validate data. */
    if (!data) {
        return console.error('GETFILE handler has NO data available', _data)
    }

    /* Initialize success. */
    let success = null

    /* Initialize peers. */
    let peers = null

    /* Retrieve destination. */
    const dest = data.dest

    console.log('Querying peers for destination', dest)

    /* Calculate info hash. */
    const infoHash = Buffer.from(_utils.calcInfoHash(dest), 'hex')

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
    const innerPath = data.request

    /* Initialize body holder. */
    let body = null

    // FOR TESTING PURPOSES ONLY
    filtered.unshift('185.142.236.207:10443')

    console.log(`Requesting ${innerPath} for ${dest} via ${filtered[0]}`);

    body = await _requestFile(_zeroEvent, filtered[0], dest, innerPath)
        .catch((err) => {
            console.error(`Oops! Looks like ${dest} was a dud, try again...`)
        })

    /* Validate results. */
    if (filtered && filtered.length > 0 && body) {
        success = true
    } else {
        success = false
    }

    /* Initialize file extension. */
    let fileExt = null

    if (innerPath.indexOf('.') !== -1) {
        /* Retrieve the file extention. */
        fileExt = innerPath.split('.').pop()
    }

    /* Decode body (if needed). */
    switch (fileExt.toUpperCase()) {
    case 'HTM':
    case 'HTML':
        body = body.toString()
        break
    default:
        // NOTE Leave as buffer (for binary files).
    }

    /* Build (data) message. */
    data = { dest, innerPath, body, success }

    /* Emit message. */
    _zeroEvent.emit('response', _requestId, data)
}

module.exports = _handler
