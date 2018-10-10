/* Initialize local libraries. */
const _constants = require('./_constants')
const _utils = require('./_utils')

module.exports = function (_hostIp, _hostPort, _peerId, _reqId) {
    const cmd = 'handshake'
    const req_id = _reqId

    const crypt = null
    const crypt_supported = []
    // const crypt_supported = ['tls-rsa']
    const fileserver_port = _hostPort
    const protocol = 'v2'
    const port_opened = true
    const peer_id = _peerId
    const rev = 1337
    const version = _constants.VERSION
    const target_ip = _hostIp

    /* Build parameters. */
    const params = {
        crypt,
        crypt_supported,
        fileserver_port,
        protocol,
        port_opened,
        peer_id,
        rev,
        version,
        target_ip
    }

    return { cmd, req_id, params }
}
