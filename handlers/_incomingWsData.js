/* Initialize local handlers. */
const auth = require('./_auth')
const getFile = require('./_getFile')
const search = require('./_search')
const whoAmI = require('./_whoAmI')

/**
 * Handle Incoming WebSocket Data
 */
const _handler = function (_conn, _zeroEvent, _requestId, _data) {
    // console.log('RECEIVED DATA', _data)

    // TODO Validate request id

    /* Initialize data managers. */
    let action = null
    let dataId = null

    /* Validate data. */
    if (!_data) {
        return console.error('No DATA was received:', _data)
    }

    /* Validate action. */
    if (_data.action && _data.dataId) {
        /* Retrieve the action. */
        action = _data.action

        /* Retrieve the data id. */
        dataId = _data.dataId

        console.info(`Client request [ ${_requestId} ] is [ ${action} ] for [ ${dataId} ]`)
    } else if (_data.action) {
        /* Retrieve the action. */
        action = _data.action

        console.info(`Client request [ ${_requestId} ] is [ ${action} ]`)
    } else {
        return console.error('No ACTION was received for:', _data)
    }

    /* Handle actions (case-insesitive). */
    switch (action.toUpperCase()) {
    case 'AUTH': // Client authorization to 0PEN.
        /* Handle request. */
        return auth(_zeroEvent, _requestId, _data)
    case 'DELETE': // Remove 0PEN data.
        // TODO
        break
    case 'GET': // Retrieve 0PEN data.
        /* Handle request. */
        return getFile(_zeroEvent, _requestId, _data)
    case 'POST': // Add NON-IDEMPOTENT 0PEN data.
        // TODO
        break
    case 'PUT': // Add/update IDEMPOTENT 0PEN data.
        // TODO
        break
    case 'SEARCH': // Search 0PEN for (query term | dotBit).
        /* Handle request. */
        return search(_zeroEvent, _requestId, _data)
    case 'WHOAMI': // Client identification (ie STUN, TURN, ICE services).
        /* Handle request. */
        return whoAmI(_zeroEvent, _conn, _requestId)
    default:
        console.log(`Nothing to do here with [ ${action} ]`)
    }
}

module.exports = _handler
