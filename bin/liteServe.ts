/**
 * @module lite
 * @description Lite is a Lite Coordination Server for RMQBQ which can be used as an alternative to Redis, Database and MQTT coordinators.
 */

import { createServer } from 'http'
import { CoordinationServer } from '../src/CoordinationServer'

const port = process.env.PORT || 6363
const secret = process.env.LITE_SECRET || 'someveryimportantsecret'
const path = process.env.LITE_PATH || '/rmqbqc/'
const allowInsecure = process.env.LITE_ALLOW_INSECURE === 'true'
const server = createServer()
new CoordinationServer(secret, server, path, allowInsecure)
server.listen(port, () => {
  console.log(`Lite Coordination Server listening on port ${port}`)
})
