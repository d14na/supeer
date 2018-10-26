/* Initialize local libraries. */
const _utils = require('../libs/_utils')
const Discovery = require('../libs/discovery')
const Peer0 = require('../libs/peer0')

/* Initialize peer manager. */
const peerMgr = {}

/**
 * Request Zeronet File
 */
const _requestFile = function (_zeroEvent, _peer, _dest, _innerPath) {
    return new Promise(async (_resolve, _reject) => {
        /* Initialize connection. */
        let conn = null

        /* Initialize peer. */
        let peer = null

        /* Search for available (READY) connections. */
        for (let address in peerMgr) {
            /* Set peer. */
            peer = peerMgr[address]

            if (peer['dest'] === _dest && peer['conn'].isReady) {
                /* Set the active connection. */
                conn = peer['conn']

                console.info(`Found READY connection from [ ${address} ]`)

                /* We're done! */
                break
            }
        }

        /* Validate connection. */
        if (!conn) {
            /* Create new (Peer0) connection. */
            conn = new Peer0(_zeroEvent, _peer)

            /* Initialize a new peer connection. */
            const init = await conn.init()
                .catch(_reject)

            /* Validate initialization. */
            if (init && init.action === 'HANDSHAKE') {
                /* Set destination. */
                const dest = _dest

                console.info(`[ ${conn.address} ] is ready [ ${conn.isReady} ]`)

                /* Add to peer manager. */
                // NOTE Address includes ip and port.
                peerMgr[conn.address] = { dest, conn }
            } else {
                return _reject(`Handshake with [ ${_peer} ] failed!`)
            }
        }

        /* Request file data from active connection. */
        const fileData = await conn.requestFile(_dest, _innerPath, 0)
            .catch(_reject)

        _resolve(fileData)
    })
}

const _handler = async function (_zeroEvent, _requestId, _data) {
    // console.log('RECEIVED GETFILE REQUEST', _data)

    /* Initialize data. */
    let data = null

    /* Parse data. */
    data = _utils.parseData(_data)
    // console.log('PARSED DATA', data)

    /* Validate data. */
    if (!data) {
        return console.error('GET handler has NO "parseable" data available', _data)
    }

    /* Initialize success. */
    let success = null

    /* Initialize destination. */
    let dest = null

    /* Initialize info hash. */
    let infoHash = null

    /* Retrieve Zeronet destination. */
    dest = data.dest

    /* Retrieve torrent info hash. */
    infoHash = data.infoHash

    /* Retrieve request (follows data id endpoint by ':'). */
    const request = data.request

    console.log('Destination / Info Hash / Request', dest, infoHash, request)

    /* Validate destination OR info hash OR data id. */
    if (!dest && !infoHash && !request) {
        return console.error('ERROR loading data:', _data)
    }

    if (dest) {
        /* Initialize peers. */
        let peers = null

        console.log('Querying peers for destination', dest)

        /* Calculate info hash. */
        infoHash = Buffer.from(_utils.calcInfoHash(dest), 'hex')

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

        /* Set inner path. */
        const innerPath = request

        /* Initialize body manager. */
        let body = null

        // TEMP FOR TESTING PURPOSES ONLY
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

        /* Build (data) message. */
        data = { dest, innerPath, body, success }

        /* Emit message. */
        _zeroEvent.emit('response', _requestId, data)
    } else if (infoHash) {
        /* Validate request. */
        if (request === 'torrent') {
            /* Emit message. */
            _zeroEvent.emit('requestInfo', _requestId, Buffer.from(infoHash, 'hex'))
        } else if (Number.isInteger(parseInt(request))) {
            /* Retrieve data id. */
            const dataId = _data.dataId

            /* Emit message. */
            _zeroEvent.emit('requestBlock', _requestId, dataId)
        } else {
            return console.error('ERROR parsing info hash request data:', request)
        }
    }
}

module.exports = _handler
