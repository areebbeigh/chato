const util = require('util')

const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)

io.on('connection', function (socket) {
  socket.on('message', function (message) {
    socket.broadcast.to(message.channel).emit('message', message)
  })

  socket.on('join or create', async function ({ nickname, channel }) {
    const room = channel

    io.in(room).clients((err, clients) => {
      const numClients = clients.length

      if (numClients == 0) {
        socket.join(room)
        socket.emit('created', room)
      } else if (numClients == 1) {
        io.sockets.in(room).emit('join', room)
        socket.join(room)
        socket.emit('joined', room)
      } else {
        socket.emit('full', room)
      }
    })
  })
})

app.use('/', express.static('./public'))

server.listen(8081, () => console.log(`Socket server running.`))
app.listen(8080, () => console.log(`Server server running.`))
