import { createClient } from 'redis'

const packageName = 'redis-promise-lock'

export interface LockOptions {
  retryLimit: number
  retryDelay: number
  ttl: number
}

export type OptionalLockOptions = Partial<LockOptions>

type RedisClient = ReturnType<typeof createClient>

const sleep = async (ms: number): Promise<void> => await new Promise((resolve) => setTimeout(() => resolve(), ms))

/**
 * @module Lock Class
 */
export class Lock {
  private readonly client: RedisClient
  private readonly defaultRetryLimit: number = 10
  private readonly defaultRetryDelay: number = 100
  private readonly defaultTtl: number = 3

  /**
   * Lock Instance
   *
   * Default options object:
   * - options.retryLimit   number of times lock is trying to be set before bailing out (default: 10)
   * - options.retryDelay   amount of time in ms to wait between retries (default: 100)
   * - options.ttl          ttl of the lock to be set in redis before its removed by redis itself in seconds (default: 3)
   *
   * @param {RedisClient} redisClient     a promise based redis client (default in v4.x)
   * @param {Object} options              [default values for lock instance]
   */
  constructor (redisClient: RedisClient, options: OptionalLockOptions = {}) {
    if (redisClient === undefined) throw new Error(`[${packageName}] - No redisClient provided.`)
    this.client = redisClient
    const defaultOptions = this.getOptions(options)
    this.defaultRetryLimit = defaultOptions.retryLimit
    this.defaultRetryDelay = defaultOptions.retryDelay
    this.defaultTtl = defaultOptions.ttl
  }

  /**
   * Validates lockName and returns a redis key with a prefix
   * @param lockName part of redis key after the prefix
   * @returns the prefix:lockName as combined string
   */
  public getRedisKey (lockName: string): string {
    if (typeof lockName !== 'string' || lockName.length === 0) throw new Error(`[${packageName}] - Invalid lockName provided! Must be a non empty string.`)
    return `${packageName}:${lockName}`
  }

  /**
   * Validates and merges LockOptions with default values if no overrides specified
   * @param lockSpecificOptions optional overrides of default lock options
   * @returns merged LockOptions, falls back to default if no OptionalLockOptions provided
   */
  public getOptions (lockSpecificOptions: OptionalLockOptions = {}): LockOptions {
    const options = { // use default if no lock-specific stuff
      retryLimit: lockSpecificOptions.retryLimit !== undefined ? lockSpecificOptions.retryLimit : this.defaultRetryLimit,
      retryDelay: lockSpecificOptions.retryDelay !== undefined ? lockSpecificOptions.retryDelay : this.defaultRetryDelay,
      ttl: lockSpecificOptions.ttl !== undefined ? lockSpecificOptions.ttl : this.defaultTtl
    }

    if (!(typeof options.retryLimit === 'number' && options.retryLimit > 0)) throw new Error(`[${packageName}] - Invalid retryLimit provided! Must be a number greater than 0.`)
    if (!(typeof options.retryDelay === 'number' && options.retryDelay > 0)) throw new Error(`[${packageName}] - Invalid retryDelay provided! Must be a number greater than 0.`)
    if (!(typeof options.ttl === 'number' && options.ttl >= 0)) throw new Error(`[${packageName}] - Invalid ttl provided! Must be a number greater than or equal to 0.`)

    return options
  }

  /**
   * Creates a lock with optional TTL if not already existing
   * @param key the key where the lock will be stored in redis
   * @param payload generic entry of when the lock was created. not used, just here because redis needs a value on set
   * @param ttl maximum amount of time the lock lives in redis - infinite if 0
   * @returns boolean whether lock has been applied or not
   */
  public async applyLock (key: string, payload: string, ttl: number): Promise<boolean> {
    const lockApplied = await this.client.setNX(key, payload) as unknown as boolean
    // We check for lockApplied so existing Lock ttl does not get extended - see acquireLock loop
    if (ttl !== 0 && lockApplied) {
      await this.client.expire(key, ttl)
    }
    return lockApplied
  }

  /**
   * Deletes the lock from redis
   * @param lockName part of redis key after the prefix
   */
  public async releaseLock (lockName: string): Promise<void> {
    const key = this.getRedisKey(lockName)
    await this.client.del(key)
  }

  /**
   * Tries to acquire a lock
   *
   * - If a lock already exists, tries again X (lockSpecificOptions.retryLimit) times
   * - Waits Y ms (lockSpecificOptions.retryDelay) between tries
   * - Sets a ttl (lockSpecificOptions.ttl) on the lock if it could be acquired
   *
   * @param lockName part of redis key after the prefix
   * @param lockSpecificOptions optional overrides of default lock options
   * @returns boolean whether lock has been applied or not
   */
  public async acquireLock (lockName: string, lockSpecificOptions: OptionalLockOptions = {}): Promise<boolean> {
    const { retryLimit, retryDelay, ttl } = this.getOptions(lockSpecificOptions)

    const key = this.getRedisKey(lockName)
    const payload = JSON.stringify({ lockedSince: (new Date()).toISOString() })
    let lockApplied = await this.applyLock(key, payload, ttl)

    let counter = 0
    while (!lockApplied && counter < retryLimit) {
      await sleep(retryDelay)
      lockApplied = await this.applyLock(key, payload, ttl)
      counter++
    }

    return lockApplied
  }
}

export default Lock
