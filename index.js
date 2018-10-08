#!/usr/bin/env node

const DHT = require('bittorrent-dht')
const EventEmitter = require('events')
const http = require('http')
const ip = require('ip')
const net = require('net')
const sockjs = require('sockjs')
const PouchDB = require('pouchdb')

/* Initialize local libraries. */
const _constants = require('./libs/_constants')
const _utils = require('./libs/_utils')

/* Initialize local handlers. */
const _handleIncomingWsData = require('./handlers/_incomingWsData')

/* Initialize new database cache. */
const cache = new PouchDB('cache')

/* Initialize global constants. */
const DEBUG = false

/* Create ZeroEmitter class. */
class ZeroEmitter extends EventEmitter {}

/* Initialize new ZeroEmitter. */
const zeroEmitter = new ZeroEmitter()

/* Initialize HTTP (WebSocket) holder. */
let server = null

/* Initialize SockJS (WebSocket) holder. */
let ws = null

/* Initialize PEX holder. */
let pex = null

/* Initialize DHT holder. */
let dht = null

/**
 * Handle socket (connection) errors.
 */
const _handleError = function (_err) {
    console.log('Oops! An error occured:', _err)
}

/**
 * Handle socket (connection) closure.
 */
const _handleClose = function () {
    console.log('Client connection was closed.')

    /* Remove Zer0PEN listeners. */
    this.zeropen.removeAllListeners('error')
    this.zeropen.removeAllListeners('msg')
    this.zeropen.removeAllListeners('response')
}

/**
 * Send Message to Client Connection
 *
 * NOTE We verify that our connection state is READY_STATE(1),
 *      before sending messages through.
 */
const _sendMessage = function (_conn, _msg) {
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
 * Initialize WebSocket Server
 *
 * Allow user to connect via a standard web browser
 * (ie Chrome, Firfox, Safari, Edge, Android, iOS, etc)
 * or other socket-compatible device.
 */
const _initWebSocketServer = () => {
    /* Create HTTP server. */
    server = http.createServer()

    /* Initialize SockJS (fallback) URL. */
    const sockjs_url = './js/sockjs.min.js'

    /* Craate SockJS (WebSocket) server. */
    const ws = sockjs.createServer({ sockjs_url })

    /* Install WebSocket server handlers. */
    ws.installHandlers(server)

    /* Add startup listener. */
    server.on('listening', () => {
        console.info(
            `0PEN server is listening on [TCP][ ${_constants.LOCALHOST}:${_constants.ZEROPEN_PORT} ] (via Nginx proxy)`)
    })

    ws.on('connection', function (_conn) {
        /* Initialize Zer0PEN event emitter. */
        _conn.zeropen = zeroEmitter

        /**
         * Zer0PEN Listener: Error Handler
         *
         * NOTE These are INTERNAL errors that will be logged and
         *      handled by/within the network, and NOT sent to the client.
         */
        _conn.zeropen.on('error', function (_err) {
            console.error('Oops! Zer0PEN event emitter had an error', _err)
        })

        /**
         * Zer0PEN Listener: Message
         *
         * NOTE These are UNREQUESTED messages originating from Zer0PEN.
         *      e.g. notifications, network alerts, etc.
         */
        _conn.zeropen.on('msg', function (_msg) {
            /* Send message. */
            _sendMessage(_conn, msg)
        })

        /**
         * Zer0PEN Listener: Message Response
         *
         * NOTE Includes the REQUEST ID sent from the client.
         */
        _conn.zeropen.on('response', function (_requestId, _msg) {
            /* Set request id. */
            const requestId = _requestId

            /* Add request id to the message. */
            _msg = { requestId, ..._msg }

            /* Send message. */
            _sendMessage(_conn, _msg)
        })

        /* Initialize error listener. */
        _conn.on('error', _handleError)

        /* Initialize close listener. */
        _conn.on('close', _handleClose)

        /* Initialize data (message) listener. */
        _conn.on('data', (_msg) => {
            _handleIncomingWsData(_conn, pex, _msg)
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

        /* Add source to conn (for authentication). */
        _conn.source = `${hostIp}:${hostPort}`

        if (DEBUG) {
            console.info(`
Protocol: ${protocol}
Source: ${hostIp}:${hostPort}
Language: ${lang}
User Agent: ${userAgent}
            `)
        }
    })

    /* Start listening (for incoming CLIENT connections). */
    server.listen(_constants.ZEROPEN_PORT, _constants.LOCALHOST)
}

/**
 * Initailize Peer Exchange (PEX) Server
 */
const _initPexServer = () => {
    /* Create new PEX server. */
    pex = net.createServer()

    /* Initialize Zer0PEN event emitter. */
    pex.zeropen = zeroEmitter

    /* Add error listener. */
    pex.on('error', function (_err) {
        console.error('Oops! PEX server had an error', _err)
    })

    /* Add connection listener. */
    pex.on('connection', function (_socket) {
        console.info('NEW incoming PEX connection.')

        /* Emit socket for new PEX connection. */
        pex.zeropen.emit('socket', _socket)
    })

    /* Add startup listener. */
    pex.on('listening', () => {
        console.info(
            `PEX server is listening on [TCP][ ${ip.address()}:${_constants.ZEROPEN_PEX_PORT} ]`)
    })

    /* Start listening on TCP (for incoming "peer" connections). */
    pex.listen(_constants.ZEROPEN_PEX_PORT)
}

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

    /* Initialize Zer0PEN event emitter. */
    dht.zeropen = zeroEmitter

    dht.on('error', (_err) => {
        console.error('DHT fatal error', _err)
    })

    // dht.on('announce', function (peer, infoHash) { ... })
    // Emitted when a peer announces itself in order to be stored in the DHT.

    dht.on('peer', (_peer, _infoHash, _from) => {
        console.info(
            `Found DHT peer [ ${_peer.host}:${_peer.port} ] from [ ${_from.address}:${_from.port} ]`)

        /* Emit peer details for info hash. */
        pex.zeropen.emit('addPeer', _peer, _infoHash, _from)
    })

    /* Start listening on UDP for DHT requests. */
    dht.listen(_constants.ZEROPEN_PEX_PORT, () => {
        console.info(`DHT server is listening on [UDP][ ${ip.address()}:${_constants.ZEROPEN_PEX_PORT} ]`)
    })

    /* DHT routing table is ready. */
    dht.on('ready', () => {
        console.info('DHT routing table has been initialized.')
    })
}

/* Initialize WebSocket (HTTP) server. */
_initWebSocketServer()

/* Initialize PEX server. */
_initPexServer()

/* Initialize DHT server. */
_initDhtServer()
