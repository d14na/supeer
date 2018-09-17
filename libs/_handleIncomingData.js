const _utils = require('./_utils')

/* Initialize the payload. */
let payload = null

module.exports = function (_data) {
// console.log('INCOMING DATA PARENT', _parent)
    if (payload) {
        payload = Buffer.concat([payload, _data])
        // payload = payload + _data
    } else {
        payload = _data
    }

    // console.log('INCOMING =>', _data.length, msg, _data.toString())
    // console.log('msg location', msg['location'])
    // console.log('incoming msg', msg, _data.toString())

    // const _arrayMatch = function (_arr1, _arr2) {
    //     if (_arr1.length === _arr2.length && _arr1.every(function (u, i) {
    //         return u === _arr2[i]
    //     })) {
    //         return true
    //     } else {
    //         return false
    //     }
    // }

    try {
        console.log('%d bytes incoming', _data.length, _data)
        // console.log('%d bytes incoming (payload)', payload.length, payload)
        // console.log('%d bytes incoming (hex)', Buffer.from(payload).toString('hex').length, Buffer.from(payload).toString('hex'))
        // let sizeEnding = Buffer.from('697a65cd', 'hex')
        // let sizeCheck = Buffer.from(payload.slice(-6, -2))

        // let decoded = {}

        // if (_arrayMatch(sizeCheck, sizeEnding)) {
        // console.log('*** FOUND IT! DO THE DECODING!')
        let decoded = _utils.decode(payload)
        // console.log('%d bytes incoming (decoded)', decoded.length, decoded)
        // }

        // let last8 = payload.slice(-8)

        // console.log('%d bytes incoming (last 8-bytes)', last8.length, last8, Buffer.from(last8).toString('hex'), Buffer.from(last8).toString())
        // console.log(Buffer.from(payload).toString())

        // console.log('SIZE ENDING', typeof sizeEnding, sizeEnding)
        // console.log('SIZE CHECK', typeof sizeCheck, sizeCheck)

        /* Initialize request. */
        let request = null

        /* Retrieve the request id. */
        if (decoded.to !== null) {
            const reqId = decoded.to
            console.log('Decoded reqId', reqId)

            /* Retrieve the request. */
            request = _utils.getRequestId(reqId)
            console.log('Decoded request', request)
        }

        if (decoded.cmd === 'response' && decoded.error) {
            console.error(decoded.error)

            // clear the payload
            payload = null

            // delete the request cmd
            delete request.cmd
        }

        if (decoded.cmd === 'response' && request.cmd === 'handshake') {
            console.info('Handshake completed successfully!')

            // clear the payload
            payload = null
        }

        if (decoded.cmd === 'response' && request.cmd === 'ping') {
            console.info('Ping completed successfully!')

            // clear the payload
            payload = null
        }

        if (decoded.cmd === 'response' && request.cmd === 'getFile') {
            /* Retrieve file type. */
            const fileType = request.innerPath.split('.').pop()

            if (fileType === 'json') {
                let body = JSON.parse(decoded.body)

                console.log('check out my JSON body', body)

                let description = body.description
                console.log('Description', description)
            }

            if (fileType === 'html') {
                let body = decoded.body.toString()

                console.log('check out my HTML body', body)
            }

            // clear the payload
            payload = null
        }

        if (decoded.cmd === 'response' && request.cmd === 'pex') {
            let peers = decoded.peers
            // let peers = JSON.parse(decoded.peers)
            console.log('check out my PEX peers', peers)

            for (let i = 0; i < peers.length; i++) {
                console.log('peer', peers[i].length, peers[i])

                const ipBuffer = Buffer.from(peers[i], 'binary')
                // const ipBuffer = Buffer.from(peers[i])

                if (ipBuffer.length === 6) {
                    console.log('#%d IP:Port', i, ipBuffer)

                    const peer = {
                        ip: _parent.parseIp(ipBuffer),
                        port: _parent.parsePort(ipBuffer)
                    }
                    console.log('PEX Peer (buffer)', peer)

                    _parent.hostIp = peer.ip
                    _parent.hostPort = peer.port
                }
            }

            // clear the payload
            payload = null
        }

        if (decoded && payload !== null) {
            console.error('FAILED TO RECOGNIZE -- clearing payload')

            // clear the payload
            payload = null
        }
    } catch (e) {
        console.error('Failed to decode %d bytes of _data', _data.length, e)
    }
}
