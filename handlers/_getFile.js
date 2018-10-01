/* Initialize local libraries. */
const _utils = require('../libs/_utils')
const Discovery = require('../libs/discovery')
const Peer0 = require('../libs/peer0')

const _requestFile = async function (_peer, _destination, _innerPath) {
    /* Create new Peer. */
    const peer0 = new Peer0(_peer, _destination)

    /* Open a new connection. */
    const conn = await peer0.openConnection()

    if (conn && conn.action === 'HANDSHAKE') {
        /* Start discovery of peers. */
        const fileData = await peer0.requestFile(_innerPath, 0)
        console.log('RECEIVED THIS FILE DATA', fileData)
    }
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

    console.log(`Requesting ${innerPath} from ${destination} via ${filtered[0]}`);
    _requestFile(filtered[0], destination, innerPath)

    /* Validate results. */
    if (filtered && filtered.length > 0) {
        success = true
    } else {
        success = false
    }

    /* Build package. */
    pkg = { peers: filtered, success }

    return pkg
}
module.exports = _handler
