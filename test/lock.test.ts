// @ts-nocheck
import { Lock } from '../src/lock'
import { createClient } from 'redis'
const client = createClient({
  url: 'redis://127.0.0.1:6379'
})

const packageName = 'redis-promise-lock'

const defaultRetryLimit = 10
const defaultRetryDelay = 1000
const defaultTtl = 3

describe('test initialization of class', () => {

  it('should crash without valid redis instance', () => {
    expect(() => { new Lock(undefined) }).toThrowError(`[${packageName}] - No redisClient provided.`)
  })

  it('should create redis instance', () => {
    expect(() => { new Lock(client) }).not.toThrowError()
  })

  it('should override default options if provided', () => {

    const l1 = new Lock(client)
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
    const l2 = new Lock(client, overriddenOptions)
    expect(l2.getOptions()).toEqual(overriddenOptions)

  })
  
})