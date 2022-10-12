## Redis Promise Lock

locks stuff until you unlock it.
works with redis 4.x.
promise based.
simple.

When creating an instance, you can pass an options object as the second argument with the following properties:
- retryLimit: `number`   number of times lock is trying to be set before bailing out (default: 10)
- retryDelay: `number`   amount of time in ms to wait between retries (default: 100)
- ttl: `number`          ttl of the lock to be set in redis before its removed by redis itself in seconds, if set to 0, lock wont have a ttl (default: 3)

Those can also be overwritten in the `acquireLock` function.

### Example Usage

```javascript
import { createClient } from 'redis'
import { Lock } from './src/lock'

const client = createClient({
  url: 'redis://127.0.0.1:6379'
})

;(async () => {
  await client.connect()
  const lockerRoom = new Lock(client)

  await lockerRoom.acquireLock('myawesomelock')
  // ... do some stuff while the lock is active
  await lockerRoom.releaseLock('myawesomelock')

})()
```