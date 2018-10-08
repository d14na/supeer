/* Initialize local handlers. */
const auth = require('./_auth')
const getFile = require('./_getFile')
const getInfo = require('./_getInfo')
const whoAmI = require('./_whoAmI')

/**
 * Handle Incoming WebSocket Data
 */
const _handler = function (_conn, _zeroEvent, _requestId, _data) {
    // console.log('RECEIVED DATA', _data)

    // TODO Validate request id

    /* Initialize data holders. */
    let action = null

    /* Validate data and action. */
    if (_data && _data.action) {
        /* Retrieve the action. */
        action = _data.action

        console.log(`Client request [ ${_requestId} ] is [ ${action} ]`)
    } else {
        return console.error('No action was received for:', _data)
    }

    /* Handle actions (case-insesitive). */
    switch (action.toUpperCase()) {
    case 'AUTH':
        /* Handle request. */
        return auth(_zeroEvent, _requestId, _data)
    case 'GETFILE':
        /* Handle request. */
        return getFile(_zeroEvent, _requestId, _data)
    case 'GETINFO':
        /* Handle request. */
        return getInfo(_zeroEvent, _requestId, _data)
    case 'WHOAMI':
        /* Handle request. */
        return whoAmI(_zeroEvent, _conn, _requestId)
    default:
        console.log(`Nothing to do here with [ ${action} ]`)
    }
}

module.exports = _handler
