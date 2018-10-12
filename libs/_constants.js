module.exports = {
    /* System */
    LOCALHOST : '127.0.0.1',
    VERSION: '18.10.9',

    /* Zero Private Enterprise Network (0PEN) */
    ZEROPEN_PORT       : 10443,
    ZEROPEN_PEX_PORT   : 6888, // also used for BitTorrent and DHT peer services
    ZEROPEN_GHOST_PORT : 443,
    ZEROPEN_MIN_CONN   : 3,
    ZEROPEN_MAX_CONN   : 50,

    /* ZeroNet */
    ZERONET_PORT : 15441,

    /* BitTorrent */
    BITTORRENT_PORT   : 6881,
    OPENTRACKER_PORT  : 6969,
    TORRENT_MAX_CONN  : 50,
    BLOCK_HASH_LENGTH : 20,
    CHUNK_LENGTH      : 16384
}
