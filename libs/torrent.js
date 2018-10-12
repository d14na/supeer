const bencode = require('bencode')
const Bitfield = require('bitfield')
const Protocol = require('bittorrent-protocol')
const ut_metadata = require('ut_metadata')

/* Initialize local library. */
const _constants = require('./_constants')
const _utils = require('./_utils')
const DEBUG = false


/**
 * Class: Torrent (BitTorrent)
 */
class Torrent {
    constructor(_zeroEvent) {
        /* Initialize ZeroEvent manager. */
        this._zeroEvent = _zeroEvent

        /* Generate a new (session) peer id. */
        this._peerId = _utils.getPeerId('US')
        console.info(`Torrent Manager generated new Peer Id [ ${this._peerId} ]`)

        /* Bind public methods. */
        this.requestBlock = this.requestBlock.bind(this)
        this.requestInfo = this.requestInfo.bind(this)

        /* Bind private methods. */
        this._addChunk = this._addChunk.bind(this)
        this._addInfo = this._addInfo.bind(this)
        this._addWire = this._addWire.bind(this)
        this._getInfoByHash = this._getInfoByHash.bind(this)
        this._getRequestById = this._getRequestById.bind(this)
        this._getWireId = this._getWireId.bind(this)
        this._getWireById = this._getWireById.bind(this)
        this._getWiresByInfoHash = this._getWiresByInfoHash.bind(this)
        this._handleMetadata = this._handleMetadata.bind(this)
        this._needMetadata = this._needMetadata.bind(this)
        this._requestChunk = this._requestChunk.bind(this)

        /* Initialize (object) managers. */
        this._infoMgr = {}
        this._requestMgr = {}
        this._wireMgr = {}
    }

    get zeroEvent() {
        return this._zeroEvent
    }

    get peerId() {
        return this._peerId
    }

    get wires() {
        return this._wireMgr
    }

    /**
     * Add Chunk to Request Manager
     */
    _addChunk(_dataId, _chunkIndex, _chunk) {
        /* Validate chunk. */
        if (!_chunk) {
            return console.log(`Could NOT retrieve chunk [ ${dataId} ] [ ${_chunkIndex} ]`)
        }

        /* Validate request. */
        if (!this._requestMgr[_dataId]) {
            return console.log(`Could NOT retrieve request for [ ${dataId} ]`)
        }

        /* Update request manager. */
        this._requestMgr[_dataId]['chunks'][_chunkIndex] = _chunk
        this._requestMgr[_dataId]['lastUpdate'] = new Date().toJSON()

        /* Set data id. */
        const dataId = _dataId

        /* Set request manager. */
        // TEMP FOR TESTING PURPOSES ONLY
        const requestMgr = this._requestMgr

        /* Build (data) info. */
        const data = { dataId, requestMgr }

        /* Emit message. */
        // TEMP FOR TESTING PURPOSES ONLY
        this.zeroEvent.emit('msg', null, data)
    }

    /**
     * Add Torrent Info to Information Manager
     */
    _addInfo(_infoHash, _torrentInfo) {
        console.log('ADDING metadata to manager.')

        /* Validate the info. */
        if (!_infoHash || !_torrentInfo) {
            throw new Error(
                'Looks like we have a problem adding METADATA', _infoHash, _torrentInfo)
        }

        if (!this._getInfoByHash(_infoHash)) {
            /* Add new info. */
            this._infoMgr[_infoHash] = _torrentInfo

            console.info(`ADDED new info for [ ${_infoHash} ]`)
        }
    }

    /**
     * Add Wire
     *
     * Called after a successful handshake.
     *
     * NOTE Wire Id is the same as Peer Id.
     *      - peerId       : 2d5554333533532dcead15ab366f53c9235e00ad
     *      - peerIdBuffer : <Buffer 2d 55 54 33 35 33 53 2d ce ad 15 ab 36 6f 53 c9 23 5e 00 ad>
     */
    _addWire(_wire, _wireId, _infoHash, _extensions) {
        /* Validate the wire. */
        if (!_wire || !_wire.wireId) {
            throw new Error(
                'Looks like we have a problem adding TRACEABLE wires', _wire)
        }

        if (!this._getWireById(_wireId)) {
            /* Add new wire. */
            this._wireMgr[_wireId] = {
                infoHash: _infoHash,
                extensions: _extensions,
                // currentBlockIndex: 0,
                // currentChunkIndex: 0,
                dataAdded:  new Date().toJSON(),
                lastUpdate: new Date().toJSON()
            }

            /* Retrieve total # of wires. */
            const numWires = Object.keys(this._wireMgr).length

            console.info(`Added new wire [ ${_wireId} ] of ${numWires}`)
        }
    }

    /**
     * Retrieve Info by Hash
     */
    _getInfoByHash(_infoHash) {
        return this._infoMgr[_infoHash]
    }

    /**
     * Retrieve Request by Id
     *
     * NOTE Data Id is {Info hash}:{Block Index}
     */
    _getRequestById(_dataId) {
        return this._requestMgr[_dataId]
    }

    /**
     * Retrieve Wire Id
     *
     * NOTE `_wireId` is added during handshake.
     */
    _getWireId(_wire) {
        if (_wire && _wire.wireId) {
            return _wire.wireId
        } else {
            // console.error('ERROR retrieving Wire Id from:', _wire)
            return null
        }
    }

    /**
     * Retrieve Wire by Id
     *
     * NOTE Wire Id is the same as Peer Id.
     */
    _getWireById(_wireId) {
        return this._wireMgr[_wireId]
    }

    /**
     * Retrieve List of Wires by Info Hash
     */
    _getWiresByInfoHash(_infoHash) {
        /* Initialize wire list. */
        let wires = []

        /* Search for wires. */
        for (let wire in this._wireMgr) {
            if (wire.infoHash === _infoHash) {
                wires.push(wire)
            }
        }

        /* Return wires. */
        return wires
    }

    /**
     * Verify Metadata Is Needed
     */
    _needMetadata(_infoHash) {
        if (this._getInfoByHash(_infoHash)) {
            return false
        } else {
            return true
        }
    }

    /**
     * Handle Metadata
     */
    _handleMetadata(_infoHash, _metadata) {
        // console.log('GOT METADATA',
        //     metadata, Buffer.from(metadata, 'hex').toString())

        /* Convert the metadata to a buffer. */
        const metadata = Buffer.from(_metadata, 'hex')

        /* Decode the metadata buffer using bencode. */
        const decoded = bencode.decode(metadata)
        // console.log('DECODED (RAW)', typeof decoded, decoded)

        /* Retrieve the torrent info. */
        const torrentInfo = decoded['info']
        // console.log('Torrent INFO', torrentInfo)

        /* Set info hash. */
        const infoHash = Buffer.from(_infoHash).toString('hex')

        /* Set success flag. */
        const success = true

        /* Set data id. */
        const dataId = `${infoHash}:torrent`

        /* Build (data) info. */
        const data = { dataId, infoHash, torrentInfo, success }

        /* Add torrent metadata to manager. */
        this._addInfo(infoHash, torrentInfo)

        /* Emit message. */
        this.zeroEvent.emit('response', null, data)
    }

    /**
     * Request Block Chunk
     */
    _requestChunk(_dataId, _wire, _blockIndex, _chunkIndex) {
        /* Confirm that we are NOT being choked by this peer. */
        if (_wire.peerChoking) {
            return console.error('\n***Oh NOOO! What happened? Why are they CHOKING?? I thought we were good!\n')
        }

        // console.info(`\nFINALIZING request for block #${_blockIndex} at ${_offset} for ${_length} bytes\n`)

        const length = _constants.CHUNK_LENGTH // 16384
        const offset = (_chunkIndex * length)

        console.info(
            `Requesting chunk [ ${_blockIndex}, ${_chunkIndex} ] [ ${offset}, ${length} ]`)

        _wire.request(_blockIndex, offset, length, (_err, _chunk) => {
            if (_err) {
                return console.error('ERROR! Request for chunk failed:', _err.message)
            }

            /* Retrieve the data from the chunk. */
            // const data = Buffer.from(_chunk)

            console.info(`Received ${_chunk.length} bytes of chunk [ ${_blockIndex}, ${_chunkIndex} ]`)
            console.log(_chunk.slice(0, 50).toString('hex'), '\n')

            /* Add chunk to manager. */
            this._addChunk(_dataId, _chunkIndex, _chunk)

            /* Increment chunk index. */
            _chunkIndex++

            // return // FIXME Create a CUSTOM chunks manager.

            /* Set request info. */
            const requestInfo = this._requestMgr[dataId]

            /* Set number of chunks in block. */
            const numChunks = requestInfo['numChunks']

            // this._requestMgr[dataId] = {
            //     numChunks,
            //     chunks: {},
            //     chunkIndex: 0,
            //     dataAdded:  new Date().toJSON(),
            //     lastUpdate: new Date().toJSON()
            // }

            /* Validate current chunk index. */
            if (_chunkIndex < numChunks) {
                /* Request another block from this peer. */
                this._requestChunk(_dataId, _wire, _blockIndex, _chunkIndex)
            } else if (_chunkIndex === numChunks) {
                /* Set success flag. */
                const success = true

                /* Set data id. */
                const dataId = _dataId

                /* Build (data) info. */
                const data = { dataId, requestInfo, success }

                /* Emit message. */
                // this.zeroEvent.emit('response', null, data)

                // TEMP DEBUGGING PURPOSES ONLY
                const buf0 = Buffer.from(requestInfo['chunks'][0])
                const buf1 = Buffer.from(requestInfo['chunks'][1])
                const buf2 = Buffer.from(requestInfo['chunks'][2])
                const buf3 = Buffer.from(requestInfo['chunks'][3])
                const arr = [buf0, buf1, buf2, buf3]
                const blockBuffer = Buffer.concat(arr)
                console.log('BLOCK BUFFER', blockBuffer.length)

                /* Calculate verification hash. */
                const hash = _utils.calcInfoHash(blockBuffer)
                console.log(`Block #${_blockIndex} SHA-1 hash [ ${hash} ]`)

                // TEMP DEBUGGING PURPOSES ONLY
                const debug = { hash, blockBuffer }
                this.zeroEvent.emit('msg', null, debug)

                /* Compare expected and actual verification hashes. */
                // const matched = Buffer.from(hash, 'hex') === Buffer.from(this.blockHashes[this.blockIndex], 'hex')
                // console.log(`Block #${_blockIndex} verification [ ${matched} ]`);

                throw new Error('STOP HERE!')
            }
        })
    }

    /**
     * Remove Block Request from Manager
     */
    _removeRequest(_dataId) {
        // TODO
    }

    /**
     * Remove Wire from Manager
     */
    _removeWire(_wireId) {
        // TODO
    }

    /**
     * Request Torrent Information
     */
    requestInfo(_dht, _requestId, _infoHash) {
        /* Set DHT. */
        const dht = _dht

        /* Set request id. */
        const requestId = _requestId

        /* Set info hash. */
        const infoHash = _infoHash

        console.info(
            `Now requesting peers for [ ${Buffer.from(infoHash).toString('hex')} ]`)

        /* Request peers with our info hash (from all available nodes). */
        dht.lookup(infoHash, (_err, _nodesFound) => {
            if (_err) {
                return console.error('DHT lookup error', _err)
            }

            console.info(`DHT found [ ${_nodesFound} ] nodes for [ ${Buffer.from(infoHash).toString('hex')} ]`)

            /* Announce that we have peers seeding this info hash. */
            dht.announce(infoHash, _constants.ZEROPEN_PEX_PORT, (_err) => {
                if (_err) {
                    console.error('DHT announcement error', _err)
                }

                console.info(`DHT has publicly announced [ ${Buffer.from(infoHash).toString('hex')} ]`)
            })
        })

        /* Add error listener. */
        this.zeroEvent.on('error', (_err) => {
            console.error('ERROR occured on Zer0PEN (Torrent Manager) handler', _err)
        })

        /* Start listening on new PEX server. */
        this.zeroEvent.on('socket', (_socket) => {
            // console.info('NEW incoming peer connection:', _socket)

            /* Initialize the wire protocol. */
            const wire = new Protocol()

            /* Add error listener. */
            wire.on('error', (_err) => {
                console.error('ERROR occured on Torrent Manager wire', _err)
            })

            // NOTE We are piping to and from the BitTorrent protocol.
            _socket.pipe(wire).pipe(_socket)

            /* Initialize the Metadata extension. */
            wire.use(ut_metadata())

            /* Add error listener. */
            wire.ut_metadata.on('error', (_err) => {
                console.error('ERROR occured on Metadata extension', _err)
            })

            // NOTE optionally, listen to the 'warning' event if you
            //      want to know that metadata is probably not going to
            //      arrive for one of the issued reasons.
            wire.ut_metadata.on('warning', (_err) => {
                console.error('WARNING issued for Metadata extension', _err)
            })

            // NOTE 'metadata' event will fire when the metadata arrives
            //      and is verified to be correct!
            wire.ut_metadata.on('metadata', (_metadata) => {
                this._handleMetadata(infoHash, _metadata)
            })

            /* Handshake. */
            wire.on('handshake', (_infoHash, _peerId, _extensions) => {
                /* Validate peer id. */
                // TODO Create validation method.
                if (!_peerId || _peerId.length !== 40) {
                    console.error(`[ ${_peerId} ] FAILED to validate.`)
                    return
                }

                console.info(`Handshake from ${_peerId}`)
                // console.log('Handshake EXTENSIONS', _extensions)

                /* Add wire id (same as peer id) to wire. */
                wire.wireId = _peerId

                /* Add new peer. */
                this._addWire(wire, _peerId, _infoHash, _extensions)

                /* Request metadata from peer (if needed). */
                if (this._needMetadata(_infoHash)) {
                    console.log(
                        `Requesting METADATA for [ ${_infoHash} ] from [ ${_peerId} ]`)

                    /* Request metadata from peer. */
                    wire.ut_metadata.fetch()
                }

                /* Initialize DHT support flag. */
                const dhtSupport = { dht: true }

                /* Send the peer our handshake as well. */
                wire.handshake(infoHash, this.peerId, dhtSupport)
            })

            /* Bitfield. */
            wire.on('bitfield', _bitfield => {
                // console.log('BITFIELD', _bitfield)

                /* Retrieve bitfield. */
                // NOTE Contains a summary of ALL peer's blocks (pieces).
                const bitfield = new Bitfield(_bitfield.buffer)
                // console.log('Bitfield BUFFER', bitfield.buffer)

                // TODO Utilize bitfield to quickly assess our data requests
            })

            /* Block index NOTIFICATION (by peer). */
            wire.on('have', _blockIndex => {
                // console.info(`HAVE [ ${_blockIndex} ] [ THEM: ${wire.peerInterested} ] [ US: ${wire.amInterested} ]`)

                // if (wire.peerPieces.get(this.blockIndex)) {
                //     /* Announce our interest in this block. */
                //     // console.log(`Announcing our interest in block #${this.blockIndex}`)
                //     // wire.have(this.blockIndex)
                // }
            })

            /* Block index REQUEST (from peer). */
            wire.on('request', (_blockIndex, _offset, _length, _callback) => {
                console.log('OH NO! A peer has requested a block from us:', _blockIndex)

                // ... read chunk ...
                // callback(null, chunk) // respond back to the peer

                // TEMP We have no block data at this time.
                _callback(null)
            })

            wire.on('interested', () => {
                /* Retrieve wire id (from manager). */
                const wireId = this._getWireId(wire)

                console.info(`[ ${wireId} ] is now INTERESTED.`)
            })

            wire.on('uninterested', () => {
                /* Retrieve wire id (from manager). */
                const wireId = this._getWireId(wire)

                console.info(`[ ${wireId} ] is now UN-INTERESTED.`)
            })

            wire.on('port', dhtPort => {
                // peer has sent a port to us
                // console.log('DHT PORT', dhtPort)
            })

            wire.on('keep-alive', () => {
                // NOTE Peer sent a keep alive - just ignore it.

                /* Retrieve wire id (from manager). */
                const wireId = this._getWireId(wire)

                console.info(`[ ${wireId} ] sent KEEP-ALIVE.`)
            })

            wire.on('choke', () => {
                /* Retrieve wire id (from manager). */
                const wireId = this._getWireId(wire)

                console.info(`[ ${wireId} ] is now CHOKING [ ${wire.peerChoking} ]`)
            })

            wire.on('unchoke', () => {
                // FIXME Lookup requested blocks from request manager.
                // TEMP FOR TESTING PURPOSES ONLY
                const blockIndex = 0
                // infoHash
                // _getRequestById

                /* Set data id. */
                const dataId = `${Buffer.from(infoHash).toString('hex')}:${blockIndex}`

                // TEMP FOR TESTING PURPOSES ONLY
                this.requestBlock(null, dataId)
                const chunkIndex = 0

                /* Retrieve wire id (from manager). */
                const wireId = this._getWireId(wire)

                console.info(`[ ${wireId} ] has UN-CHOKED [ ${!wire.peerChoking} ]`)

                if (wire.peerPieces.get(blockIndex)) {
                    console.log('AND THEY HAVE THE BLOCK THAT WE NEED!')
                } else {
                    console.log('OH NO! THEY DONT HAVE THE BLOCK WE NEED')
                }

                /* Request a new chunk. */
                this._requestChunk(dataId, wire, blockIndex, chunkIndex)
            })
        })
    }

    /**
     * Request Block Index
     *
     * NOTE Data Id is {Info hash}:{Block Index}
     */
    requestBlock(_requestId, _dataId) {
        /* Set request id. */
        const requestId = _requestId

        /* Set data id. */
        const dataId = _dataId

        /* Validate data id. */
        if (!dataId || dataId.indexOf(':') === -1) {
            return console.error(`Could NOT verify request for [ ${dataId} ]`)
        }

        /* Validate request. */
        if (!this._getRequestById(dataId)) {
            /* Set info hash. */
            const infoHash = dataId.split(':')[0]

            /* Set block index. */
            const blockIndex = dataId.split(':')[1]

            console.log(`Received a request for block [ ${blockIndex} ] of [ ${infoHash} ]`)

            /* Retrieve torrent info. */
            const info = this._getInfoByHash(infoHash)
            // console.log('TORRENT INFO', info)

            /* Retrieve piece length. */
            const pieceLength = parseInt(info['piece length'])

            /* Calculate number of chunks per block. */
            let numChunks = pieceLength / _constants.CHUNK_LENGTH

            /* Validate number of chunks. */
            if (!numChunks || !Number.isInteger(numChunks)) {
                return console.error(
                    'ERROR retrieving number of chunks from torrent info:', info)
            }

            /* Add new request. */
            this._requestMgr[dataId] = {
                numChunks,
                chunkIndex: 0,
                chunks: {},
                dataAdded:  new Date().toJSON(),
                lastUpdate: new Date().toJSON()
            }

            /* Retrieve total # of requests. */
            const numRequests = Object.keys(this._requestMgr).length

            console.info(`Added new BLOCK request [ ${dataId} ] of ${numRequests}`)
        }

        /* Set success flag. */
        const success = true

        /* Set request info. */
        const requestInfo = this._requestMgr[dataId]

        /* Build (data) info. */
        const data = { dataId, requestInfo, success }

        /* Emit message. */
        this.zeroEvent.emit('response', _requestId, data)
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
