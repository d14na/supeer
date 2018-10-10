/* Initialize local libraries. */
const _utils = require('../libs/_utils')

// TODO How can we make this optional?? (for performance reasons)
const ENABLE_GEO_LOOKUP = true

const _handler = async (_zeroEvent, _conn, _requestId) => {
    /* Retrieve the client's connection source (address). */
    const address = _conn.profile.address

    /* Validate address. */
    if (!address) {
        return console.log('ERROR retrieving address from connection', _conn)
    }

    /* Calculate the client's identity (PeerId / InfoHash). */
    const identity = _utils.calcIdentity(address)

    /* Retrieve ip address. */
    const ip = address.split(':')[0]

    /* Retrieve port number. */
    const port = address.split(':')[1]

    /* Initialize city. */
    let city = null

    /* Initialize city. */
    let country = null

    if (ENABLE_GEO_LOOKUP) {
        /* Retrieve city (geo location). */
        const geoLocation = await _utils.geoLookup(ip)
            .catch(console.error)

        /* Validate geo location. */
        if (!geoLocation) {
            return console.log('ERROR retrieving geo location:', geoLocation)
        }

        /* Retrieve city. */
        city = geoLocation['city']['names']['en']

        /* Retrieve country. */
        country = geoLocation['country']['names']['en']

        // console.info('Received geo location details:', geoLocation)
    }

    console.info(`Client's identity is [ ${identity} ] [ ${city} ] [ ${country} ]`)

    /* Set success flag. */
    const success = true

    /* Build (data) message. */
    const data = { identity, ip, port, city, country, success }

    /* Emit message. */
    _zeroEvent.emit('response', _requestId, data)
}

module.exports = _handler
