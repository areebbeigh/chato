const util = require('util')

const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)

const clientRoomMap = {}

io.on('connection', function (socket) {
  socket.on('message', function (message) {
    socket.broadcast.to(message.room).emit('message', message)
  })

  socket.on('disconnect', function () {
    let room = clientRoomMap[socket.id]
    delete clientRoomMap[socket.id]

    if (room) {
      io.in(room).clients((err, clients) => {
        if (clients.length === 1) {
          socket.broadcast.to(room).emit('peer_disconnected')
        }
      })
    }
  })

  socket.on('join or create', async function (room) {
    if (!room) {
      socket.emit('created', socket.id)
      clientRoomMap[socket.id] = socket.id
      socket.isInitiator = true
    }
    else {
      io.in(room).clients((err, clients) => {
        const numClients = clients.length
  
        if (numClients == 0) {
          socket.emit('invalid_room')
        } else if (numClients == 1) {
          io.sockets.in(room).emit('join', room)
          socket.join(room)
          socket.emit('joined', room)
          socket.isInitiator = false
          clientRoomMap[socket.id] = room
        } else {
          socket.emit('full', room)
        }
      })
    }
  })
})

app.use('/', express.static('./public', { etag: false }))

server.listen(8080, () => console.log(`Socket server running.`))
app.listen(8000, () => console.log(`Server server running.`))
