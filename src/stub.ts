import { writeFile } from 'node:fs'

import type { Config, ConfigFunctionSignature } from './types.js'

const DEFAULT_TIMEOUT = 5000

export const generateClientStub = ({
  timeout,
  host,
  port,
}: Partial<Config>,
  target: string,
  functions: ConfigFunctionSignature,
): void => {

const methods: string = Object
  .entries(functions)
  .reduce((prev, cur): string => {
    const [name, { parameters }] = cur
    const stringParams: string = Object
      .keys(parameters)
      .join(', ')

    return `
  ${prev}

  ${name}(${stringParams}) {
    return this.#sendRequest('${name}', { ${stringParams} })
  }
    `
  }, '')
  .trimStart()

const userTimeout = timeout ? timeout : (timeout === 0 ? null : DEFAULT_TIMEOUT)

// TODO: add data buffering
// TODO: add authentication
// TODO: add TLS support
const template = `// code-generated file - es-rpcgen

import EventEmitter from 'node:events'
import { connect } from 'node:net'

const userTimeout = ${userTimeout}

const createTimeout = (socket) => {
  if (userTimeout) {
    return setTimeout(() => {
      socket.destroy()
    }, 5000)
  }

  return null
}

class Stub extends EventEmitter {

  #socket = null
  #timeout = null

  async #sendRequest(method, parameters) {
    if (!this.#socket || this.#socket.destroyed) {
      await this.connect()
    }

    if (this.#timeout) {
      clearTimeout(this.#timeout)
    }
    
    return new Promise((resolve) => {
      this.#socket.on('data', (data) => {
        const { returnValue } = JSON.parse(data.toString())
        resolve(returnValue)
      })
  
      this.#socket.write(\`\${JSON.stringify({ method, parameters })}\n\`)
      this.#timeout = createTimeout(this.#socket)
    })
  }

  async connect() {
    this.#socket = connect({ host: '${host}', port: ${port} })

    this.#socket.once('error', (error) => {
      console.error(error.message)
      socket.destroy()
      process.exit()
    })

    await new Promise((resolve) => {
      this.#socket.once('connect', () => {
        this.emit('connect')
        this.#timeout = createTimeout(this.#socket)
        resolve()
      })
    })
  }

  close() {
    if (this.#socket || !this.#socket.destroyed) {
      return
    }

    this.#socket.destroy()
    this.emit('close')
  }

  ${methods}
}

const clientStub = new Stub()

export default clientStub
`

  writeFile(target, template, (err) => {
    if (err) {
      console.error(err)
      return
    }

    console.log('successfully written client stub.')
  })
}