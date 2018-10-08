const _handler = function (_server, _requestId) {
    /* Retrieve the client's connection source (identity). */
    const identity = _server.source

    console.info(`Client's identity is [ ${identity} ]`)

    /* Set success flag. */
    const success = true

    /* Build message. */
    const msg = { identity, success }

    /* Emit message. */
    _server.zeropen.emit('response', _requestId, msg)
}

module.exports = _handler
