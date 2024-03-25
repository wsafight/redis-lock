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
  /** 锁的值 */
  lockVal: string;
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
  name: string;
  lockVal: string;
}

export interface RedisExpireParams {
  name: string;
  lockVal: string;
  time: number;
}

export interface RedisService {
  getClient: (name?: string) => any;
}
