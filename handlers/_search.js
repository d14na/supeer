const _search = async function (_data) {
    /* Retrieve the query. */
    const query = _data.query

console.log('Lets try to find something to do with', query)

    /* Build package. */
    pkg = {
        result: `Sorry, we coudn't find anything for [ ${query} ]`,
        success: true
    }

    return pkg
}

module.exports = _search
