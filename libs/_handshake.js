const _utils = require('./_utils')

module.exports = function (_hostIp, _hostPort, _peerId) {
    const cmd = 'handshake'
    const request = { cmd }
    const req_id = _utils.addRequest(request) // eslint-disable-line camelcase
// console.log('HANDSHAKE REQID', req_id)

    const crypt = null
    const crypt_supported = [] // eslint-disable-line camelcase
    // const crypt_supported = ['tls-rsa'] // eslint-disable-line camelcase
    const fileserver_port = _hostPort // eslint-disable-line camelcase
    const protocol = 'v2'
    const port_opened = true // eslint-disable-line camelcase
    const peer_id = _peerId // eslint-disable-line camelcase
    const rev = 1337
    const version = '18.9.17'
    const target_ip = _hostIp // eslint-disable-line camelcase

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
