/*******************************************************************************
 *
 * IMPORTANT NOTICE
 * ----------------
 *
 * BITTORRENT TRACKER DISCOVERY IS DEPRECATED
 *
 * IN THE FUTURE ALL DISCOVERY WILL BE MANAGED BY
 * DISTRUBTED HASH TABLES (DHT) AND PEER EXCHANGE (PEX)
 */


const Tracker = require('bittorrent-tracker')
const DHT = require('bittorrent-dht')

const _constants = require('./_constants')
const _handshake = require('./_handshake')
const _utils = require('./_utils')


/**
 * Class: Discovery
 */
class Discovery {
    constructor(_infoHash) {
        console.info('New P2P Discovery created!')

        /* Initialize holder of successful peer connections. */
        this._peers = []

        /* Initialize found max flag. */
        this._foundMax = false

        this._foundPeers = []
        this._foundDups = 0

        /* Initialize BitTorrent tracker. */
        this._tracker = null

        /* Initialize DHT client. */
        this._dht = null

        /* Initialize a new peer id. */
        const peerId = Buffer.from(_utils.getPeerId('US'))
        this._peerId = peerId

        /* Initialize BitTorrent tracker options. */
        this._trackerOptions = {
            infoHash: _infoHash,
            peerId,
            announce: [
                // 'udp://tracker.leechers-paradise.org:6969/announce',
                // 'udp://tracker.open-internet.nl:6969/announce',
                'udp://tracker.coppersurfer.tk:6969/announce',
                // 'http://tracker.swateam.org.uk:2710/announce',
                'http://open.acgnxtracker.com/announce'
            ],
            port: _constants.ZEROPEN_PORT
        }

        /* Initialize DHT options. */
        this._dhtOptions = {
            bootstrap: [
                'router.bittorrent.com:6881',
                // 'router.utorrent.com:6881',
                // 'dht.transmissionbt.com:6881',
                // 'tracker.0net.io:6888'
            ]
        }
    }

    get foundPeers() {
        return this._foundPeers
    }

    get foundMax() {
        return this._foundMax
    }

    get peerId() {
        return this._peerId
    }

    get peerInfo() {
        return `
            Peer Id   : ${Buffer.from(peerId).toString('hex')} [ ${Buffer.from(peerId).toString()} ]
            Info Hash : ${Buffer.from(infoHash).toString('hex')}
        `
    }

    set foundMax(_found) {
        this._foundMax = _found
    }

    set peerId(_peerId) {
        this._peerId = _peerId
    }

    /**
     * Add a New Peer
     */
    addPeer(_peer) {
        if (this.foundPeers.indexOf(_peer) === -1) {
            this.foundPeers.push(_peer)
        } else {
            this.foundDups++
        }
    }

    startTracker() {
        /* Localize this. */
        const self = this

        let resolve = null
        let reject = null

        /* Initialize a NEW client connection/handshake (if needed). */
        const promise = new Promise((_resolve, _reject) => { // eslint-disable-line promise/param-names
            /* Initialize promise holders. */
            resolve = _resolve
            reject = _reject
        })

        this.tracker = new Tracker(this._trackerOptions)

        this.tracker.on('error', function (err) {
            console.log(err.message)
        })

        this.tracker.on('warning', function (err) {
            /* A tracker was unavailable or sent bad data to the this.tracker. */
            // NOTE We can probably ignore it.
            console.log(err.message)
        })

        this.tracker.on('update', function (_data) {
            console.log(`
Status from [ ${_data.announce} ]
________________________________________________________________________________

# of Seeders  : ${_data.complete}
# of Leechers : ${_data.incomplete}
            `)
        })

        this.tracker.on('peer', function (_addr) {
            /* Add new peer (checking for duplicates). */
            self.addPeer(_addr)

            if (self.foundPeers.length >= 50 && !self._foundMax) {
                self._foundMax = true

                resolve(self.foundPeers)
            }
        })

        // announce that download has completed (and you are now a seeder)
        // this.tracker.complete()

        // force a tracker announce. will trigger more 'update' events and maybe more 'peer' events
        // this.tracker.update()

        // provide parameters to the tracker
        // this.tracker.update({
        //   uploaded: 0,
        //   downloaded: 0,
        //   left: 0,
        //   customParam: 'blah' // custom parameters supported
        // })

        // stop getting peers from the tracker, gracefully leave the swarm
        // this.tracker.stop()

        // ungracefully leave the swarm (without sending final 'stop' message)
        // this.tracker.destroy()

        this.tracker.on('scrape', function (_data) {
            console.log(`
Received scrape response from [ ${_data.announce} ]
________________________________________________________________________________

# of Seeders   : ${_data.complete}
# of Leechers  : ${_data.incomplete}
# of Downloads : ${_data.downloaded}
            `)
        })

        /* Start getting peers from the tracker. */
        this.tracker.start()

        setTimeout(() => {
            if (!this.foundMax) {
                // console.log('DISCOVERY TIMEOUT CALLED!')
                this.foundMax = true

                resolve(this.foundPeers)
            }
        }, 5000)

        return promise
    }

    startDHT() {
        /* Initialize DHT. */
        this.dht = new DHT(this.dhtOptions)

        /* Start listening. */
        this.dht.listen(_constants.ZEROPEN_PORT, function () {
            console.info(`DHT listening on port ${_constants.ZEROPEN_PORT}`)
        })

        /**
         * Announce that we have peers seeding this info hash.
         */
        // this.dht.announce(infoHash, _constants.ZEROPEN_PORT, function (err) {
        //     if (err) {
        //         console.error('DHT announcement error', err)
        //     }
        // })

        /* Handle peer notification. */
        this.dht.on('peer', function (peer, infoHash, from) {
            console.log('found potential peer ' + peer.host + ':' + peer.port + ' through ' + from.address + ':' + from.port)
        })

        /* Lookup info hash from DHT network. */
        // this.dht.lookup(infoHash)

        /* Request data/info from DHT network. */
        // this.dht.get(infoHash, {}, function (err, res) {
        //     if (err) {
        //         return console.error('DHT get error', err)
        //     }
        //
        //     console.log('DHT get result', res)
        // })
    }
}

module.exports = Discovery
