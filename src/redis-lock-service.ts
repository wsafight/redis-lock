import {
  CommonRedisLockResult,
  RedisExpireParams,
  RedisLockOnceParams,
  RedisLockOptions,
  RedisLockParams,
  RedisLockResult,
  RedisService,
  RedisUnLockParams,
} from './redis-lock';
import { DEFAULT_LOCK_PREFIX, getDefaultOptions } from './constants';
import { generateUid, sleep } from './utils';

export class RedisLockService {
  protected readonly redisService: RedisService;

  protected readonly options: RedisLockOptions;

  constructor(redisService: RedisService, options: RedisLockOptions) {
    this.redisService = redisService;
    this.options = {
      ...getDefaultOptions(),
      ...options,
    };
  }

  protected prefix(name: string): string {
    const { prefix = DEFAULT_LOCK_PREFIX } = this.options;
    return prefix ? `${prefix}:${name}` : `${DEFAULT_LOCK_PREFIX}:${name}`;
  }

  protected getClient(): any {
    const { clientName } = this.options;
    return clientName
      ? this.redisService.getClient(clientName)
      : this.redisService.getClient();
  }

  protected getRedisQueryParams(name: string) {
    return {
      client: this.getClient(),
      finalName: this.prefix(name),
    };
  }

  static generateUid(): string {
    return generateUid();
  }

  public async lockOnce({
    name,
    expire,
    lockVal = RedisLockService.generateUid(),
  }: RedisLockOnceParams): Promise<RedisLockResult> {
    const { client, finalName } = this.getRedisQueryParams(name);

    const result = await client.set(finalName, lockVal, 'PX', expire, 'NX');
    return {
      isSuccess: result !== null,
      lockVal,
    };
  }

  public async lock({
    name,
    expire = 60 * 1000,
    retryInterval = 100,
    maxRetryTimes = 600,
    lockVal = RedisLockService.generateUid(),
  }: RedisLockParams): Promise<RedisLockResult> {
    let retryTimes = 0;
    while (true) {
      const { lockVal: finalLockVal, isSuccess } = await this.lockOnce({
        name,
        expire,
        lockVal,
      });
      if (isSuccess) {
        return {
          isSuccess: true,
          lockVal: finalLockVal,
        };
      } else {
        await sleep(retryInterval);
        if (retryTimes >= maxRetryTimes) {
          return {
            isSuccess: false,
            lockVal: finalLockVal,
          };
        }
        retryTimes++;
      }
    }
  }

  public async unlock({
    name,
    lockVal,
  }: RedisUnLockParams): Promise<CommonRedisLockResult> {
    const { client, finalName } = this.getRedisQueryParams(name);
    const result = await client.eval(
      "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
      1,
      finalName,
      lockVal,
    );
    return {
      isSuccess: result === 1,
    };
  }

  public async pexpire({
    name,
    lockVal,
    time,
  }: RedisExpireParams): Promise<CommonRedisLockResult> {
    const { client, finalName } = this.getRedisQueryParams(name);
    // TODO 这里有问题，应该是 pexpire
    const result = await client.pexpire(finalName, time);
    return {
      isSuccess: result === 1,
    };
  }
}
