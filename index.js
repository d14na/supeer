#!/usr/bin/env node

const http = require('http')
const sockjs = require('sockjs')
const PouchDB = require('pouchdb')

/* Initialize local libraries. */
const _utils = require('./libs/_utils')
const Discovery = require('./libs/discovery')
const Peer0 = require('./libs/peer0')

/* Initialize new database cache. */
const cache = new PouchDB('cache')

/* Initialize global constants. */
const SOCKET_PORT = 10443

/**
 * Handle socket errors.
 */
const _handleError = function (e) {
    console.log('Oops! An error occured:', e)
}

/**
 * Handle socket closure.
 */
const _handleClose = function () {
    console.log('Client connection was closed.')
}

const ws = sockjs.createServer({
    sockjs_url: 'js/sockjs.min.js' })

ws.on('connection', function (conn) {
    /* Initialize data event. */
    conn.on('data', (_msg) => {
        _handleData(conn, _msg)
    })

    /* Initialize close event. */
    conn.on('error', _handleError)

    /* Initialize close event. */
    conn.on('close', _handleClose)

    const headers = conn.headers
    console.log(`\n${JSON.stringify(headers)}\n\n`)

    /* Retrieve the communication protocol (ie websocket). */
    const protocol = conn.protocol

    /* Retrieve the "real" ip address. */
    const hostIp = headers['x-real-ip']

    /* Retrieve the host port. */
    const hostPort = conn.remotePort

    /* Retrieve the user agent. */
    const userAgent = headers['user-agent']

    /* Retrieve the language. */
    const lang = headers['accept-language']

    /* Add source to conn (for authentication). */
    conn.source = `${hostIp}:${hostPort}`

    console.info(
`
Protocol: ${protocol}
Source: ${hostIp}:${hostPort}
Language: ${lang}
User Agent: ${userAgent}
`
    );
})

/**
 * Send Response
 *
 * Verify our connection status before sending.
 */
const _respond = function (_conn, _msg) {
// FIXME How do we guranantee a valid connection??

    /* Stringify the message package. */
    const msg = JSON.stringify(_msg)

    /* Send message. */
    _conn.write(msg)
}

/**
 * Handle Incoming Data
 */
const _handleData = async function (_conn, _data) {
// console.log('RECEIVED DATA', _data)

    /* Protect server process from BAD DATA. */
    try {
        /* Parse the incoming data. */
        const data = JSON.parse(_data)
        // console.log('PARSED DATA', data)

        /* Initialize data holders. */
        let action = null
        let pkg = null

        /* Validate data and action. */
        if (data && data.action) {
            /* Retrieve the action (convert to uppercase). */
            action = data.action.toUpperCase()
            console.log(`User requested [ ${action} ]`)
        } else {
            console.error('No action was received.')
        }

        switch(action) {
            case 'AUTH':
                /* Initialize authorization handler. */
                const auth = require('./handlers/_auth')

                /* Handle authorization. */
                pkg = await auth(_conn, data)

                /* Send response. */
                return _respond(_conn, pkg)
            case 'WHOAMI':
                /* Initialize `Who Am I` handler. */
                const whoAmI = require('./handlers/_whoAmI')

                /* Handle `Who Am I` request. */
                pkg = await whoAmI(_conn)

                /* Send response. */
                return _respond(_conn, pkg)
            default:
                console.log(`Nothing to do here with [ ${action} ]`)
        }
    } catch (e) {
        console.error(e)
    }
}


const server = http.createServer()
ws.installHandlers(server)
// ws.installHandlers(server, { prefix:'/ws' })
server.listen(SOCKET_PORT, '127.0.0.1')



// const moment = require('moment')
//
// const express = require('express')
// const app = express()
//
// app.get('/', (req, res) => {
//     console.log('HEADERS', req.headers)
//     console.log('URL', req.url)
//
//     let timeNow = moment().unix()
//     let jsNow = new Date()
//
//     res.send(`Hello Zer0! -- ${timeNow} -- ${jsNow}`)
// })
//
// app.get('/magnet', (req, res) => {
//     console.log('(magnet) HEADERS', req.headers)
//     console.log('(magnet) URL', req.url)
//
//     let timeNow = moment().unix()
//     let jsNow = new Date()
//
//     res.send(`(magnet) Hello Zer0! -- ${timeNow} -- ${jsNow}`)
// })
//
// app.listen(SOCKET_PORT,
//     () => console.log(`Example app listening on port ${SOCKET_PORT}!`))






const doDiscovery = async function (_infoHash) {
    /* Create new Discovery. */
    const discovery = new Discovery(_infoHash)

    /* Start discovery of peers. */
    const peers = await discovery.startTracker()
    console.log('FOUND THESE PEERS', peers)
}

const requestFile = async function (_address, _site, _innerPath) {
    /* Create new Peer. */
    const peer0 = new Peer0(_address, _site)

    /* Open a new connection. */
    const conn = await peer0.openConnection()

    if (conn && conn.action === 'HANDSHAKE') {
        /* Start discovery of peers. */
        const fileData = await peer0.requestFile(_innerPath, 0)
        console.log('RECEIVED THIS FILE DATA', fileData)
    }
}

/* Initialize target zite. */
const site = '1Gfey7wVXXg1rxk751TBTxLJwhddDNfcdp'
// const site = '1HeLLo4uzjaLetFx6NH3PMwFP3qbRbTf3D'
// const site = '1Name2NXVi1RDPDgf5617UoW7xA6YrhM9F'

/* Initialize info hash. */
const infoHash = Buffer.from(_utils.calcInfoHash(site), 'hex')

/* Initialize inner path. */
const innerPath = 'index.html'
// const innerPath = 'archive.py'
// const innerPath = 'content.json'
// const innerPath = 'messages.json'

// doDiscovery(infoHash)

const address = '185.142.236.207:10443'
// requestFile(address, site, innerPath)
