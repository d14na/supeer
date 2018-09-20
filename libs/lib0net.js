const Client = require('bittorrent-tracker')
const DHT = require('bittorrent-dht')
const net = require('net')

const _constants = require('./_constants')
const _handshake = require('./_handshake')
const _utils = require('./_utils')

/* Initialize holder of successful peer connections. */
let peers = []

/* Initialize a new peer id. */
const peerId = Buffer.from(_utils.getPeerId('US'))

/* Initialize file request flag. */
fileRequested = false

const site = '1Gfey7wVXXg1rxk751TBTxLJwhddDNfcdp'
// const site = '1HeLLo4uzjaLetFx6NH3PMwFP3qbRbTf3D'
// const site = '1Name2NXVi1RDPDgf5617UoW7xA6YrhM9F'

// const innerPath = 'index.html'
// const innerPath = 'archive.py'
// const innerPath = 'content.json'
const innerPath = 'messages.json'

const infoHash = Buffer.from(_utils.calcInfoHash(site), 'hex')
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

const _requestFile = function (_peer, _location) {
// console.log('STARTING FILE REQUEST')
    const cmd = 'getFile'
    // const innerPath = innerPath
    // const site = site

    /* Initialize the location (file data pointer/index). */
    let location = _location

    /* Build a request object (for internal tracking). */
    const request = { cmd, site, innerPath, location }

    /* Add the request to the pool and receive a new request id. */
    const req_id = _utils.addRequest(request)

    const inner_path = innerPath

    const params = { site, inner_path, location }

    const pkg = { cmd, req_id, params }
    // console.log('SENDING PACKAGE', pkg)

    /* Send request. */
    _peer.write(_utils.encode(pkg), function () {
        console.log(`Sent request for [ ${inner_path} @ ${location} ]`)
    })
}

const _manageConnections = function (_peers) {
    /* Initialize connection count. */
    let connCount = 0

    for (let address of _peers) {
        console.log(`Connecting with ${address}`)

        const peerIp = address.split(':')[0]
        const peerPort = address.split(':')[1]

        /* Skip peers with port number [ 0 ]. */
        if (peerPort === 0) {
            console.log(`Skipping ${address}`)

            continue
        }

        /* Open connection with peer (request handshake). */
        const peer = _openConnection(address)
        // console.log('PEER', peer)

        /* Handle closed connection. */
        peer.on('close', function () {
            console.info(`Connection closed with ${address}`)
        })

        /* Handle connection errors. */
        peer.on('error', function (_err) {
            console.error(`Error detected with ${address} [ ${_err.message} ]`, )
        })

        /* Handle incoming data. */
        peer.on('data', async function (_data) {
            /* Initialize incoming data handler. */
            const handleIncomingData = require('./_handleIncomingData')

            /* Retrieve response from data handler. */
            const data = await handleIncomingData(address, _data)

            /* Validate data. */
            if (!data) {
                throw new Error('Data failed to be returned from handler.')
            }

if (_utils.isJson(data)) {
    console.log(`Returned data is JSON OBJECT`, data)
} else if (_utils.isJson(data, true)) {
    console.log(`Returned data is JSON STRING`, JSON.parse(data))
} else {
    console.log(`Returned data is RAW\n${data.toString('hex')}\n${data.toString()}`)
}

            /* Handle handshakes. */
            if (data.success && data.action == 'HANDSHAKE') {
return _requestFile(peer, 0)

                /* Limit max connections. */
                if (connCount++ === _constants.ZEROPEN_MAX_CONN) {
                    console.info(`\nWe successfully handshaked with [ ${peers.length} ] peers.`)

                    if (!fileRequested) {
                        /* Set file request flag. */
                        fileRequested = true

                        /* Request the file from first peer. */
                        _requestFile(peer, 0)
                    }
                } else {
                    /* Add peer to (successfully) connected list. */
                    peers.push(peer)
                }
            }

            /* Verify length of data body. */
            if (data.decoded && data.decoded.body) {
                const body = data.decoded.body
                console.log(`Data body length is [ ${body.length} ]`)
                console.log(`Data body hash is [ ${_utils.calcFileHash(body)} ]`)
            }

            /* Check for overload. */
            if (data.overload && data.location) {
                // console.log('CONTINUE WITH DATA REQUEST', _utils.innerPath, data.location)
                /* Continue with data request. */
                _requestFile(peer, data.location)
            }

            /* Parse and update the config files. */
            // if (data.request && data.request.innerPath === 'content.json') {
            //     const body = data.decoded.body
            //
            //     const files = JSON.parse(body).files
            //
            //     _utils._updateFiles(files)
            // }

        })

        /* Limit max connection requests. */
        // NOTE We should NOT request ALL peers at once, to limit resource use.
        if (connCount === _constants.ZEROPEN_MAX_CONN) {
            // console.log('\nAll connected peers', peers)
            break
        }
        break
    }
}

const _openConnection = function (_peer) {
    /* Initialize host ip address. */
    const hostIp = _peer.split(':')[0]

    /* Initialize host port. */
    // NOTE This value must be an integer (or it will fail).
    const hostPort = parseInt(_peer.split(':')[1])

    /* Open connection to peer. */
    const conn = net.createConnection(hostPort, hostIp, () => {
        console.info(`Opened new connection [ ${hostIp}:${hostPort} ]`)

        /* Initialize handshake. */
        const handshake = _handshake(hostIp, hostPort, peerId)

        /* Encode handshake package. */
        const pkg = _utils.encode(handshake)

        /* Send package. */
        conn.write(pkg)
    })

    /* Return connection. */
    return conn
}

setTimeout(() => {
    if (!_utils.getSummaryDisplayed()) {
        _utils.displaySummary()
    }

    /* Retrieve found peers. */
    const foundPeers = _utils.getFoundPeers()

    /* Filter peers. */
    const filteredPeers = foundPeers.filter(peer => {
        /* Retrieve port number. */
        const portNum = parseInt(peer.split(':')[1])

        /* Remove peers with port num [ 0 ]. */
        if (portNum === 0) {
            return false
        } else {
            return true
        }
    })
    // console.log('Filtered Peers', filteredPeers)

    /* Check the peer connections. */
    _manageConnections(filteredPeers)
}, 5000)

// scrape
// client.scrape()
