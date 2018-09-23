const Web3 = require('web3')

/* Initialize new web3 object. */
const web3 = new Web3()

/**
 * Get Account By Signature
 *
 * Retrieves the account (address) from the supplied cryptographic
 * signature object.
 */
const _getAccountBySig = function (_source, _signature) {
    console.log(`Received connection source [ ${_source} ]`)

    /* Retrieve the message. */
    const message = _signature.message
    console.log(`Received signature message [ ${message} ]`)

    try {
        /* Recover the account (address) from the signature object. */
        const account = web3.eth.accounts.recover(_signature)

        /* Return the account (address). */
        return account
    } catch (e) {
        console.error(e)

        /* Return null. */
        return null
    }
}

const _auth = async function (_conn, _data) {
    /* Retrieve the connection source. */
    const source = _conn.source

    /* Retrieve the signature. */
    const signature = _data.sig
    // console.log('Perform authorization for', signature)

    /* Retrieve account for this signature. */
    const account = await _getAccountBySig(source, signature)
    console.info(`Validation successful for [ ${account} ]`)

    /* Build package. */
    pkg = {
        msg: `Hi ${account}!`,
        success: true
    }

    return pkg
}

module.exports = _auth
