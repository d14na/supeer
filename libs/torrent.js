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
        this._getNextRequest = this._getNextRequest.bind(this)
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
        // const dataId = _dataId

        /* Set request manager. */
        // TEMP FOR TESTING PURPOSES ONLY
        // const requestMgr = this._requestMgr

        /* Build (data) info. */
        // const data = { dataId, requestMgr }

        /* Emit message. */
        // TEMP FOR TESTING PURPOSES ONLY
        // this.zeroEvent.emit('msg', null, data)
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
     * Get Next Request from Manager
     */
    _getNextRequest(_infoHash) {
        console.log('SEARCHING FOR NEXT REQUEST', _infoHash)
        /* Retrieve torrent info. */
        const torrentInfo = this._getInfoByHash(_infoHash)

        /* Validate torrent info. */
        if (!torrentInfo) {
            return console.error(`Could NOT retrieve torrent info for [ ${_infoHash} ]`)
        }

        // console.log('TORRENT FILES', typeof torrentInfo['files'], torrentInfo['files'])
        /* Calculate total torrent size. */
        const torrentSize = torrentInfo['files'].reduce((_acc, _cur) => {
            // console.log('REDUCE', _acc, typeof _cur, _cur, _cur.length)
            return (_acc + _cur.length)
        }, 0)
        console.log('CALCULATED TORRENT SIZE', torrentSize)

        /* Retrieve torrent blocks. */
        const blocks = Buffer.from(torrentInfo['pieces'])

        /* Calculate the number of hashes/blocks. */
        const numBlocks = blocks.length / _constants.BLOCK_HASH_LENGTH
        console.log('NEXT REQUEST: TOTAL BLOCKS IN TORRENT', numBlocks)

        /* Initialize data id. */
        let dataId = null

        /* Initialize request. */
        let request = null

        /* Initialize number of chunks. */
        let numChunks = 0

        /* Initialize number of "completed" chunks. */
        let numCompletedChunks = 0

        /* Initialize next block length. */
        let nextBlockLength = 0

        for (let nextBlockIndex = 0; nextBlockIndex < numBlocks; nextBlockIndex++) {
            /* Set data id. */
            dataId = `${_infoHash}:${nextBlockIndex}`

            /* Retrieve request. */
            request = this._getRequestById(dataId)

            /* Validate request. */
            if (!request) {
                // NOTE There is NO request for this data id.
                continue
            }

            /* Retrieve number of chunks. */
            numChunks = request['numChunks']

            /* Retrieve total # of completed chunks. */
            numCompletedChunks = Object.keys(request['chunks']).length

            console.info(
                `Found [ ${numCompletedChunks} of ${numChunks} ] in request [ ${dataId} ]`)

            /* Validate uncompleted request. */
            if (numCompletedChunks < numChunks) {
                /* Retrieve piece length. */
                const pieceLength = parseInt(torrentInfo['piece length'])

                /* Calculate next block length. */
                if (nextBlockIndex + 1 === numBlocks) {
                    // NOTE This is the ENDGAME (last torrent block).
                    console.info('WE ARE IN THE ENDGAME NOW')

                    nextBlockLength = torrentSize - ((numBlocks - 1) * pieceLength)
                } else {
                    nextBlockLength = pieceLength
                }

                /* Return next block index & length. */
                return { nextBlockIndex, nextBlockLength }
            }
        }

        /* There are NO uncompleted requests pending. */
        return null
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
     *
     * NOTE Metadata is received bencoded.
     *      https://en.wikipedia.org/wiki/Bencode
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

        /* Encode torrent info. */
        const encoded = bencode.encode(torrentInfo)
        // console.log('Encoded torrent info', encoded)

        /* Calculate verification hash (from encoded metadata). */
        const verificationHash = _utils.calcInfoHash(encoded)
        console.info(`Calculated the verification hash [ ${verificationHash} ]`)

        /* Set info hash. */
        const infoHash = Buffer.from(_infoHash).toString('hex')

        /* Validate verficiation hash. */
        if (verificationHash === infoHash) {
            /* Add torrent metadata to manager. */
            this._addInfo(infoHash, torrentInfo)

            /* Set data id. */
            const dataId = `${infoHash}:torrent`

            /* Set metadata. */
            const metadata = _metadata

            /* Set success flag. */
            const success = true

            /* Build (data) info. */
            const data = { dataId, infoHash, metadata, success }

            /* Emit message. */
            this.zeroEvent.emit('response', null, data)
        } else {
            console.error(`Oops! This metadata DOES NOT validate to [ ${infoHash} ]`)
        }
    }

    /**
     * Request Block Chunk
     */
    _requestChunk(_dataId, _wire, _blockIndex, _nextBlockLength, _chunkIndex) {
        /* Initialize ENDGAME flag. */
        let endgame = false

        /* Confirm that we are NOT being choked by this peer. */
        if (_wire.peerChoking) {
            return console.error('\n***Oh NOOO! What happened? Why are they CHOKING?? I thought we were good!\n')
        }

        /* Calculate offset. */
        const offset = (_chunkIndex * _constants.CHUNK_LENGTH)

        /* Initialize length. */
        let length = null

        /* Calculate length. */
        if (((_chunkIndex + 1) * _constants.CHUNK_LENGTH) > _nextBlockLength) {
            /* Set ENDGAME flag. */
            endgame = true

            // NOTE Calculate ENDGAME length of last chunk
            length = _nextBlockLength - (_chunkIndex * _constants.CHUNK_LENGTH)
        } else {
            length = _constants.CHUNK_LENGTH
        }
        console.log('CALCULATE REQUEST LENGTH:', length)

        console.info(
            `Requesting chunk [ ${_blockIndex}, ${_chunkIndex} ] [ ${offset}, ${length} ]`)

        _wire.request(_blockIndex, offset, length, (_err, _chunk) => {
            if (_err) {
                return console.error('ERROR! Request for chunk failed:', _err.message)
            }

            console.info(`Received ${_chunk.length} bytes of chunk [ ${_blockIndex}, ${_chunkIndex} ]`)
            console.log(_chunk.slice(0, 50).toString('hex'), '\n')

            /* Add chunk to manager. */
            this._addChunk(_dataId, _chunkIndex, _chunk)

            /* Increment chunk index. */
            _chunkIndex++

            /* Set request info. */
            const requestInfo = this._requestMgr[_dataId]

            /* Set number of chunks in block. */
            const numChunks = requestInfo['numChunks']

            /* Validate current chunk index. */
            if (!endgame && _chunkIndex < numChunks) {
                /* Request another block from this peer. */
                this._requestChunk(_dataId, _wire, _blockIndex, _nextBlockLength, _chunkIndex)
            } else if (endgame || _chunkIndex === numChunks) {
                /* Initialize block array. */
                let blockArray = []

                /* Initialize number of completed chunks. */
                const numCompletedChunks = Object.keys(requestInfo['chunks']).length

                for (let i = 0; i < numCompletedChunks; i++) {
                    /* Retrieve chunk from request. */
                    const chunk = requestInfo['chunks'][i]

                    /* Validate chunk. */
                    if (chunk) {
                        /* Add (buffer) chunk to array. */
                        blockArray.push(Buffer.from(chunk))
                    }
                }

                /* Concatenate all block chunks. */
                const blockBuffer = Buffer.concat(blockArray)
                console.log('BLOCK BUFFER', blockBuffer.length)

                /* Calculate verification hash. */
                const hash = _utils.calcInfoHash(blockBuffer)
                console.log(`Block #${_blockIndex} SHA-1 hash [ ${hash} ]`)

                /* Compare expected and actual verification hashes. */
                // const matched = Buffer.from(hash, 'hex') === Buffer.from(this.blockHashes[this.blockIndex], 'hex')
                // console.log(`Block #${_blockIndex} verification [ ${matched} ]`);

                /* Set success flag. */
                const success = true

                /* Set data id. */
                const dataId = _dataId

                /* Build (data) info. */
                const data = { dataId, blockBuffer, hash, success }

                /* Emit message. */
                this.zeroEvent.emit('response', null, data)
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
                // console.info('WARNING issued for Metadata extension', _err)
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

                // console.info(`Handshake from ${_peerId}`)
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
                /* Retrieve wire id (from manager). */
                const wireId = this._getWireId(wire)

                console.info(`[ ${wireId} ] has UN-CHOKED [ ${!wire.peerChoking} ]`)

                /* Retrieve the next uncompleted request. */
                const nextBlockRequest = this._getNextRequest(Buffer.from(infoHash).toString('hex'))

                if (!nextBlockRequest) {
                    return console.error(
                        `There are NO requests for [ ${Buffer.from(infoHash).toString('hex')} ]`)
                }

                console.log('NEXT BLOCK REQUEST:', nextBlockRequest)

                const nextBlockIndex = nextBlockRequest['nextBlockIndex']
                const nextBlockLength = nextBlockRequest['nextBlockLength']

                /* Set data id. */
                const dataId = `${Buffer.from(infoHash).toString('hex')}:${nextBlockIndex}`

                // TEMP FOR TESTING PURPOSES ONLY
                // this.requestBlock(null, dataId)

                /* Initialize "starting" chunk index. */
                const chunkIndex = 0

                /* Request a new chunk. */
                this._requestChunk(dataId, wire, nextBlockIndex, nextBlockLength, chunkIndex)
            })
        })
    }

    /**
     * Request Block Index
     *
     * NOTE Data Id is {Info hash}:{Block Index}
     */
    requestBlock(_requestId, _dataId) {
        /* Validate data id. */
        if (!_dataId || _dataId.indexOf(':') === -1) {
            return console.error(`Could NOT verify request for [ ${_dataId} ]`)
        }

        /* Validate request. */
        if (!this._getRequestById(_dataId)) {
            /* Set info hash. */
            const infoHash = _dataId.split(':')[0]

            /* Set block index. */
            const blockIndex = _dataId.split(':')[1]

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
            this._requestMgr[_dataId] = {
                numChunks,
                chunks: {},
                dataAdded:  new Date().toJSON(),
                lastUpdate: new Date().toJSON()
            }

            /* Retrieve total # of requests. */
            const numRequests = Object.keys(this._requestMgr).length

            console.info(`Added new BLOCK request [ ${_dataId} ] of ${numRequests}`)
        }

        /* Set data id. */
        const dataId = _dataId

        /* Set request manager. */
        const requestMgr = this._requestMgr[dataId]

        /* Set success flag. */
        const success = true

        /* Build (data) info. */
        const data = { dataId, requestMgr, success }

        /* Emit message. */
        this.zeroEvent.emit('response', _requestId, data)
    }
}

module.exports = Torrent
