import { ref } from 'vue'
import { nanoid } from 'nanoid'

import handle_errors from './errors.js'
import { VITE_API_URL, VITE_API_WS_URL } from './env.js'
import PassThrough from './PassThrough.js'

const websocket_status = ref(false)
const subscriptions = new Map()

let websocket

async function create_websocket() {
  return new Promise(resolve => {
    websocket = new WebSocket(VITE_API_WS_URL)

    websocket.onopen = () => {
      websocket_status.value = true
      resolve()
    }
    websocket.onmessage = event => {
      const { id, data, errors = [], done } = JSON.parse(event.data)
      if (errors.length) handle_errors(errors)
      const stream = subscriptions.get(id)

      if (stream) {
        if (done) {
          stream.close()
          subscriptions.delete(id)
        } else stream.push(data)
      }
    }
    websocket.onerror = event => console.error('WS Error event', event)
    websocket.onclose = () => (websocket_status.value = false)
  })
}

export function query(query, variables) {
  return fetch(VITE_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    credentials: 'include',
  })
    .then(response => response.json())
    .then(({ data, errors = [] }) => {
      if (errors.length) handle_errors(errors)
      return data
    })
}

export async function* subscribe(query, variables) {
  if (!websocket_status.value) await create_websocket()

  const id = nanoid()
  const stream = new PassThrough()

  subscriptions.set(id, stream)
  websocket.send(JSON.stringify({ id, query, variables }))

  try {
    for await (const data of stream) {
      yield data
    }
  } finally {
  }
}
