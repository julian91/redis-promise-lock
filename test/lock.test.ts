// @ts-nocheck
import { Lock } from '../src/lock'

const defaultMockedClient = {
  setNX: async () => {},
  expire: async () => {},
  del: async () => {}
}

const packageName = 'redis-promise-lock'

const defaultRetryLimit = 10
const defaultRetryDelay = 1000
const defaultTtl = 3

describe('test initialization of class', () => {

  it('should crash without valid redis instance', () => {
    expect(() => { new Lock(undefined) }).toThrowError(`[${packageName}] - No redisClient provided.`)
  })

  it('should create redis instance', () => {
    expect(() => { new Lock(defaultMockedClient) }).not.toThrowError()
  })

  it('should override default options if provided', () => {

    const l1 = new Lock(defaultMockedClient)
    expect(l1.getOptions()).toEqual({
      retryLimit: defaultRetryLimit,
      retryDelay: defaultRetryDelay,
      ttl: defaultTtl
    })

    const overriddenOptions = {
      retryLimit: 69,
      retryDelay: 420,
      ttl: 1337
    }
    const l2 = new Lock(defaultMockedClient, overriddenOptions)
    expect(l2.getOptions()).toEqual(overriddenOptions)

  })

})

describe('test getOptions', () => {

  it('should throw on invalid paramater types', () => {
    const l1 = new Lock(defaultMockedClient)
    expect(() => { l1.getOptions({ retryLimit: 'NaN' }) }).toThrowError(`[${packageName}] - Invalid retryLimit provided! Must be a number greater than 0.`)

    expect(() => { l1.getOptions({ retryDelay: 0 }) }).toThrowError(`[${packageName}] - Invalid retryDelay provided! Must be a number greater than 0.`)

    expect(() => { l1.getOptions({ retryLimit: -1 }) }).toThrowError(`[${packageName}] - Invalid retryLimit provided! Must be a number greater than 0.`)
  })

  it('should accept 0 as ttl value', () => {
    const l1 = new Lock(defaultMockedClient)
    expect(() => { l1.getOptions({ ttl: 0 }) }).not.toThrowError()
  })

  it('should return options object with overridden parameters (rest default)', () => {
    const l1 = new Lock(defaultMockedClient)
    const testObj6 = l1.getOptions({ retryLimit: 1337 })
    const testObj9 = l1.getOptions({ retryDelay: 6969 })
    const testObj420 = l1.getOptions({ ttl: 420 })

    expect(testObj6).toMatchObject({
      retryLimit: 1337,
      retryDelay: defaultRetryDelay,
      ttl: defaultTtl
    })

    expect(testObj9).toMatchObject({
      retryLimit: defaultRetryLimit,
      retryDelay: 6969,
      ttl: defaultTtl
    })

    expect(testObj420).toMatchObject({
      retryLimit: defaultRetryLimit,
      retryDelay: defaultRetryDelay,
      ttl: 420
    })
  })
})

describe('test getRedisKey', () => {

  it('should throw on invalid paramater types', () => {
    const l1 = new Lock(defaultMockedClient)

    expect(() => { l1.getRedisKey() }).toThrowError(`[${packageName}] - Invalid lockName provided! Must be a non empty string.`)

    expect(() => { l1.getRedisKey(6969) }).toThrowError(`[${packageName}] - Invalid lockName provided! Must be a non empty string.`)

    expect(() => { l1.getRedisKey('') }).toThrowError(`[${packageName}] - Invalid lockName provided! Must be a non empty string.`)
  })
})

describe('test applyLock', () => {

  it('should set ttl to lock if ttl is greater than 0 and lock is new', async () => {

    const client = {
      setNX: jest.fn(async () => true),
      expire: jest.fn(async (key, payload) => {})
    }
    const l1 = new Lock(client)

    const lockApplied = await l1.applyLock('beer', 'tasty', 69)
    expect(lockApplied).toEqual(true)
    expect(client.expire).toHaveBeenCalled()
    expect(client.expire).toHaveBeenCalledWith('beer', 69)

  })

  it('should not add ttl if ttl is 0 (infinite ttl)', async () => {

    const client = {
      setNX: jest.fn(async () => true),
      expire: jest.fn(async (key, payload) => {})
    }
    const l1 = new Lock(client)

    const lockApplied = await l1.applyLock('beer', 'tasty', 0)
    expect(lockApplied).toEqual(true)
    expect(client.expire).not.toHaveBeenCalled()

  })

  it('should not add ttl to existing lock', async () => {

    const client = {
      setNX: jest.fn(async () => false),
      expire: jest.fn(async (key, payload) => {})
    }
    const l1 = new Lock(client)

    const lockApplied = await l1.applyLock('beer', 'tasty', 1337)
    expect(lockApplied).toEqual(false)
    expect(client.expire).not.toHaveBeenCalled()

  })

})



