const _handler = function (_conn, _zeroEvent, _requestId) {
    /* Retrieve the client's connection source (identity). */
    const identity = _conn.profile.address

    console.info(`Client's identity is [ ${identity} ]`)

    /* Set success flag. */
    const success = true

    /* Build (data) message. */
    const data = { identity, success }

    /* Emit message. */
    _zeroEvent.emit('response', _requestId, data)
}

module.exports = _handler
