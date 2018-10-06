/**
 * Send Response
 *
 * NOTE We verify our connection status before sending.
 */
const _respond = function (_conn, _action, _msg) {
    /* Add action to response. */
    _msg = {
        action: _action,
        ..._msg
    }

    /* Stringify the message package. */
    const msg = JSON.stringify(_msg)

    /* Retrieve the ready state. */
    const readyState = _conn['_session']['readyState']

    /* Verify connection state. */
    if (readyState === 1) {
        /* Send message. */
        _conn.write(msg)
    } else {
        console.error(`Invalid ready state [ ${readyState} ]`)
    }
}

/**
 * Handle Incoming WebSocket Data
 */
const _handler = async function (_conn, _data) {
// console.log('RECEIVED DATA', _data)

    /* Initialize data holder. */
    let data = null

    /* Protect server process from FAILED parsing. */
    try {
        /* Parse the incoming data. */
        data = JSON.parse(_data)
        // console.log('PARSED DATA', data)
    } catch (_err) {
        return _handleError(_err)
    }

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
        const auth = require('./_auth')

        /* Handle request. */
        pkg = await auth(_conn, data)

        /* Send response. */
        return _respond(_conn, action, pkg)
    case 'GETFILE':
        /* Initialize handler. */
        const getFile = require('./_getFile')

        /* Handle request. */
        pkg = await getFile(data)

        /* Send response. */
        return _respond(_conn, action, pkg)
    case 'GETINFO':
        /* Initialize handler. */
        const getInfo = require('./_getInfo')

        /* Handle request. */
        pkg = await getInfo(data)

        /* Send response. */
        return _respond(_conn, action, pkg)
    case 'WHOAMI':
        /* Initialize handler. */
        const whoAmI = require('./_whoAmI')

        /* Handle request. */
        pkg = await whoAmI(_conn)

        /* Send response. */
        return _respond(_conn, action, pkg)
    default:
        console.log(`Nothing to do here with [ ${action} ]`)
    }
}

module.exports = _handler
