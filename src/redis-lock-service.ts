import {
  CommonRedisLockResult,
  RedisExpireParams,
  RedisLockOnceParams,
  RedisLockOptions,
  RedisLockParams,
  RedisLockResult,
  RedisService,
  RedisUnLockParams,
} from './type';
import { DEFAULT_LOCK_PREFIX, getDefaultOptions } from './constants';
import { generateUid, sleep } from './utils';
import { LUA_LOCK, LUA_REFRESH, LUA_UNLOCK } from './lua-scripts';
import { to } from './to';
import { RedisLock } from './redis-lock';

export class RedisLockService {
  static generateUid(): string {
    return generateUid();
  }

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

  public async lockOnce({
    name,
    expire,
    lockVal = RedisLockService.generateUid(),
  }: RedisLockOnceParams): Promise<RedisLockResult> {
    const { client, finalName } = this.getRedisQueryParams(name);

    // 必须要设置过期时间，如果没有过期时间，原本加锁的实例崩溃后，永远不会解锁
    const [err, result] = await to(
      client.set(finalName, lockVal, 'PX', expire, 'NX'),
    );

    const lock = new RedisLock({
      key: finalName,
      value: lockVal,
    });

    // 出错了，直接返回失败
    if (err) {
      return {
        isSuccess: false,
        lock,
        errReason: err?.message,
      };
    }
    // 返回 null 代表锁已经存在
    if (result === null) {
      return {
        isSuccess: false,
        lock,
        errReason: 'lock already exist',
      };
    }

    return {
      isSuccess: true,
      lock,
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
      const { isSuccess, lock: finalLock } = await this.lockOnce({
        name,
        expire,
        lockVal,
      });

      // 成功了，直接返回
      if (isSuccess) {
        return {
          isSuccess: true,
          lock: finalLock,
        };
      } else {
        await sleep(retryInterval);
        if (retryTimes >= maxRetryTimes) {
          return {
            isSuccess: false,
            lock: finalLock,
          };
        }
        retryTimes++;
      }
    }
  }

  /**
   * 要注意一个问题，如果 redis 操作超时
   * 下一次再次执行 lockOnce 会出错,所以不能简单的使用 lockOnce
   */
  public async safeLock({
    name,
    expire = 60 * 1000,
    retryInterval = 100,
    maxRetryTimes = 600,
    lockVal = RedisLockService.generateUid(),
  }: RedisLockParams): Promise<RedisLockResult> {
    let retryTimes = 0;

    const { client, finalName } = this.getRedisQueryParams(name);

    const finalLock = new RedisLock({
      key: finalName,
      value: lockVal,
    });

    while (true) {
      // 如果上一次加锁成功，但是执行失败了，这时候续约相同的秒数（需要考虑一下）
      const [, result] = await to(
        client.eval(LUA_LOCK, 1, finalName, lockVal, expire),
      );

      // 成功了，直接返回
      if (result === 1) {
        return {
          isSuccess: true,
          lock: finalLock,
        };
      } else {
        await sleep(retryInterval);
        if (retryTimes >= maxRetryTimes) {
          return {
            isSuccess: false,
            lock: finalLock,
          };
        }
        retryTimes++;
      }
    }
  }

  public async unlock({
    lock,
  }: RedisUnLockParams): Promise<CommonRedisLockResult> {
    const { key: lockKey, value: lockVal } = lock ?? {};

    if (!lockKey || !lockVal) {
      return {
        isSuccess: false,
        errReason: 'lockKey or lockVal is empty',
      };
    }

    // 如果锁已经停止，直接返回
    if (lock.getIsStop()) {
      return {
        isSuccess: false,
        errReason: 'lock is stop',
      };
    }

    const client = this.getClient();

    // 确保这把锁是自己的，同时保证原子性，使用 lua 脚本来解锁
    const [err, result] = await to(
      client.eval(LUA_UNLOCK, 1, lockKey, lockVal),
    );

    // 不管有没有错误，停止这把锁
    lock.stop();

    if (err) {
      return {
        isSuccess: false,
        // 错误原因
        errReason: err?.message,
      };
    }
    // 返回 0 代表解锁失败，可能是锁已经过期（不存在），或者锁的值不匹配
    if (result === 0) {
      return {
        isSuccess: false,
        errReason: 'lockVal not match or lock not exist',
      };
    }
    return {
      isSuccess: true,
    };
  }

  /**
   * 手动续约尽量不要用，写这个代码只是为了演示续约
   * 问题如下：
   * 1.间隔多久续约一次？如果续约太频繁，会增加 redis 的压力，如果续约太慢，可能会导致锁过期
   * 2.续约失败怎么办？如果续约失败，可能是锁已经过期，或者锁的值不匹配，这时候应该怎么处理？
   * 3.如果续约失败，如何中断业务逻辑？
   */
  public async pexpire({
    lock,
    time,
  }: RedisExpireParams): Promise<CommonRedisLockResult> {
    const { key: lockKey, value: lockVal } = lock ?? {};

    if (!lockKey || !lockVal) {
      return {
        isSuccess: false,
        errReason: 'lockKey or lockVal is empty',
      };
    }

    // 如果锁已经停止，直接返回
    if (lock.getIsStop()) {
      return {
        isSuccess: false,
        errReason: 'lock is stop',
      };
    }

    const client = this.getClient();

    const [err, result] = await to(
      client.eval(LUA_REFRESH, 1, lockKey, lockVal, time),
    );

    if (err) {
      return {
        isSuccess: false,
        errReason: err?.message,
      };
    }

    // 返回 0 代表解锁失败，可能是锁已经过期（不存在），或者锁的值不匹配
    if (result === 0) {
      return {
        isSuccess: false,
        errReason: 'lockVal not match or lock not exist',
      };
    }

    return {
      isSuccess: true,
    };
  }

  // 自动续约，不建议使用，因为这个方法会一直续约，直到解锁
  public async autoRefresh({
    lock,
    time,
    interval = 100,
  }: RedisExpireParams & {
    interval?: number;
  }): Promise<CommonRedisLockResult> {
    const { key: lockKey, value: lockVal, isStop } = lock ?? {};

    if (!lockKey || !lockVal) {
      return {
        isSuccess: false,
        errReason: 'lockKey or lockVal is empty',
      };
    }

    while (true) {
      if (isStop) {
        return {
          isSuccess: false,
          errReason: 'stop',
        };
      }
      const { isSuccess, errReason } = await this.pexpire({ lock, time });
      if (!isSuccess) {
        // 如果错误等于 deadlineExceeded，代表 redis 执行超时
        if (errReason === 'deadlineExceeded') {
          // 立即重试
          continue;
        } else {
          // 其他错误，直接返回
          return {
            isSuccess: false,
            errReason,
          };
        }
      } else {
        // 续约成功，等待 interval 后继续续约
        await sleep(interval);
      }
    }
  }
}
