import { createServer } from 'node:net'

const functions = {
  add({ a, b }) {
    return a + b
  },

  subtract({ a, b }) {
    return a - b
  },

  todos(ids) {
    return [
      { id: 1, title: 'Learn Node.js' },
      { id: 2, title: 'Learn JavaScript' },
      { id: 3, title: 'Learn TypeScript' },
    ]
  }
}

createServer((socket) => {
  console.log('Client connected')

  socket.on('data', (data) => {
    console.log(`Received: ${data}`)

    const { method, params, id } = JSON.parse(data.toString())
    const result = functions[method](params)

    socket.write(`${JSON.stringify({ method, result, id })}\n`)
  })

  socket.on('end', () => {
    console.log('Client disconnected')
    socket.destroy()
  })
}).listen(25, () => {
  console.log('Server listening on port 25')
})
