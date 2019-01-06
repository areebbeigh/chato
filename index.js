const util = require('util')

const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)

io.on('connection', function (socket) {
  socket.on('message', function (message) {
    socket.broadcast.to(message.room).emit('message', message)
  })

  socket.on('disconnect', function () {
    console.log('here', socket.rooms)
    const socketRooms = Object.keys(socket.rooms)
    let room = null

    if (socketRooms.length > 1 && socket.isInitiator) {
      room = socketRooms.filter(x => x != socket.id)[0]
    } else if (socketRooms.length === 1) {
      room = socketRooms[0]
    }

    console.log(room, socketRooms)

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
      socket.isInitiator = true
    }
    else {
      io.in(room).clients((err, clients) => {
        const numClients = clients.length
  
        if (numClients == 0) {
          socket.join(room)
          socket.emit('created', room)
          socket.isInitiator = true
        } else if (numClients == 1) {
          io.sockets.in(room).emit('join', room)
          socket.join(room)
          socket.emit('joined', room)
          socket.isInitiator = false
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
