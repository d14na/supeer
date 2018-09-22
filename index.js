#!/usr/bin/env node

const SOCKET_PORT = 10443

const http = require('http')
const sockjs = require('sockjs')
const Web3 = require('web3')

/* Initialize new web3 object. */
const web3 = new Web3()

/* Initialize local libraries. */
const _utils = require('./libs/_utils')
const Discovery = require('./libs/discovery')
const Peer0 = require('./libs/peer0')

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

    console.log(
`
Protocol: ${protocol}
Source: ${hostIp}:${hostPort}
Language: ${lang}
User Agent: ${userAgent}
`
    );
})

/**
 * Handle Incoming Data
 */
const _handleData = async function (_conn, _data) {
// console.log('RECEIVED DATA', _data)

    try {
        /* Parse the incoming data. */
        const data = JSON.parse(_data)
        console.log('PARSED DATA', data)

        const action = data.action
        console.log('ACTION', action)

        switch(action) {
            case 'AUTH':
                /* Retrieve the signature. */
                const signature = data.sig
                console.log('Perform authorization for', signature)

                /* Retrieve account for this signature. */
                const account = await _getAccountBySig(signature)
                console.log('IS VALID SIG for', account)

                _conn.write(`Hi ${account}!`)
                break
            default:
                console.log('Nothing to do here')
        }
    } catch (e) {
        console.error(e)
    }
}

/**
 * Get Account By Signature
 *
 * Retrieves the account (address) from the supplied cryptographic
 * signature object.
 */
const _getAccountBySig = function (_signature) {
    try {
        /* Recover the account (address) from the signature object. */
        const account = web3.eth.accounts.recover(_signature)

        /* Return the account (address). */
        return account
    } catch (e) {
        console.error(e)

        /* Return null. */
        return null
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
