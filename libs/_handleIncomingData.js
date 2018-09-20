const _utils = require('./_utils')

/* Initialize the payload. */
let payload = null

/* Initialize (data) overload. */
let overload = null

/* Initialize handshake flag. */
let handshakeComplete = false

module.exports = function (_address, _data) {
    /* Initailize promise holders. */
    let resolve = null
    let reject = null

    const _parseIp = function (_buf) {
        const ip = _buf.readUInt8(0) +
            '.' + _buf.readUInt8(1) +
            '.' + _buf.readUInt8(2) +
            '.' + _buf.readUInt8(3)

        return ip
    }

    const _parsePort = function (_buf) {
        const port = (_buf.readUInt8(5) * 256) + _buf.readUInt8(4)

        return port
    }

    /* Add data to current payload. */
    if (payload) {
        payload = Buffer.concat([payload, _data])
    } else {
        payload = _data
    }

    // console.log('INCOMING =>', _data.length, msg, _data.toString())
    // console.log('msg location', msg['location'])
    // console.log('incoming msg', msg, _data.toString())

    const _arrayMatch = function (_arr1, _arr2) {
        if (_arr1.length === _arr2.length && _arr1.every(function (u, i) {
            return u === _arr2[i]
        })) {
            return true
        } else {
            return false
        }
    }

    /* Initialize a NEW client connection/handshake (if needed). */
    const promise = new Promise((_resolve, _reject) => { // eslint-disable-line promise/param-names
        /* Initialize promise holders. */
        resolve = _resolve
        reject = _reject
    })

    // console.log('%d bytes incoming', _data.length, _data)

    // console.log(
    //     '%d bytes incoming (hex)',
    //     Buffer.from(payload).toString('hex').length,
    //     Buffer.from(payload).toString('hex'),
    //     Buffer.from(payload).toString())

    /* Initialize decoded holder. */
    let decoded = null

    /* Initialize (msgpack) ending flag. */
    let hasEnded = null

    /***********************************************************************
      Variable Integer Format
      -----------------------

      [CC] supports sizes <= 255 bytes (8-bit)
      [CD] supports sizes <= 65,535 bytes (16-bit)
      [CE] supports sizes > 65,535 bytes (32-bit)

      (no support for files larger than 32-bit)
    ***********************************************************************/

    /* Initialize (msgpack) ending hash. */
    const sizeEndingCC = Buffer.from('a473697a65cc', 'hex')
    const sizeEndingCD = Buffer.from('a473697a65cd', 'hex')
    const sizeEndingCE = Buffer.from('a473697a65ce', 'hex')

    /* Retrieve the ending bytes. */
    const sizeCheckCC = Buffer.from(payload.slice(-7, -1))
    const sizeCheckCD = Buffer.from(payload.slice(-8, -2))
    const sizeCheckCE = Buffer.from(payload.slice(-10, -4))
    // console.log('sizeCheck IS', sizeCheck, sizeCheck.toString('hex'), sizeCheck.toString())
    // console.log(`\nPayload length is [ ${payload.length} ] of [ 19-bit max: ${2 ** 19} ]`)
    // console.log('\nFirst 50 bytes', Buffer.from(payload.slice(0, 50)).toString(), Buffer.from(payload.slice(0, 50)).toString('hex'))
    // console.log('\nLast 50 bytes', Buffer.from(payload.slice(-50)).toString(), Buffer.from(payload.slice(-50)).toString('hex'))

    /* Match the endings for end-of-file detection. */
    if (
        _arrayMatch(sizeEndingCC, sizeCheckCC) ||
        _arrayMatch(sizeEndingCD, sizeCheckCD) ||
        _arrayMatch(sizeEndingCE, sizeCheckCE)
    ) {
        /* Retrieve the current (data) location. */
        const dataLocation = Buffer.from(payload.slice(-15, -10))

        /* Retrieve the current (data) location. */
        const fileSize = Buffer.from(payload.slice(-5))

        /* Search for an overload. */
        // NOTE We only check 32-bit file sizes.
        if (_arrayMatch(sizeEndingCE, sizeCheckCE) && !_arrayMatch(dataLocation, fileSize)) {
            // console.log('CHECKING FOR OVERLOAD', dataLocation.toString('hex'), fileSize.toString('hex'))

            // console.log('*** WE FOUND AN OVERLOAD --- REQUEST A DATA CONTINUATION')

            /* Add payload to current overload. */
            if (overload) {
console.log('OVERLOAD', overload.length)
console.log('PAYLOAD', payload.length)
                /* Add the current payload (body) to the overload (body). */
                overload = _utils.concatOverload(overload, payload)
            } else {
                console.log('FIRST PAYLOAD', _utils.decode(payload))
                overload = payload
            }

            /* Clear the payload. */
            payload = null

            /* Build overload package. */
            const pkg = {
                overload: true,
                location: dataLocation.readUInt32BE(1)
            }

            /* Return */
            resolve(pkg)
        } else {
            /* Set file ending flag. */
            hasEnded = true

            /* Process the data overload. */
            if (overload) {
                /* Add (FINAL) payload to current overload. */
                overload = _utils.concatOverload(overload, payload)
                console.log('HANDLE THE OVERLOAD 1', overload.length)

                /* Copy the overload holder to the payload. */
                payload = overload
                // console.log('HANDLE THE PAYLOAD', payload.length)

                /* Clear the overload. */
                overload = null
                // console.log('HANDLE THE OVERLOAD 2', overload)
            }
        }
    }

    /* Handle file data parsing. */
    if (hasEnded || !handshakeComplete) {
        console.log('DATA STREAM HAS ENDED!!!', payload.length)

        /* Decode the payload. */
        decoded = _utils.decode(payload)
        // console.log('DECODED 1', decoded)

        /* Initialize request. */
        let request = null

        /* Retrieve the request id. */
        if (decoded.to !== null) {
            const reqId = decoded.to
            // console.log('Decoded reqId', reqId)

            /* Retrieve the request. */
            request = _utils.getRequestId(reqId)
            // console.log('Decoded request', request)
        }

        if (decoded.cmd === 'response' && decoded.error) {
            console.error(decoded.error)

            /* Clear the payload. */
            payload = null

            // delete the request cmd
            delete request.cmd

            reject(decoded.error)
        }

        if (decoded.cmd === 'response' && request.cmd === 'handshake') {
            console.info('Handshake completed successfully!')

            /* Set handshake flag. */
            handshakeComplete = true

            /* Clear the payload. */
            payload = null

            const pkg = {
                success: true,
                action: 'HANDSHAKE'
            }

            resolve(pkg)
        }

        if (decoded.cmd === 'response' && request.cmd === 'ping') {
            console.info('Ping completed successfully!')

            /* Clear the payload. */
            payload = null
        }

        if (decoded.cmd === 'response' && request.cmd === 'getFile') {
            /* Clear the payload. */
            payload = null

            // console.log('*** DECODED', decoded)
            // console.log('*** REQUEST', request)

            const pkg = { request, decoded }

            resolve(pkg)
        }

        if (decoded.cmd === 'response' && request.cmd === 'pex') {
            let peers = decoded.peers
            // let peers = JSON.parse(decoded.peers)
            console.info('Check out my PEX peers', peers)

            for (let i = 0; i < peers.length; i++) {
                console.log('peer', peers[i].length, peers[i])

                const ipBuffer = Buffer.from(peers[i], 'binary')
                // const ipBuffer = Buffer.from(peers[i])

                if (ipBuffer.length === 6) {
                    console.log('#%d IP:Port', i, ipBuffer)

                    const peer = {
                        ip: _parseIp(ipBuffer),
                        port: _parsePort(ipBuffer)
                    }
                    console.log('PEX Peer (buffer)', peer)
                }
            }

            /* Clear the payload. */
            payload = null
        }
    }

    if (decoded && payload !== null) {
        console.error('FAILED TO RECOGNIZE -- clearing payload')

        /* Clear the payload. */
        payload = null
    }

    /* Return the promise. */
    return promise
}
