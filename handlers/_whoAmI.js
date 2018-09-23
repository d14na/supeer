const _whoAmI = async function (_conn) {
    /* Retrieve the connection source (identity). */
    const identity = _conn.source
    console.info(`User requested their identity [ ${identity} ]`)

    /* Build package. */
    pkg = {
        identity,
        success: true
    }

    return pkg
}

module.exports = _whoAmI
