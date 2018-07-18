const express = require('express')
const app = express()

const DEFAULT_PORT = 8080

app.get('/', (req, res) => {
    res.type('html')

    res.send(`
        <h2>Hi! My name is SUPeer.</h2>
        <h3>Would you like to play a game?</h3>
    `)
})

app.listen(DEFAULT_PORT, () => {
    console.log(`
    SUPeer is listening on port %d
    ________________________________
    `, DEFAULT_PORT)
})
