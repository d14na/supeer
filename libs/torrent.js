const bencode = require('bencode')
const Bitfield = require('bitfield')
const Piece = require('torrent-piece')
const Protocol = require('bittorrent-protocol')
const ut_metadata = require('ut_metadata') // eslint-disable-line camelcase

/* Initialize local library. */
const _constants = require('./_constants')
const _utils = require('./_utils')
const DEBUG = false

/**
 * Class: Torrent (BitTorrent)
 */
class Torrent {
    constructor(_pex, _requestId, _infoHash) {
        /* Initialize communications. */
        this._wire = null
        this._dht = null

        /* Bind public methods. */
        this.init = this.init.bind(this)

        /* Bind private methods. */
        this._addPeer = this._addPeer.bind(this)
        this._handleMetadata = this._handleMetadata.bind(this)
        this._requestChunk = this._requestChunk.bind(this)

        /* Initialize session holders. */
        this._haveDataSource = false
        this._haveMetadata = false

        /* Initialize block holders. */
        this._block = null
        this._blockHashes = []
        this._blockIndex = 0
        this._blockLength = 0
        this._chunkIndex = 0
        this._numBlockChunks = 0

        /* Initialize peer holders. */
        this._pex = _pex
        this._requestId = _requestId
        // this._peer = _peer
        this._peers = {}
        this._dhtPeers = []
        this._peerId = null

        /* Initialize data holders. */
        this._infoHash = Buffer.from(_infoHash, 'hex')
    }

    get block() {
        return this._block
    }

    get blockHashes() {
        return this._blockHashes
    }

    get blockIndex() {
        return this._blockIndex
    }

    get blockLength() {
        return this._blockLength
    }

    get chunkIndex() {
        return this._chunkIndex
    }

    get numBlockChunks() {
        return this._numBlockChunks
    }

    get dht() {
        return this._dht
    }

    get haveDataSource() {
        return this._haveDataSource
    }

    get haveMetadata() {
        return this._haveMetadata
    }

    get infoHash() {
        return this._infoHash
    }

    get pex() {
        return this._pex
    }

    get requestId() {
        return this._requestId
    }

    // get peer() {
    //     return this._peer
    // }

    get peers() {
        return this._peers
    }

    get dhtPeers() {
        return this._dhtPeers
    }

    get peerId() {
        return this._peerId
    }

    get wire() {
        return this._wire
    }

    set block(_block) {
        this._block = _block
    }

    set blockHashes(_blockHashes) {
        this._blockHashes = _blockHashes
    }

    set blockIndex(_blockIndex) {
        this._blockIndex = _blockIndex
    }

    set blockLength(_blockLength) {
        this._blockLength = _blockLength
    }

    set chunkIndex(_chunkIndex) {
        this._chunkIndex = _chunkIndex
    }

    set numBlockChunks(_numBlockChunks) {
        this._numBlockChunks = _numBlockChunks
    }

    set dht(_dht) {
        this._dht = _dht
    }

    set haveDataSource(_dataSource) {
        this._haveDataSource = _dataSource
    }

    set haveMetadata(_metadata) {
        this._haveMetadata = _metadata
    }

    // set peers(_peers) {
    //     this._peers = _peers
    // }

    set peerId(_peerId) {
        this._peerId = _peerId
    }

    set wire(_wire) {
        this._wire = _wire
    }

    /**
     * Add Peer
     *
     * Called after a successful handshake.
     */
    _addPeer(_peerId, _extensions) {
        if (!this._peers[_peerId]) {
            this._peers[_peerId] = {
                extensions: _extensions,
                dataAdded:  new Date().toJSON(),
                lastUpdate: new Date().toJSON()
            }

            /* Retrieve total # of peers. */
            const numPeers = Object.keys(this._peers).length

            console.log(`Added new peer [ ${_peerId} ] of ${numPeers}`)
        }
    }

    _addDhtPeer(_peerAddress) {
        let foundPeer = false

        for (let peer of this._dhtPeers) {
            if (_peerAddress === peer['address']) {
                foundPeer = true
                peer['nodeRefs']++
            }
        }

        if (!foundPeer) {
            this._dhtPeers.push({
                address: _peerAddress,
                nodeRefs: 1
            })
        }
    }

    init() {
        /**
         * Info Hash Request
         */
        this.pex.zeroevt.on('info', (_dht, _infoHash) => {
            console.info(
                `Now requesting peers for [ ${Buffer.from(this.infoHash).toString('hex')} ]`)

            // /* Add DHT peer. */
            // this._addDhtPeer(`${_peer.host}:${_peer.port}`)

            /* Request peers with our info hash (from all available nodes). */
            _dht.lookup(this.infoHash, (_err, _nodesFound) => {
                if (_err) {
                    return console.error('DHT lookup error', _err)
                }

                console.info(`DHT found [ ${_nodesFound} ] nodes.`)

                /* Retrieve # of total peers found. */
                const totalPeers = this.dhtPeers.length

                /* Sort peers by node references. */
                this.dhtPeers.sort((a, b) => {
                    return b['nodeRefs'] - a['nodeRefs']
                })

                /* Initialize holder for TOP 3 peers. */
                let topPeers = []

                /* List the TOP 50 peers. */
                for (let [index, peer] of this.dhtPeers.entries()) {
                    /* List max 50 peers. */
                    if (index === 50) {
                        console.log()
                        break
                    }

                    /* TOP Nodes. */
                    if (index === 0) {
                        console.log('\nTOP Nodes for Info Hash')
                        console.log('----------------------------------------')
                    }

                    if (index < 3) {
                        topPeers.push({
                            address: peer['address'],
                            nodeRefs: peer['nodeRefs']
                        })
                    }

                    /* Premium ONLY Nodes. */
                    if (index === 3) {
                        console.log('\nHODLRE & Subscriber ONLY Nodes')
                        console.log('----------------------------------------')
                    }

                    console.log(`Peer #${index + 1} of ${totalPeers}: ${peer['address']} has ${peer['nodeRefs']} node references`)
                }

                /* Initialize ALL peers info. */
                const allPeers = 'This is a ZeroResident feature. Please subscribe..'

                /* Set info hash. */
                const infoHash = Buffer.from(this.infoHash).toString('hex')

                /* Set success flag. */
                const success = true

                /* Build info. */
                const info = { infoHash, topPeers, allPeers, totalPeers }

                /* Build message. */
                const msg = { info, success }

                /* Emit message. */
                this.pex.zeroevt.emit('response', this.requestId, msg)

                console.log(`DHT is announcing [ ${infoHash} ]`)

                /* Announce that we have peers seeding this info hash. */
                // _dht.announce(this.infoHash, 6881, (_err) => {
                _dht.announce(this.infoHash, _constants.ZEROPEN_PEX_PORT, (_err) => {
                    if (_err) {
                        console.error('DHT announcement error', _err)
                    }
                })
            })

            /* Add error listener. */
            this.pex.zeroevt.on('error', function (_err) {
                console.error('Oops! Zer0PEN handler had an error', _err)
            })

            /* Start listening on new PEX server. */
            this.pex.zeroevt.on('socket', (_socket) => {
                // console.info('NEW incoming peer connection!')

                /* Initialize the wire protocol. */
                this.wire = new Protocol()

                /* Add error listener. */
                this.wire.on('error', function (_err) {
                    console.error('Oops! Peer wire had an error', _err)
                })

                // NOTE We are piping to and from the protocol.
                _socket.pipe(this.wire).pipe(_socket)

                /* Request metadata, if needed. */
                if (!this.haveMetadata) {
                    console.info('Requesting METADATA.')

                    // initialize the extension
                    this.wire.use(ut_metadata())

                    // ask the peer to send us metadata
                    this.wire.ut_metadata.fetch()

                    // 'metadata' event will fire when the metadata arrives and is verified to be correct!
                    this.wire.ut_metadata.on('metadata', this._handleMetadata)

                    // optionally, listen to the 'warning' event if you want to know that metadata is
                    // probably not going to arrive for one of the above reasons.
                    this.wire.ut_metadata.on('warning', _err => {
                        console.log('METADATA WARNING', _err.message)
                    })
                }

                /* Handshake. */
                this.wire.on('handshake', (_infoHash, _peerId, _extensions) => {
                    console.info(`Handshake from ${_peerId}`)
                    // console.log('HANDSHAKE EXTENSIONS', _extensions)

                    /* Add new peer. */
                    this._addPeer(_peerId, _extensions)
                    // console.log(this.wire)
                    // peerId: '2d5554333533532dcead15ab366f53c9235e00ad',
                    // peerIdBuffer: <Buffer 2d 55 54 33 35 33 53 2d ce ad 15 ab 36 6f 53 c9 23 5e 00 ad>,

                    /* Send the peer our handshake as well. */
                    this.wire.handshake(this.infoHash, this.peerId, { dht: true })
                })

                this.wire.on('bitfield', _bitfield => {
                    // console.log('BITFIELD', _bitfield)

                    const field = new Bitfield(_bitfield.buffer)
                    // console.log('BITFILED BUFFER', field.buffer)
                })

                this.wire.on('have', _blockIndex => {
                    // console.log('HAVE', _blockIndex, this.wire.peerInterested, this.wire.amInterested)

                    if (this.wire.peerPieces.get(this.blockIndex)) {
                        /* Announce our interest in this block. */
                        console.log(`Announcing our interest in block #${this.blockIndex}`)
                        this.wire.have(this.blockIndex)
                    }
                })

                this.wire.on('request', (_blockIndex, _offset, _length, _callback) => {
                    console.log('OH NO! A PEER HAS REQUESTED BLOCK', _blockIndex)
                    // ... read chunk ...
                    // callback(null, chunk) // respond back to the peer
                    _callback(null)
                })

                this.wire.on('interested', () => {
                    console.log('peer is now interested');
                })

                this.wire.on('uninterested', () => {
                    console.log('peer is no longer interested');
                })

                this.wire.on('port', _dhtPort => {
                    // peer has sent a port to us
                    // console.log('DHT PORT', _dhtPort)
                })

                this.wire.on('keep-alive', () => {
                    console.log('KEEP ALIVE')
                    // peer sent a keep alive - just ignore it
                })

                this.wire.on('choke', () => {
                    console.log('NOW BEING CHOKED! ' + this.wire.peerChoking);
                    // the peer is now choking us
                })

                this.wire.on('unchoke', () => {
                    if (this.haveDataSource) {
                        // FIXME Should we send a cancel (for our request)?
                        return '\n\nOH THANKS! BUT WE GOT THAT COVERED ALREADY!'
                    }

                    console.log('\n\n*** PEER is no longer choking us: ' + this.wire.peerChoking)

                    if (this.wire.peerPieces.get(this.blockIndex)) {
                        console.log('AND THEY HAVE THE BLOCK THAT WE NEED!')
                    } else {
                        console.log('OH NO! THEY DONT HAVE THE BLOCK WE NEED')
                    }

                    if (this.chunkIndex < this.numBlockChunks) {
                        const offset = (this.chunkIndex * Piece.BLOCK_LENGTH)
                        const length = Piece.BLOCK_LENGTH

                        console.log(`Making chunk request [ ${this.blockIndex}, ${this.chunkIndex} ] [ ${offset}, ${length} ]`)

                        /* Request a new chunk. */
                        this._requestChunk(this.blockIndex, this.chunkIndex, offset, length)
                    }
                })
            })
        })
    }

    /**
     * Handle Metadata
     */
    _handleMetadata(_metadata) {
        /* Immediately set the flag to stop requesting metadata. */
        this.haveMetadata = true

        // console.log('GOT METADATA',
        //     metadata, Buffer.from(metadata, 'hex').toString())

        /* Convert the metadata to a buffer. */
        const data = Buffer.from(_metadata, 'hex')

        /* Decode the metadata buffer using bencode. */
        const decoded = bencode.decode(data)
        // console.log('DECODED (RAW)', typeof decoded, decoded)

        /* Retrieve the torrent info. */
        const torrentInfo = decoded['info']
        // console.log('Torrent Metadata', torrentInfo)
        // console.log('Torrent Metadata', JSON.stringify(torrentInfo))

        /* Set info hash. */
        const infoHash = Buffer.from(this.infoHash).toString('hex')

        /* Set success flag. */
        const success = true

        /* Build info. */
        const info = { infoHash, torrentInfo }

        /* Build message. */
        const msg = { info, success }

        /* Return peer summary. */
        // this.resolve()

        /* Emit message. */
        this.pex.zeroevt.emit('response', this.requestId, msg)

        // Note: the event will not fire if the peer does not support ut_metadata, if they
        // don't have metadata yet either, if they repeatedly send invalid data, or if they
        // simply don't respond.
    }

    /**
     * Request Block Chunk
     */
    _requestChunk(_offset, _length) {
        /* Confirm that we are NOT being choked by this peer. */
        if (this.wire.peerChoking) {
            return console.log('\n\n***OH NO! WE THOUGHT WE HAD SOMETHING SPECIAL WITH THIS ONE')
        } else {
            // TEMP FOR TESTING ONLY: SET THE HAVE DATA SOURCE FLAG
            //      RESTRICTS TO A SINGLE DATA SOURCE
            //      EVENTUALLY WE SHOULD SUPPORT MULTIPLE SOURCES
            this.haveDataSource = true
        }

        console.log(`Now requesting block #${this.blockIndex} at ${_offset} for ${_length} bytes\n`)

        this.wire.request(this.blockIndex, _offset, _length, (_err, _chunk) => {
            if (_err) {
                return console.error('ERROR! Request for chunk failed:', _err.message)
            }

            /* Retrieve the data from the chunk. */
            const data = Buffer.from(_chunk)

            console.log(`Received chunk #${this.chunkIndex} having ${data.length} bytes`)
            // console.log(data.toString('hex'))

            // piece.reserve()
            piece.set(this.chunkIndex, data)

            // console.log(`BLOCK CHUNK LENGTH ${piece.chunkLength(this.chunkIndex)}`)
            // console.log(`BLOCK CHUNK OFFSET ${piece.chunkOffset(this.chunkIndex)}`)

            /* Increment the chunk counter. */
            this.chunkIndex++

            console.log(`\nHOW MANY (BLOCKS) ARE WE STILL MISSING?? ${piece.missing}\n`)

            /* Calculate the next offset. */
            const nextOffset = (this.chunkIndex * Piece.BLOCK_LENGTH)

            if (this.chunkIndex < this.numBlockChunks) {
                /* Request another block from this peer. */
                this._requestChunk(nextOffset, _length)
            } else if (chunkIndex === this.numBlockChunks) {
                /* Retrieve the complete block buffer. */
                const blockBuffer = piece.flush()
                console.log(`Block #${this.blockIndex} complete length [ ${blockBuffer.length} ]`)

                /* Calculate verification hash. */
                const hash = _utils.calcInfoHash(blockBuffer)
                console.log(`Block #${this.blockIndex} SHA-1 hash [ ${hash} ]`)

                /* Compare expected and actual verification hashes. */
                const matched = Buffer.from(hash, 'hex') === Buffer.from(this.blockHashes[this.blockIndex], 'hex')
                console.log(`Block #${this.blockIndex} verification [ ${matched} ]`);
            }
        })
    }
}

module.exports = Torrent

// /* Retrieve the torrent's files. */
// const files = torrentInfo['files']
//
// /* Initialize file counter. */
// let fileCounter = 0
//
// /* Process the individual files. */
// for (let file of files) {
//     /* Convert file path to (readable) string. */
//     const filepath = Buffer.from(file.path[0], 'hex').toString()
//
//     body += `<br />    #${++fileCounter}: ${filepath} { size: ${file.length} bytes }`
// }
//
// /* Retrieve torrent blocks. */
// const blocks = Buffer.from(torrentInfo['pieces'])
// body += '<br /><hr />'
// body += `<br />    ALL Hash Blocks { length: ${blocks.length} } => ${blocks.toString('hex')}`
//
// /* Calculate the number of hashes/blocks. */
// const numBlocks = blocks.length / BLOCK_HASH_LENGTH
// body += '<br /><hr />'
// body += `<br />    # Total Blocks : ${numBlocks}`
//
// /* Retrieve the block length. */
// const blockLength = parseInt(torrentInfo['piece length'])
// body += '<br /><hr />'
// body += `<br />    Block Length   : ${blockLength} bytes`
//
// const numBlockChunks = parseInt(blockLength / Piece.BLOCK_LENGTH)
// body += '<br /><hr />'
// body += `<br />    # of chunks per block [ ${numBlockChunks} ]`
// body += '<br /><hr />'
//
// /* Process the hash list. */
// for (let i = 0; i < numBlocks; i++) {
//     /* Calculate the hash start. */
//     const start = (i * BLOCK_HASH_LENGTH)
//
//     /* Calculate the hash end. */
//     const end = (i * BLOCK_HASH_LENGTH) + BLOCK_HASH_LENGTH
//
//     /* Retrieve the block's hash. */
//     const buf = blocks.slice(start, end)
//
//     /* Convert buffer to hex. */
//     const hash = Buffer.from(buf).toString('hex')
//     body += `<br />        Hash Block #${i}: ${hash}`
//
//     /* Set block hash. */
//     blockHashes[i] = hash
// }
