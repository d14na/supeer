const Web3 = require('web3')

/* Initialize new web3 object. */
const web3 = new Web3()

/**
 * Get Account By Signature
 *
 * Retrieves the account (address) from the supplied cryptographic
 * signature object.
 */
const _getAccountBySig = function (_signature) {
    /* Retrieve the message. */
    const message = _signature.message
    console.log(`Received signature message [ ${message} ]`)

    try {
        /* Recover the account (address) from the signature object. */
        const account = web3.eth.accounts.recover(_signature)

        /* Return the account (address). */
        return account
    } catch (_err) {
        console.error(_err)

        /* Return null. */
        return null
    }
}

const _handler = async function (_zeroEvent, _requestId, _data) {
    /* Retrieve the signature. */
    const signature = _data.sig
    console.log('Perform authorization for', signature)

    /* Retrieve account for this signature. */
    const account = await _getAccountBySig(signature)
    console.info(`Validation successful for [ ${account} ]`)

    /* Set success flag. */
    const success = true

    /* Build message. */
    const msg = { account, success }

    /* Emit message. */
    _zeroEvent.emit('response', _requestId, msg)
}

module.exports = _handler
