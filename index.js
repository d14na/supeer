#!/usr/bin/env node

const http = require('http')
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

/**
 * Handle socket errors.
 */
const _handleError = function (_err) {
    console.log('Oops! An error occured:', _err)
}

/**
 * Handle socket closure.
 */
const _handleClose = function () {
    console.log('Client connection was closed.')
}

const ws = sockjs.createServer({
    sockjs_url: './js/sockjs.min.js' })

ws.on('connection', function (_conn) {
    /* Initialize data event. */
    _conn.on('data', (_msg) => {
        _handleIncomingWsData(_conn, _msg)
    })

    /* Initialize close event. */
    _conn.on('error', _handleError)

    /* Initialize close event. */
    _conn.on('close', _handleClose)

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

/**
 * Initialize WebSocket Server
 *
 * Allow user to connect via a standard web browser
 * (ie Chrome, Firfox, Safari, Edge, Android, iOS, etc)
 * or other socket-compatible device.
 */
const _initWebSocketServer = () => {
    /* Install WebSocket server handlers. */
    ws.installHandlers(wsServer)

    /* Add startup listener. */
    wsServer.on('listening', () => {
        console.info(`WebSocket is listening on [ ${_constants.LOCALHOST}:${_constants.ZEROPEN_PORT} ]`)
    })

    /* Start listening (for incoming "user" connections). */
    wsServer.listen(_constants.ZEROPEN_PORT, _constants.LOCALHOST)
}

/**
 * Initailize Peer Exchange (PEX) Server
 */
const _initPexServer = () => {
    /* Add connection listener. */
    pexServer.on('connection', function (_socket) {
        console.info('NEW incoming peer connection!')
    })

    /* Add startup listener. */
    pexServer.on('listening', () => {
        console.info(`PEX Server is listening on [ ${_constants.LOCALHOST}:${_constants.ZEROPEN_PEX_PORT} ]`)
    })

    /* Start listening (for incoming "peer" connections). */
    pexServer.listen(_constants.ZEROPEN_PEX_PORT, _constants.LOCALHOST)
}

/* Initialize WebSocket (HTTP) holder. */
const wsServer = http.createServer()

/* Initialize WebSocket (HTTP) server. */
_initWebSocketServer()

/* Initialize PEX holder. */
const pexServer = net.createServer(_socket => {
    console.info('NEW incoming peer connection!')
})

/* Initialize PEX server. */
_initPexServer()
