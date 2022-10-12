
import { createClient } from 'redis'
import { Lock } from '../src/lock'

type RedisClient = ReturnType<typeof createClient>

const defaultMockedClient = {
  setNX: async () => {},
  expire: async () => {},
  del: async () => {}
} as unknown as RedisClient

const defaultRetryLimit = 10
const defaultRetryDelay = 100
const defaultTtl = 3

describe('test initialization of class', () => {
  it('should crash without valid redis instance', () => {
    // @ts-expect-error - we explicitly want to check for our friends that dont use typescript whether they pass wrong args to a func
    expect(() => { const lock = new Lock(undefined) }).toThrowError(/No redisClient provided/) // eslint-disable-line @typescript-eslint/no-unused-vars
  })

  it('should create redis instance', () => {
    expect(() => { const lock = new Lock(defaultMockedClient) }).not.toThrowError() // eslint-disable-line @typescript-eslint/no-unused-vars
  })

  it('should override default options if provided', () => {
    const l1 = new Lock(defaultMockedClient)
    expect(l1.getOptions()).toEqual({ retryLimit: defaultRetryLimit, retryDelay: defaultRetryDelay, ttl: defaultTtl })
    const overriddenOptions = { retryLimit: 69, retryDelay: 420, ttl: 1337 }
    const l2 = new Lock(defaultMockedClient, overriddenOptions)
    expect(l2.getOptions()).toEqual(overriddenOptions)
  })
})

describe('test getOptions', () => {
  it('should throw on invalid paramater types', () => {
    const l1 = new Lock(defaultMockedClient)
    // @ts-expect-error - we explicitly want to check for our friends that dont use typescript whether they pass wrong args to a func
    expect(() => { l1.getOptions({ retryLimit: 'NaN' }) }).toThrowError(/Invalid retryLimit/)
    expect(() => { l1.getOptions({ retryDelay: 0 }) }).toThrowError(/Invalid retryDelay/)
    expect(() => { l1.getOptions({ retryLimit: -1 }) }).toThrowError(/Invalid retryLimit/)
  })

  it('should accept 0 as ttl value', () => {
    const l1 = new Lock(defaultMockedClient)
    expect(() => { l1.getOptions({ ttl: 0 }) }).not.toThrowError()
  })

  it('should return options object with overridden parameters (rest default)', () => {
    const l1 = new Lock(defaultMockedClient)
    const testObj1 = l1.getOptions({ retryLimit: 1337 })
    const testObj2 = l1.getOptions({ retryDelay: 6969 })
    const testObj3 = l1.getOptions({ ttl: 420 })
    expect(testObj1).toMatchObject({ retryLimit: 1337, retryDelay: defaultRetryDelay, ttl: defaultTtl })
    expect(testObj2).toMatchObject({ retryLimit: defaultRetryLimit, retryDelay: 6969, ttl: defaultTtl })
    expect(testObj3).toMatchObject({ retryLimit: defaultRetryLimit, retryDelay: defaultRetryDelay, ttl: 420 })
  })
})

describe('test getRedisKey', () => {
  it('should throw on invalid paramater types', () => {
    const l1 = new Lock(defaultMockedClient)
    // @ts-expect-error - we explicitly want to check for our friends that dont use typescript whether they pass wrong args to a func
    expect(() => { l1.getRedisKey() }).toThrowError(/Invalid lockName/)
    // @ts-expect-error - we explicitly want to check for our friends that dont use typescript whether they pass wrong args to a func
    expect(() => { l1.getRedisKey(6969) }).toThrowError(/Invalid lockName/)
    expect(() => { l1.getRedisKey('') }).toThrowError(/Invalid lockName/)
  })
})

describe('test applyLock', () => {
  it('should set ttl to lock if ttl is greater than 0 and lock is new', async () => {
    const client = {
      setNX: jest.fn(async () => true),
      expire: jest.fn(async (key, payload) => {})
    } as unknown as RedisClient
    const l1 = new Lock(client)
    const lockApplied = await l1.applyLock('beer', 'tasty', 69)
    expect(lockApplied).toEqual(true)
    expect(client.expire).toHaveBeenCalled()
    expect(client.expire).toHaveBeenCalledWith('beer', 69)
  })

  it('should not add ttl if ttl is 0 (infinite ttl)', async () => {
    const client = {
      setNX: jest.fn(async () => true),
      expire: jest.fn(async (key, payload) => { })
    } as unknown as RedisClient
    const l1 = new Lock(client)
    const lockApplied = await l1.applyLock('beer', 'tasty', 0)
    expect(lockApplied).toEqual(true)
    expect(client.expire).not.toHaveBeenCalled()
  })

  it('should not add ttl to existing lock', async () => {
    const client = {
      setNX: jest.fn(async () => false),
      expire: jest.fn(async (key, payload) => { })
    } as unknown as RedisClient
    const l1 = new Lock(client)
    const lockApplied = await l1.applyLock('beer', 'tasty', 1337)
    expect(lockApplied).toEqual(false)
    expect(client.expire).not.toHaveBeenCalled()
  })
})

describe('test releaseLock', () => {
  it('should delete redisKey with prefix', async () => {
    const client = {
      del: jest.fn(async (key) => { })
    } as unknown as RedisClient
    const l1 = new Lock(client)
    const expectedKey = l1.getRedisKey('gunna')
    await l1.releaseLock('gunna')
    expect(client.del).toHaveBeenCalled()
    expect(client.del).toHaveBeenCalledWith(expectedKey)
  })
})
