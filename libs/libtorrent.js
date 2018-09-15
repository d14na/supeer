// http://162.208.10.179:10443/magnet/?xt=urn:btih:01c227c8c9aac311f9365b163ea94708c27a7db4&dn=The+Subtle+Art+of+Not+Giving+a+Fck+%282016%29+%28Epub%29+Gooner&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Fzer0day.ch%3A1337&tr=udp%3A%2F%2Fopen.demonii.com%3A1337&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Fexodus.desync.com%3A6969
const Bitfield = require('bitfield')
const DHT = require('bittorrent-dht')
const Piece = require('torrent-piece')
const Protocol = require('bittorrent-protocol')

const bencode = require('bencode')
const crypto = require('crypto')
const net = require('net')
const ut_metadata = require('ut_metadata')

/* Initialize constants. */
const BT_0NET_PORT = 6889
const PIECE_HASH_LENGTH = 20

/* Initialize session holders. */
let haveMetadata = false
let haveDataSource = false

/* Initialize piece holders. */
Piece.BLOCK_LENGTH // 16384
console.log('PIECE_BLOCK_LENGTH', Piece.BLOCK_LENGTH);
let piece = null
let pieceLength = 0
let subPieceIndex = 0
let subPiecesInBlock = 0

/**
 * Get Peer Id
 *
 * Generates a new peer id with the following format:
 *     1. Standard 0NET prefix
 *     2. Country Code
 *     3. Random string
 */
const _getPeerId = function (_countryCode) {
    const prefix = '0PEN'
    const rndStringLen = 12
    const charset = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

    let rndString = ''

    for (let i = 0; i < rndStringLen; i++) {
        rndString += charset[Math.floor(Math.random() * charset.length)]
    }

    return `${prefix}-${_countryCode}-${rndString}`
}

/* Initialize a new peer id. */
const peerId = Buffer.from(_getPeerId('US'))

const infoHash = Buffer.from('01c227c8c9aac311f9365b163ea94708c27a7db4', 'hex')
// console.log('Peer Id/InfoHash', peerId, infoHash)

const _calcHash = function (_wholePiece) {
    /* Compute the SHA-1 hash of the completed piece. */
    return crypto.createHash('sha1').update(_wholePiece).digest('hex')
}

const _handleMetadata = function (metadata) {
    /* Immediately set the flag to stop requesting metadata. */
    haveMetadata = true

    // console.log('GOT METADATA',
    //     metadata, Buffer.from(metadata, 'hex').toString())

    /* Convert the metadata to a buffer. */
    const data = Buffer.from(metadata, 'hex')

    /* Decode the metadata buffer using bencode. */
    const decoded = bencode.decode(data)
    // console.log('DECODED (RAW)', typeof decoded, decoded)

    /* Retrieve the torrent info. */
    const torrent = decoded['info']

    // console.log('Torrent Metadata', JSON.stringify(torrent))

    /* Convert name to (readable) string. */
    const torrentName = Buffer.from(torrent['name'], 'hex').toString()
    console.info(
        `\n_________________________________________________________________
        \n    ${torrentName}\n`)

    /* Retrieve the torrent's files. */
    const files = torrent['files']

    let fileCounter = 0

    /* Process the individual files. */
    for (let file of files) {
        /* Convert file path to (readable) string. */
        const filepath = Buffer.from(file.path[0], 'hex').toString()

        console.info(`    #${++fileCounter}: ${filepath} { size: ${file.length} bytes }`)
    }

    /* Retrieve torrent pieces. */
    const pieces = Buffer.from(torrent['pieces'])
    console.info(
        `\n    ALL Hash Pieces { length: ${pieces.length} } => ${pieces.toString('hex')}`)

    /* Calculate the number of hashes/pieces. */
    const numPieces = pieces.length / PIECE_HASH_LENGTH
    console.info(`\n    # Total Pieces : ${numPieces}`)

    /* Retrieve the piece length. */
    pieceLength = parseInt(torrent['piece length'])
    console.info(`    Piece Length   : ${pieceLength} bytes\n`)


subPiecesInBlock = parseInt(pieceLength / Piece.BLOCK_LENGTH)
console.log(`SUB PIECES IN BLOCK [ ${subPiecesInBlock} ]`)
piece = new Piece(pieceLength)
console.log(`HOW MUCH (PIECE) ARE WE MISSING?? ${piece.missing}\n`)


    /* Process the hash list. */
    for (let i = 0; i < numPieces; i++) {
        /* Calculate the hash start. */
        const start = (i * PIECE_HASH_LENGTH)

        /* Calculate the hash end. */
        const end = (i * PIECE_HASH_LENGTH) + PIECE_HASH_LENGTH

        /* Retrieve the piece's hash. */
        const buf = pieces.slice(start, end)

        /* Convert buffer to hex. */
        const hash = Buffer.from(buf).toString('hex')

        console.info(`        Hash Piece #${i}: ${hash}`)
    }

    // empty spacing
    console.info(
        `\n_________________________________________________________________\n\n`)

    // Note: the event will not fire if the peer does not support ut_metadata, if they
    // don't have metadata yet either, if they repeatedly send invalid data, or if they
    // simply don't respond.
}

const _requestSubPiece = function (_wire, _pieceIndex, _subPieceIndex, _offset, _length) {
    /* Confirm that we are NOT being choked by this peer. */
    if (_wire.peerChoking) {
        return console.log('\n\n***OH NO! WE THOUGHT WE HAD SOMETHING SPECIAL WITH THIS ONE')
    } else {
        /* TEMPORARY FOR TESTING ONLY: SET THE HAVE DATA SOURCE FLAG. */
        haveDataSource = true
    }

    console.log(`Now requesting piece #${_pieceIndex} at ${_offset} for ${_length} bytes\n`)
    _wire.request(_pieceIndex, _offset, _length, (err, _block) => {
        if (err) {
            return console.log('HAVE REQUEST ERROR', err.message)
        }

        /* Retrieve the data from the block. */
        const data = Buffer.from(_block)

        console.log(`\n\n\n***HAVE REQUESTED SUB-PIECE #${subPieceIndex}`, data.length)
        console.log(data.toString('hex'))

        piece.reserve()
        piece.set(_subPieceIndex, data)

        console.log(`PIECE CHUNK LENGTH ${piece.chunkLength(subPieceIndex)}`)
        console.log(`PIECE CHUNK OFFSET ${piece.chunkOffset(subPieceIndex)}`)

        /* Increment the sub-piece counter. */
        subPieceIndex++

        console.log(`\nHOW MUCH (PIECE) ARE WE STILL MISSING?? ${piece.missing}\n`)

        /* Calculate the next offset. */
        const nextOffset = (subPieceIndex * Piece.BLOCK_LENGTH)

        if (subPieceIndex < 4) {
            /* Request another piece from this peer. */
            _requestSubPiece(_wire, _pieceIndex, subPieceIndex, nextOffset, _length)
        } else if (subPieceIndex == 4) {
            const pieceBuffer = piece.flush()
            console.log(`TOTAL LENGTH ${pieceBuffer.length}`)

            const hash = _calcHash(pieceBuffer)
            console.log('\n\n***SHA-1 HASH', hash)
        }
    })

}


/******************************************************************************/


net.createServer(socket => {
    // console.info('NEW incoming peer connection!')

    /* Initialize the wire protocol. */
    const wire = new Protocol()

    // pipe to and from the protocol
    socket.pipe(wire).pipe(socket)

    /* Request metadata, if needed. */
    if (!haveMetadata) {
        // initialize the extension
        wire.use(ut_metadata())

        // ask the peer to send us metadata
        wire.ut_metadata.fetch()

        // 'metadata' event will fire when the metadata arrives and is verified to be correct!
        wire.ut_metadata.on('metadata', _handleMetadata)

        // optionally, listen to the 'warning' event if you want to know that metadata is
        // probably not going to arrive for one of the above reasons.
        wire.ut_metadata.on('warning', err => {
            console.log('METADATA WARNING', err.message)
        })
    }

    /* Handshake. */
    wire.on('handshake', (_infoHash, _peerId, _extensions) => {
        console.info(`Handshake from ${_peerId}`)
// console.log('HANDSHAKE EXTENSIONS', _extensions)

        /* Send the peer our handshake as well. */
        wire.handshake(infoHash, peerId, { dht: true })
    })

    wire.on('bitfield', bitfield => {
        // console.log('BITFIELD', bitfield)

        const field = new Bitfield(bitfield.buffer)
        // console.log('BITFILED BUFFER', field.buffer)
    })

    wire.on('have', pieceIndex => {
        // console.log('HAVE', pieceIndex, wire.peerInterested, wire.amInterested)

        if (wire.peerPieces.get(0)) {
            // console.log('HAVE THE FIRST PIECE? ', wire.peerPieces.get(0));
            // wire.have(0)
        }
    })

    wire.on('request', (pieceIndex, offset, length, callback) => {
        console.log('OH NO! PEERS HAS REQUESTED PIECE', pieceIndex)
        // ... read block ...
        // callback(null, block) // respond back to the peer
        callback(null)
    })

    wire.on('interested', () => {
        console.log('peer is now interested');
    })

    wire.on('uninterested', () => {
        console.log('peer is no longer interested');
    })

    wire.on('port', dhtPort => {
        // peer has sent a port to us
        // console.log('DHT PORT', dhtPort)
    })

    wire.on('keep-alive', () => {
        console.log('KEEP ALIVE')
        // peer sent a keep alive - just ignore it
    })

    wire.on('choke', () => {
        console.log('NOW BEING CHOKED! ' + wire.peerChoking);
        // the peer is now choking us
    })

    wire.on('unchoke', () => {
        if (haveDataSource) {
            return '\n\nOH THANKS! BE WE GOT THAT COVERED ALREADY!'
        }

        console.log('\n\n*** PEER is no longer choking us: ' + wire.peerChoking)

        /* Set piece index. */
        const pieceIndex = 0

        if (wire.peerPieces.get(pieceIndex)) {
            console.log('AND THEY HAVE THE PIECE THAT WE NEED!')
        } else {
            console.log('OH NO! THEY DONT HAVE THE PIECE WE NEED')
        }

        if (subPieceIndex < subPiecesInBlock) {
            const offset = (subPieceIndex * Piece.BLOCK_LENGTH)
            const length = Piece.BLOCK_LENGTH

            /* Request a new sub-piece. */
            _requestSubPiece(wire, pieceIndex, subPieceIndex, offset, length)
        }
    })
}).listen(BT_0NET_PORT)


/******************************************************************************/


const dht = new DHT()

dht.listen(BT_0NET_PORT, function () {
    console.log(`DHT listening on port ${BT_0NET_PORT}`)
})

dht.announce(infoHash, BT_0NET_PORT, function (err) {
    if (err) {
        console.log('DHT announcement errors', err)
    }
})

dht.on('peer', function (peer, infoHash, from) {
    // console.log('found potential peer ' + peer.host + ':' + peer.port + ' through ' + from.address + ':' + from.port)
})

dht.lookup(infoHash)
