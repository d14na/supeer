const Client = require('bittorrent-tracker')
const DHT = require('bittorrent-dht')
const NetcatClient = require('netcat/client')

const _constants = require('./_constants')
const _handleIncomingData = require('./_handleIncomingData')
const _handshake = require('./_handshake')
const _utils = require('./_utils')


/* Initialize peer connection holder. */
let peerConn = []

/* Initialize a new peer id. */
const peerId = Buffer.from(_utils.getPeerId('US'))

const infoHash = Buffer.from(_utils.calcInfoHash('1Gfey7wVXXg1rxk751TBTxLJwhddDNfcdp'), 'hex')
// const infoHash = Buffer.from(_utils.calcInfoHash('1HeLLo4uzjaLetFx6NH3PMwFP3qbRbTf3D'), 'hex')
// const infoHash = Buffer.from(_utils.calcInfoHash('1Name2NXVi1RDPDgf5617UoW7xA6YrhM9F'), 'hex')
console.log(
`
Peer Id   : ${Buffer.from(peerId).toString('hex')} [ ${Buffer.from(peerId).toString()} ]
Info Hash : ${Buffer.from(infoHash).toString('hex')}
`)


/******************************************************************************/


const options = {
    bootstrap: [
        'router.bittorrent.com:6881',
        // 'router.utorrent.com:6881',
        // 'dht.transmissionbt.com:6881',
        // 'tracker.0net.io:6888'
    ]
}

const dht = new DHT(options)

dht.listen(_constants.ZEROPEN_PORT, function () {
    console.info(`DHT listening on port ${_constants.ZEROPEN_PORT}`)
})

/**
 * Announce that we have peers seeding this info hash.
 */
// dht.announce(infoHash, _constants.ZEROPEN_PORT, function (err) {
//     if (err) {
//         console.error('DHT announcement error', err)
//     }
// })

dht.on('peer', function (peer, infoHash, from) {
    console.log('found potential peer ' + peer.host + ':' + peer.port + ' through ' + from.address + ':' + from.port)
})

// dht.lookup(infoHash)

// dht.get(infoHash, {}, function (err, res) {
//     if (err) {
//         return console.error('DHT get error', err)
//     }
//
//     console.log('DHT get result', res)
// })


const requiredOpts = {
  infoHash,
  peerId,
  announce: [
      'udp://tracker.open-internet.nl:6969/announce',
      'udp://tracker.coppersurfer.tk:6969/announce'
  ],
  port: _constants.ZEROPEN_PORT
}

var client = new Client(requiredOpts)

client.on('error', function (err) {
  // fatal client error!
  console.log(err.message)
})

client.on('warning', function (err) {
  // a tracker was unavailable or sent bad data to the client. you can probably ignore it
  console.log(err.message)
})

client.on('update', function (_data) {
    console.log(
`
Status from [ ${_data.announce} ]
________________________________________________________________________________

# of Seeders  : ${_data.complete}
# of Leechers : ${_data.incomplete}
`)
})

client.on('peer', function (addr) {
    const peerCount = _utils.addPeer(addr)
    console.log(`Found peer #${peerCount} [ ${addr} ]`)
})

// announce that download has completed (and you are now a seeder)
// client.complete()

// force a tracker announce. will trigger more 'update' events and maybe more 'peer' events
// client.update()

// provide parameters to the tracker
// client.update({
//   uploaded: 0,
//   downloaded: 0,
//   left: 0,
//   customParam: 'blah' // custom parameters supported
// })

// stop getting peers from the tracker, gracefully leave the swarm
// client.stop()

// ungracefully leave the swarm (without sending final 'stop' message)
// client.destroy()

client.on('scrape', function (_data) {
    console.log(
`
Received scrape response from [ ${_data.announce} ]
________________________________________________________________________________

# of Seeders   : ${_data.complete}
# of Leechers  : ${_data.incomplete}
# of Downloads : ${_data.downloaded}
`)
})

// start getting peers from the tracker
client.start()

const _checkConnections = function (_foundPeers) {
    let stopIndex = 0
    for (let address of _foundPeers) {
        console.log(`Connecting with ${address}`)

        const peerIp = address.split(':')[0]
        const peerPort = address.split(':')[1]

        /* Skip 0 ports. */
        if (peerPort === 0) {
            console.log(`Skipping ${address}`)

            continue
        }

        /* Open connection with peer. */
        const peer = _connect(address)
        // console.log('PEER', peer)

        peer.on('connect', function () {
            console.info(`Connection opened with ${address}`)

            const handshake = _handshake(peerIp, peerPort, peerId)
// console.log('HANDSHAKE', handshake)

            /* Create encoded package. */
            const pkg = _utils.encode(handshake)
// console.log('PACKAGE', pkg)

            /* Send the handshake. */
            peer.send(pkg, function () {
                console.log(`Sent handshake to ${address}`)
            })
        })

        peer.on('close', function () {
            console.info(`Connection closed with ${address}`)
        })

        peer.on('error', function (_err) {
            console.error(`Error detected with ${address}`, _err)
        })

        peer.on('data', function (_data) {
// console.log('INCOMING DATA', _data)
            _handleIncomingData(_data)
        })

        if (stopIndex++ == 3) {
            break
        }
    }
}

const _connect = function (_peer) {
    /* Initialize host ip address. */
    const hostIp = _peer.split(':')[0]

    /* Initialize host port. */
    // NOTE This value must be an integer (or it will fail).
    const hostPort = parseInt(_peer.split(':')[1])

    /* Initialize netcat client. */
    const nc = new NetcatClient()

    /* Initialize connection parameters. */
    peerConn[_peer] = nc.addr(hostIp).port(hostPort)

    /* Open connection to peer. */
    const conn = peerConn[_peer].connect()

    /* Return connection. */
    return conn
}

setTimeout(() => {
    if (!_utils.getSummaryDisplayed()) {
        _utils.displaySummary()
    }

    const foundPeers = _utils.getFoundPeers()
    // console.log('Found Peers', foundPeers)
    _checkConnections(foundPeers)
}, 5000)

// scrape
// client.scrape()
