#!/usr/bin/env node

const http = require('http')
const sockjs = require('sockjs')
const PouchDB = require('pouchdb')

/* Initialize local libraries. */
const _utils = require('./libs/_utils')

/* Initialize new database cache. */
const cache = new PouchDB('cache')

/* Initialize global constants. */
const SOCKET_PORT = 10443
const DEBUG = false

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
    sockjs_url: './js/sockjs.min.js' })

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

    if (DEBUG) {
        console.log(`\n${JSON.stringify(headers)}\n\n`)
    }

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
 * Send Response
 *
 * Verify our connection status before sending.
 */
const _respond = function (_conn, _action, _msg) {
// FIXME How do we guranantee a valid CLIENT connection??
//       Check READYSTATE??

    /* Add action to response. */
    _msg = {
        action: _action,
        ..._msg
    }

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
            action = data.action
            console.log(`User requested [ ${action} ]`)
        } else {
            return console.error('No action was received.')
        }

        /* Handle actions (case-insesitive). */
        switch (action.toUpperCase()) {
        case 'AUTH':
            /* Initialize handler. */
            const auth = require('./handlers/_auth')

            /* Handle request. */
            pkg = await auth(_conn, data)

            /* Send response. */
            return _respond(_conn, action, pkg)
        case 'GETFILE':
            /* Initialize handler. */
            const getFile = require('./handlers/_getFile')

            /* Handle request. */
            pkg = await getFile(data)

            /* Send response. */
            return _respond(_conn, action, pkg)
        case 'GETINFO':
            /* Initialize handler. */
            const getInfo = require('./handlers/_getInfo')

            /* Handle request. */
            pkg = await getInfo(data)

            /* Send response. */
            return _respond(_conn, action, pkg)
        case 'SEARCH':
            /* Initialize handler. */
            const search = require('./handlers/_search')

            /* Handle request. */
            pkg = await search(data)

            /* Send response. */
            return _respond(_conn, action, pkg)
        case 'WHOAMI':
            /* Initialize handler. */
            const whoAmI = require('./handlers/_whoAmI')

            /* Handle request. */
            pkg = await whoAmI(_conn)

            /* Send response. */
            return _respond(_conn, action, pkg)
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
