#!/usr/bin/env node

const DHT = require('bittorrent-dht')
const EventEmitter = require('events')
const http = require('http')
const ip = require('ip')
const moment = require('moment')
const net = require('net')
const PouchDB = require('pouchdb')
const sockjs = require('sockjs')

/* Initialize local libraries. */
const _constants = require('./libs/_constants')
const Peer0 = require('./libs/peer0')
const Torrent = require('./libs/torrent')
const _utils = require('./libs/_utils')

/* Initialize local handlers. */
const _handleIncomingWsData = require('./handlers/_incomingWsData')

/* Initialize new database cache. */
const cache = new PouchDB('cache')

/* Create ZeroEvent class. */
class ZeroEvent extends EventEmitter {}

/* Initialize new ZeroEvent. */
const zeroEvent = new ZeroEvent()

/* Initialize HTTP (WebSocket) manager. */
let server = null

/* Initialize SockJS (WebSocket) manager. */
let ws = null

/* Initialize DHT manager. */
let dht = null

/* Initialize PEX manager. */
let pex = null

/* Initialize connections manager. */
const connMgr = {}

/* Initialize data id manager. */
const dataIdMgr = []

/* Initialize requests manager. */
const requestMgr = {}

/* Create new torrent manager. */
const torrentMgr = new Torrent(zeroEvent)

/* Initialize global constants. */
const DEBUG = false

/**
 * Handle client socket (connection) errors.
 *
 * NOTE These errors are handled internally by the system
 *      and NOT presented to the client.
 */
const _handleError = (_err) => {
    console.log('Client connection error occured:', _err)
}

/**
 * Add Connection to Manager
 */
const _addConnection = (_conn) => {
    /* Add connection to manager. */
    connMgr[_conn.id] = _conn
}

/**
 * Retrieve Connection from Manager
 */
const _getConnection = (_connId) => {
    return connMgr[_connId]
}

/**
 * Remove Connection from Manager
 */
const _removeConnection = (_connId) => {
    /* Remove this connection entry. */
    delete connMgr[_connId]
}

/**
 * Add Data Id
 */
const _addDataId = (_dataId, _requestId) => {
    /* Set data id. */
    const dataId = _dataId

    /* Set request id. */
    const requestId = _requestId

    /* Set date added. */
    const dateAdded = new Date().toJSON()

    /* Add entry to data id manager. */
    dataIdMgr.push({ dataId, requestId, dateAdded })
}

/**
 * Add Request Details to Manager
 *
 * NOTE Client request details contain:
 *          1. connection id (reference to complete socket)
 *          2. requestId
 *          3. data (full request package)
 */
const _addRequest = (_request) => {
    /* Validate request id. */
    if (!_request || !_request.requestId) {
        throw new Error(`Could not retrieve request id for [ ${JSON.stringify(_request)} ]`)
    }

    /* Set request id. */
    const requestId = _request.requestId

    /* Add request to manager. */
    requestMgr[requestId] = _request
}

/**
 * Retrieve Request Details from Manager
 *
 * NOTE Client request details contain:
 *          1. connection id (reference to complete socket)
 *          2. requestId
 *          3. data (full request package)
 */
const _getRequest = (_requestId) => {
    /* Initialize request. */
    let request = null

    /* Validate request id. */
    if (_requestId && requestMgr[_requestId]) {
        /* Retrieve request from manager. */
        request = requestMgr[_requestId]

        /* Remove request from manager. */
        // FIXME Verify that we do not need to persist this request
        //       after retrieving and returning its details.
        // delete requestMgr[_requestId]
    }

    /* Return the request. */
    return request
}

/**
 * Retrieve Request Id
 */
const _getRequestId = (_dataId) => {
    for (let ids of dataIdMgr) {
        if (ids.dataId === _dataId) {
            /* Return the request id. */
            return ids.requestId
        }
    }

    /* Unknown data id. */
    return null
}

/**
 * Send Message to Client Connection
 *
 * NOTE We verify that our connection state is READY_STATE(1),
 *      before sending messages through.
 */
const _sendMessage = (_conn, _msg) => {
    /* Stringify the message (object). */
    const msg = JSON.stringify(_msg)

    /* Retrieve the ready state. */
    const readyState = _conn['_session']['readyState']

    /* Verify connection state. */
    if (readyState === 1) {
        /* Send message to connected client. */
        _conn.write(msg)
    } else {
        console.error(`Invalid ready state [ ${readyState} ]`, _conn)
    }
}

/**
 * ZeroEvent Listener: Error Handler
 *
 * NOTE These are INTERNAL errors that will be logged and
 *      handled by/within the network, and NOT sent to the client.
 */
zeroEvent.on('error', (_err) => {
    console.error('Oops! ZeroEvent emitter had an error', _err)
})

/**
 * ZeroEvent Listener: Message
 *
 * NOTE These are UNREQUESTED messages originating from ZeroEvent.
 *      e.g. notifications, network alerts, etc.
 */
zeroEvent.on('msg', (_conn, _msg) => {
    // FIXME Query against authorization ids of "connected" clients
    //       for applicable message recipients.

    if (_conn) {
        /* Send message. */
        _sendMessage(_conn, _msg)
    } else {
        /* Send message to ALL active connections. */
        // FIXME How can we BETTER manage message delivery when there
        //       is no explicit connection provided??
        for (let conn in connMgr) {
            /* Send message. */
            _sendMessage(_getConnection(conn), _msg)
        }
    }
})

/**
 * ZeroEvent Listener: Message Response
 *
 * NOTE Includes the REQUEST ID sent from the client.
 */
zeroEvent.on('response', (_requestId, _data) => {
    /* Initialize request id. */
    let requestId = null

    /* Validate request id. */
    if (!_requestId) {
        /* Retrieve data id. */
        const dataId = _data.dataId

        /* Retrieve the request id from data id manager. */
        requestId = _getRequestId(dataId)

        console.log('WE GOT NO REQUEST ID FOR RESPONSE, BUT WE HAVE', requestId, _data)
    } else {
        /* Set request id. */
        requestId = _requestId
    }

    /* Retrieve request. */
    const request = _getRequest(requestId)

    /* Validate request. */
    if (!request) {
        return console.log('ERROR retrieving request', requestId, requestMgr)
    }

    /* Set client's ORIGINAL request id. */
    requestId = requestId.split(':')[1]

    /* Add request id to message. */
    const data = { requestId, ..._data }

    /* Retrieve connection id. */
    const connId = request.connId

    /* Retrieve (complete socket) connection. */
    const conn = _getConnection(connId)

    /* Send message. */
    _sendMessage(conn, data)
})

/**
 * ZeroEvent Listener: Request Zite Config
 */
zeroEvent.on('requestConfig', (_dest) => {
    // TODO Request zite configuration file
})

/**
 * ZeroEvent Listener: Request Zeronet File
 *
 * NOTE We use the 32-bytes (partial 50%) from the SHA-512 hash.
 */
zeroEvent.on('requestFile', (_hash) => {
    // TODO Request zeronet file
})

/**
 * ZeroEvent Listener: Request Zeronet BIG File
 */
zeroEvent.on('requestBigFile', (_hash) => {
    // TODO Request zeronet BIG file
    // NOTE We have NO idea how to do this yet???
})

/**
 * ZeroEvent Listener: Request Torrent Info
 */
zeroEvent.on('requestInfo', (_requestId, _infoHash) => {
    /* Request torrent info. */
    torrentMgr.requestInfo(dht, _requestId, _infoHash)
})

/**
 * ZeroEvent Listener: Request Torrent Block
 */
zeroEvent.on('requestBlock', (_requestId, _dataId) => {
    /* Request torrent block. */
    torrentMgr.requestBlock(_requestId, _dataId)
})

/**
 * Handle client socket (connection) closure.
 */
const _handleClose = () => {
    console.log('Client connection was closed.')

    /* Remove this client from the connection manager. */
    _removeConnection(this.id)
}

/**
 * Initialize WebSocket Server
 *
 * Allow user to connect via a standard web browser
 * (ie Chrome, Firfox, Safari, Edge, Android, iOS, etc)
 * or other socket-compatible device.
 */
const _initWebSocketServer = () => {
    /* Create HTTP server. */
    server = http.createServer()

    /* Initialize error listener. */
    server.on('error', (_err) => {
        console.error('HTTP Web Server fatal error', _err)
    })

    /* Initialize SockJS (fallback) URL. */
    const sockjs_url = './js/sockjs.min.js'

    /* Craate SockJS (WebSocket) server. */
    const ws = sockjs.createServer({ sockjs_url })

    /* Initialize error listener. */
    ws.on('error', (_err) => {
        console.error('WebSockets fatal error', _err)
    })

    /* Install WebSocket server handlers. */
    ws.installHandlers(server)

    /* Initialize startup listener. */
    server.on('listening', () => {
        console.info(
            `0PEN server is listening on [TCP][ ${_constants.LOCALHOST}:${_constants.ZEROPEN_PORT} ] (via Nginx proxy)`)
    })

    /* Handle new client connection. */
    ws.on('connection', (_conn) => {
        /* Add new connection to manager. */
        _addConnection(_conn)

        // TEMP SAMPLE WELCOME MESSAGE FOR NEW USERS
        const welcomeNotif = {
            action: 'NOTIF',
            id: 1337,
            flags: ['ADMIN'],
            heading: 'Londynn Lee',
            description: `Welcome to Zer0net! I'm available to you 24x7 for help and support.`,
            icon: 'https://i.imgur.com/mxle8nF.jpg',
            dateCreated: moment().unix()
        }
        zeroEvent.emit('msg', _conn, welcomeNotif)

        /* Initialize error listener. */
        _conn.on('error', _handleError)

        /* Initialize close listener. */
        _conn.on('close', _handleClose)

        /* Initialize data (message) listener. */
        _conn.on('data', (_data) => {
            /* Initialize data. */
            let data = null

            /* Protect server process from FAILED parsing. */
            try {
                /* Parse the incoming data. */
                data = JSON.parse(_data)
            } catch (_err) {
                return console.log('Error parsing incoming data', _data)
            }

            /* Retrieve connection id. */
            const connId = _conn.id

            /* Retrieve data id. */
            const dataId = data.dataId

            /* Validate connection id. */
            if (!connId) {
                return console.error('Could not retrieve connection id for:', _data)
            }

            /* Set UNIVERSAL request id. */
            // NOTE Client's connection id is prepended to make each
            //      client's request id unique within 0PEN.
            const requestId = `${connId}:${data.requestId}`

            /* Initialize request. */
            const request = { connId, requestId, data }

            /* Add new request to manager. */
            _addRequest(request)

            /* Add new data id to manager. */
            _addDataId(dataId, requestId)

            /* Handle incoming data. */
            _handleIncomingWsData(_conn, zeroEvent, requestId, data)
        })

        /* Retrieve connection headers. */
        const headers = _conn.headers

        if (DEBUG) {
            console.log(`\n${JSON.stringify(headers)}\n\n`)
        }

        /* Retrieve the communication protocol (ie websocket). */
        const protocol = _conn.protocol

        /* Retrieve the "real" ip address. */
        const hostIp = headers['x-real-ip']

        /* Retrieve the host port. */
        const hostPort = _conn.remotePort

        /* Retrieve the user agent. */
        const userAgent = headers['user-agent']

        /* Retrieve the language. */
        const lang = headers['accept-language']

        /* Set address. */
        const address = `${hostIp}:${hostPort}`

        /* Add client profile to conn (for authentication). */
        _conn.profile = { address, protocol, lang, userAgent }
    })

    /* Start listening (for incoming CLIENT connections). */
    // NOTE Localhost proxy via Nginx (providing TLS/SSL).
    server.listen(_constants.ZEROPEN_PORT, _constants.LOCALHOST)
}

/**
 * Initailize Distributed Hash Table (DHT) Server
 */
const _initDhtServer = () => {
    /* Generate new peer id. */
    const peerId = Buffer.from(_utils.getPeerId('US'))

    /* DHT options. */
    const dhtOptions = {
        nodeId: peerId
    }

    /* Create new DHT. */
    dht = new DHT()
    // dht = new DHT(dhtOptions)

    /* Initialize error listener. */
    dht.on('error', (_err) => {
        console.error('DHT fatal error', _err)
    })

    // dht.on('announce', (peer, infoHash) => { ... })
    // Emitted when a peer announces itself in order to be stored in the DHT.

    dht.on('peer', (_peer, _infoHash, _from) => {
        // console.info(
        //     `Found DHT peer [ ${_peer.host}:${_peer.port} ] from [ ${_from.address}:${_from.port} ]`)

        // /* Add DHT peer. */
        // this._addDhtPeer(`${_peer.host}:${_peer.port}`)

        /* Emit peer details for info hash. */
        zeroEvent.emit('addPeer', _peer, _infoHash, _from)
    })

    /* Start listening on UDP for DHT requests. */
    dht.listen(_constants.ZEROPEN_PEX_PORT, () => {
        console.info(
            `DHT server is listening on [UDP][ ${ip.address()}:${_constants.ZEROPEN_PEX_PORT} ]`)
    })

    /* DHT routing table is ready. */
    dht.on('ready', () => {
        console.info('DHT routing table has been initialized.')
    })
}

/**
 * Initailize Peer Exchange (PEX) Server
 */
const _initPexServer = () => {
    /* Create new PEX server. */
    pex = net.createServer()

    /* Initialize error listener. */
    pex.on('error', (_err) => {
        console.error('Oops! PEX server had an error', _err)
    })

    // FIXME TEMPORARY RANDOM CRASH TRACER.
    pex.on('uncaughtException', (err) => {
        console.error('PEX CRASH TRACER', err)
    })

    /* Initialize connection listener. */
    pex.on('connection', (_socket) => {
        // console.info('NEW incoming PEX connection.')

        /* Initialize error listener. */
        // FIXME This is a MAJOR fault in the system. CAN WE IGNORE THIS???
        //       Error: read ECONNRESET
        //       at _errnoException (util.js:992:11)
        //       at TCP.onread (net.js:618:25) code: 'ECONNRESET', errno: 'ECONNRESET', syscall: 'read' }
        _socket.on('error', (_err) => {
            console.error('Oops! PEER SOCKET connection had an error', _err)
        })

        /* Emit socket for new PEX connection. */
        zeroEvent.emit('socket', _socket)
    })

    /* Initialize startup listener. */
    pex.on('listening', () => {
        console.info(
            `PEX server is listening on [TCP][ ${ip.address()}:${_constants.ZEROPEN_PEX_PORT} ]`)
    })

    /* Start listening on TCP (for incoming "peer" connections). */
    pex.listen(_constants.ZEROPEN_PEX_PORT)
}

/* Initialize WebSocket (HTTP) server. */
_initWebSocketServer()

/* Initialize DHT server. */
_initDhtServer()

/* Initialize PEX server. */
_initPexServer()
