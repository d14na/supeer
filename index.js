#!/usr/bin/env node

const SOCKET_PORT = 10443

const http = require('http')
const sockjs = require('sockjs')
const Web3 = require('web3')

/* Initialize new web3 object. */
const web3 = new Web3()
// console.log('WEB3', web3)

const _utils = require('./libs/_utils')
const Discovery = require('./libs/discovery')
const Peer0 = require('./libs/peer0')

/**
 * Handle socket errors.
 */
function _handleError(e) {
    console.log('OH NO! Something terrible happened', e)
}

/**
 * Handle socket closure.
 */
function _handleClose() {
    console.log('Connection was closed')
}

const ws = sockjs.createServer({
    sockjs_url: 'https://cdn.jsdelivr.net/sockjs/1.1.4/sockjs.min.js' })

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

// const server = http.createServer()
// ws.installHandlers(server)
// // ws.installHandlers(server, { prefix:'/ws' })
// server.listen(SOCKET_PORT, '127.0.0.1')



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
requestFile(address, site, innerPath)







// setTimeout(() => {
// return
//     if (!_utils.getSummaryDisplayed()) {
//         _utils.displaySummary()
//     }
//
//     /* Retrieve found peers. */
//     const foundPeers = _utils.getFoundPeers()
//
//     /* Filter peers. */
//     const filteredPeers = foundPeers.filter(peer => {
//         /* Retrieve port number. */
//         const portNum = parseInt(peer.split(':')[1])
//
//         /* Remove peers with port num [ 0 ]. */
//         if (portNum === 0) {
//             return false
//         } else {
//             return true
//         }
//     })
//     // console.log('Filtered Peers', filteredPeers)
//
//     /* Check the peer connections. */
//     _manageConnections(filteredPeers)
// }, 5000)

// scrape
// client.scrape()


// manageConnections(_peers) {
//     /* Initialize connection count. */
//     let connCount = 0
//
//     for (let address of _peers) {
//         console.log(`Connecting with ${address}`)
//
//         const peerIp = address.split(':')[0]
//         const peerPort = address.split(':')[1]
//
//         /* Skip peers with port number [ 0 ]. */
//         if (peerPort === 0) {
//             console.log(`Skipping ${address}`)
//
//             continue
//         }
//
//         /* Open connection with peer (request handshake). */
//         const peer = _openConnection(address)
//         // console.log('PEER', peer)
//
//         /* Handle closed connection. */
//         peer.on('close', function () {
//             console.info(`Connection closed with ${address}`)
//         })
//
//         /* Handle connection errors. */
//         peer.on('error', function (_err) {
//             console.error(`Error detected with ${address} [ ${_err.message} ]`, )
//         })
//
//         /* Handle incoming data. */
//         peer.on('data', async function (_data) {
//             /* Initialize incoming data handler. */
//             const handleIncomingData = require('./_handleIncomingData')
//
//             /* Retrieve response from data handler. */
//             const data = await handleIncomingData(address, _data)
//
//             /* Validate data. */
//             if (!data) {
//                 throw new Error('Data failed to be returned from handler.')
//             }
//
// if (_utils.isJson(data)) {
// console.log(`Returned data is JSON OBJECT`, data)
// } else if (_utils.isJson(data, true)) {
// console.log(`Returned data is JSON STRING`, JSON.parse(data))
// } else {
// console.log(`Returned data is RAW\n${data.toString('hex')}\n${data.toString()}`)
// }
//
//             /* Handle handshakes. */
//             if (data.success && data.action == 'HANDSHAKE') {
// return _requestFile(peer, 0)
//
//                 /* Limit max connections. */
//                 if (connCount++ === _constants.ZEROPEN_MAX_CONN) {
//                     console.info(`\nWe successfully handshaked with [ ${peers.length} ] peers.`)
//
//                     if (!fileRequested) {
//                         /* Set file request flag. */
//                         fileRequested = true
//
//                         /* Request the file from first peer. */
//                         _requestFile(peer, 0)
//                     }
//                 } else {
//                     /* Add peer to (successfully) connected list. */
//                     peers.push(peer)
//                 }
//             }
//
//             /* Verify length of data body. */
//             if (data.decoded && data.decoded.body) {
//                 const body = data.decoded.body
//                 console.log(`Data body length is [ ${body.length} ]`)
//                 console.log(`Data body hash is [ ${_utils.calcFileHash(body)} ]`)
//             }
//
//             /* Check for overload. */
//             if (data.overload && data.location) {
//                 // console.log('CONTINUE WITH DATA REQUEST', _utils.innerPath, data.location)
//                 /* Continue with data request. */
//                 _requestFile(peer, data.location)
//             }
//
//             /* Parse and update the config files. */
//             // if (data.request && data.request.innerPath === 'content.json') {
//             //     const body = data.decoded.body
//             //
//             //     const files = JSON.parse(body).files
//             //
//             //     _utils._updateFiles(files)
//             // }
//
//         })
//
//         /* Limit max connection requests. */
//         // NOTE We should NOT request ALL peers at once, to limit resource use.
//         if (connCount === _constants.ZEROPEN_MAX_CONN) {
//             // console.log('\nAll connected peers', peers)
//             break
//         }
//         break
//     }
// }
