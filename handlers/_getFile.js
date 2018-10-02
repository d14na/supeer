/* Initialize local libraries. */
const _utils = require('../libs/_utils')
const Discovery = require('../libs/discovery')
const Peer0 = require('../libs/peer0')

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

const _handler = async function (_data) {
    /* Initialize success. */
    let success = null

    /* Initialize peers. */
    let peers = null

    /* Retrieve destination. */
    const destination = _data.dest
    console.log('Querying peers for destination', destination)

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
    const innerPath = _data.innerPath

    /* Initialize body holder. */
    let body = null

    // FOR TESTING PURPOSES ONLY
    filtered.unshift('185.142.236.207:10443')

    console.log(`Requesting ${innerPath} from ${destination} via ${filtered[0]}`);
    body = await _requestFile(filtered[0], destination, innerPath)
        .catch((err) => {
            console.error(`Oops! Looks like ${destination} was a dud, try again...`)
        })

    /* Validate results. */
    if (filtered && filtered.length > 0 && body) {
        success = true
    } else {
        success = false
    }

    /* Decode buffer to string. */
    body = body.toString()

    /* Build package. */
    pkg = { peers: filtered, body, success }

    return pkg
}

module.exports = _handler
