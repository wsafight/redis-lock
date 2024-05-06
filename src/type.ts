import { RedisLock } from './redis-lock';

export interface RedisLockOptions {
  clientName?: string;
  prefix?: string;
}

export interface CommonRedisLockResult {
  /** 是否成功 */
  isSuccess: boolean;
  /** 错误原因 */
  errReason?: string;
}

export interface RedisLockResult extends CommonRedisLockResult {
  /** 锁 */
  lock: RedisLock;
}

export interface RedisLockOnceParams {
  name: string;
  expire: number;
  lockVal?: string;
}

export interface RedisLockParams extends RedisLockOnceParams {
  maxRetryTimes: number;
  retryInterval: number;
}

export interface RedisUnLockParams {
  lock: RedisLock;
}

export interface RedisExpireParams {
  lock: RedisLock;
  time: number;
}

export interface RedisService {
  getClient: (name?: string) => any;
}
