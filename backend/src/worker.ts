import { httpServerHandler } from 'cloudflare:node'
import app from './app.js'

// Express is hosted by the Workers Node.js HTTP bridge.
const server = app.listen(3000)

export default httpServerHandler(server)
