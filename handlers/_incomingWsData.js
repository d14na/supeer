/* Initialize local handlers. */
const auth = require('./_auth')
const getFile = require('./_getFile')
const getInfo = require('./_getInfo')
const whoAmI = require('./_whoAmI')

/**
 * Handle Incoming WebSocket Data
 */
const _handler = function (_server, _pex, _data) {
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
    let requestId = null

    /* Validate data and action. */
    if (data && data.action && data.requestId) {
        /* Retrieve the action. */
        action = data.action

        /* Retrieve the request id. */
        requestId = data.requestId

        console.log(`Client's [ #${requestId} ] request is [ ${action} ]`)
    } else {
        return console.error('No action was received.')
    }

    /* Handle actions (case-insesitive). */
    switch (action.toUpperCase()) {
    case 'AUTH':
        /* Handle request. */
        // return auth(_server, requestId, data)

        /* Send response. */
        // return _respond(_server, action, pkg)
    case 'GETFILE':
        /* Initialize handler. */

        /* Handle request. */
        // pkg = await getFile(data)

        /* Send response. */
        return _respond(_server, action, pkg)
    case 'GETINFO':
        /* Handle request. */
        return getInfo(_server, _pex, requestId, data)
    case 'WHOAMI':
        /* Handle request. */
        return whoAmI(_server, requestId)
    default:
        console.log(`Nothing to do here with [ ${action} ]`)
    }
}

module.exports = _handler
