const _handler = function (_conn, _zeroEvent, _requestId) {
    /* Retrieve the client's connection source (identity). */
    const identity = _conn.profile.address

    console.info(`Client's identity is [ ${identity} ]`)

    /* Set success flag. */
    const success = true

    /* Build message. */
    const msg = { identity, success }

    /* Emit message. */
    _zeroEvent.emit('response', _conn, _requestId, msg)
}

module.exports = _handler
