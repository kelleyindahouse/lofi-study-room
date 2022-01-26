const mongoose = require('mongoose')
const Document = require('./Document')
const { join } = require('path')
const uri = process.env.MONGODB_URI;
const express = require('express')
const app = express()
const cors = require('cors')
const server = require('http').createServer(app)
const PORT = process.env.PORT || 5000

app.use(cors())

const io = require('socket.io')(server)

// mongoose.connect('mongodb://localhost:27017/lofinotes');

mongoose.connect(uri, { useUnifiedTopology: true, useNewUrlParser: true })
  .then(() => console.log('MongoDB connected!'))
  .catch(err => console.log('Error:- ' + err))


const defaultValue = ''

// listening for text changes
io.on("connection", socket => {
  socket.on('get-document', async documentId => {
    // capturing function to find document by Id
    const document = await findOrCreateDocument(documentId)
    // putting socket into a 'room' based on documentId and everyone with this socket can talk to one another
    socket.join(documentId)
    // send out data from matching document
    socket.emit('load-document', document.data)

    socket.on('send-changes', delta => {
      // broadcasts to everyone but 'us' that there are changes and 'delta' are those changes
      socket.broadcast.to(documentId).emit('receive-changes', delta)
    })
    // updating saved data on documents
    socket.on('save-document', async data => {
      await Document.findByIdAndUpdate(documentId, { data })
    })
  })
})

async function findOrCreateDocument(id) {
  if (id == null) return

  const document = await Document.findById(id)
  if (document) return document
  return await Document.create({ _id: id, data: defaultValue })
}

server.listen(PORT, () => { console.log(`Server Running on PORT - ${PORT}`) })