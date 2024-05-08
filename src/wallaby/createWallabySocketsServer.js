import { Server } from 'socket.io'


export default server => {
  const io = new Server(server)

  io.on('connection', sock => {
    console.log('wallaby socket server ready')
  })

  process.on('exit', () => io.close())

  return io
}