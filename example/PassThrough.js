export default class PassThrough {
  constructor() {
    this.queue = []
    this.resolve = null
  }

  push(value) {
    if (this.resolve) {
      this.resolve({ value, done: false })
      this.resolve = null
    } else {
      this.queue.push(value)
    }
  }

  [Symbol.asyncIterator]() {
    return {
      next: () => {
        if (this.queue.length > 0) {
          const value = this.queue.shift()
          return Promise.resolve({ value, done: false })
        } else {
          return new Promise(resolve => {
            this.resolve = resolve
          })
        }
      },
    }
  }

  close() {
    if (this.resolve) {
      this.resolve({ done: true })
      this.resolve = null
    }
  }
}
