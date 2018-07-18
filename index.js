const connect = require('connect')
const http = require('http')

const app = connect()

const DEFAULT_PORT = 8080

app.use(function (req, res) {
    res.end('Hi! My name is SUPeer. Would you like to play a game?')
})

http.createServer(app).listen(DEFAULT_PORT)
