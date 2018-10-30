// const Bottleneck = require('bottleneck')

/* Initialize local libraries. */
const Discovery = require('../libs/discovery')
const Peer0 = require('../libs/peer0')
const _utils = require('../libs/_utils')

/* Initialize peer manager. */
const peerMgr = {}

/* Initialize busy flag. */
let isBusy = false

// const limiter = new Bottleneck({
//     maxConcurrent: 1,
//     minTime: 500
// })

/**
 * Handle Request Queue
 */
const _handleRequestQueue = async function (_zeroEvent, _peer) {
    console.log('HANDLE REQUEST QUEUE', _peer.queue.length);
    /* Set conn. */
    const conn = _peer.conn

    if (_peer.queue.length > 0 && !isBusy) {
        /* Set busy flag. */
        isBusy = true

        /* Pull the next request (out of queue). */
        const request = _peer.queue.shift()
        // const request = queue.shift()

        console.log('NEXT REQUEST', request.requestId, request.innerPath)

        /* Set request id. */
        const requestId = request.requestId

        /* Set destination. */
        const dest = request.dest

        /* Set inner path. */
        const innerPath = request.innerPath

        /* Initialize body. */
        // let body = null

        /* Request body (file data) from active connection. */
        const body = await conn.requestFile(dest, innerPath, 0)
            .catch((_err) => {
                console.error(`Oops! Looks like ${dest} was a dud, try again...`, _err)
            })

        console.log('RECEIVED BODY', body.length, innerPath)

        // _resolve(fileData)

        /* Validate results. */
        if (body) {
        // if (filtered && filtered.length > 0 && body) {
            // body = fileData

            success = true
        } else {
            success = false
        }

        /* Build (data) message. */
        data = { dest, innerPath, body, success }

        /* Emit message. */
        _zeroEvent.emit('response', requestId, data)
        console.log('EMITTED RESPONSE FOR ', requestId);

        /* Set busy flag. */
        isBusy = false

        /* Handle request queue. */
        _handleRequestQueue(_zeroEvent, _peer)
    }
}

/**
 * Request Zeronet File
 */
const _requestFile = async function (_zeroEvent, _peer, _requestId, _dest, _innerPath) {
    // return new Promise(async (_resolve, _reject) => {
    /* Initialize connection. */
    let conn = null

    /* Initialize peer. */
    let peer = null

    /* Set request id. */
    const requestId = _requestId

    /* Set destination. */
    const dest = _dest

    /* Set inner path. */
    const innerPath = _innerPath

    /* Search for available (READY) connections. */
    // NOTE Randomize this to allow for parallel peer requests.
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
            .catch((_err) => {
                console.error('ERROR: Peer Initialization', _err, _peer)
            })

        /* Validate initialization. */
        if (init && init.action === 'HANDSHAKE') {
            console.info(`[ ${conn.address} ] is ready [ ${conn.isReady} ]`)

            /* Initialize request queue. */
            const queue = []

            /* Add to peer manager. */
            // NOTE Address includes ip and port.
            peerMgr[conn.address] = { conn, dest, queue }
        } else {
            return _reject(`Handshake with [ ${_peer} ] failed!`)
        }
    }

    /* Add to peer's (request) queue. */
    peerMgr[conn.address]['queue'].push({ requestId, conn, dest, innerPath })

    /* Request file data from active connection. */
    // const fileData = await _conn.requestFile(_dest, _innerPath, 0)
    //     .catch(_reject)

    // _resolve(fileData)

    /* Handle request queue. */
    _handleRequestQueue(_zeroEvent, peerMgr[conn.address])
    // })
}

// const wrapped = limiter.wrap(_requestFile)

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

        // console.log('Querying peers for destination', dest)

        /* Calculate info hash. */
        infoHash = Buffer.from(_utils.calcInfoHash(dest), 'hex')

        /* Create new Discovery. */
        // const discovery = new Discovery(infoHash)

        /* Start discovery of peers. */
        // peers = await discovery.startTracker()
        // console.log('FOUND THESE PEERS', peers)

        /* Initialize filtered. */
        let filtered = []

        /* Filter peers. */
        // filtered = peers.filter((_peer) => {
        //     /* Retrieve port. */
        //     const port = parseInt(_peer.split(':')[1])
        //
        //     return port > 1
        // })

        /* Set inner path. */
        const innerPath = request

        /* Initialize body manager. */
        let body = null

        // TEMP FOR TESTING PURPOSES ONLY
        filtered.unshift('185.142.236.207:10443')

        console.log(`Requesting ${innerPath} for ${dest} via ${filtered[0]}`);

        // body = await wrapped(_zeroEvent, filtered[0], dest, innerPath)
        // body = await _requestFile(_zeroEvent, filtered[0], _requestId, dest, innerPath)
        _requestFile(_zeroEvent, filtered[0], _requestId, dest, innerPath)
        // .catch((_err) => {
        //     console.error(`Oops! Looks like ${dest} was a dud, try again...`, _err)
        // })

        // /* Validate results. */
        // if (filtered && filtered.length > 0 && body) {
        //     success = true
        // } else {
        //     success = false
        // }
        //
        // /* Build (data) message. */
        // data = { dest, innerPath, body, success }
        //
        // /* Emit message. */
        // _zeroEvent.emit('response', _requestId, data)
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
