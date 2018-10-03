/* Initialize local libraries. */
const _utils = require('../libs/_utils')
const Discovery = require('../libs/discovery')
const Peer = require('../libs/peer')

const _handler = async function (_query) {
    // console.log('Lets try to find something to do with', _query)

    /* Initialize result. */
    let result = null

    /* Initialize success. */
    let success = null

    /* Initialize error. */
    let error = null

    /* Initialize search flag. */
    let search = true

    /* Set info hash. */
    infoHash = _query

    success = false
    error = `<span class="text-warning">[ ${infoHash} ]</span><br />Magnet links &amp; info hashes are NOT yet supported.`

    /* Build package. */
    pkg = { error, success }
    // pkg = { search, result, error, success }

    return pkg
}
module.exports = _handler
