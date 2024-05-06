/**
 * 加锁
 * 返回 1 代表加锁成功
 * 返回 0 代表加锁失败
 */
export const LUA_LOCK =
  "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('pexpire', KEYS[1], ARGV[2]) else return redis.call('set', KEYS[1], ARGV[1], 'NX', 'PX', ARGV[2]) end";

/**
 * 解锁
 * 返回 0 代表解锁失败，可能是锁已经过期（不存在），或者锁的值不匹配
 * 返回 1 代表解锁成功
 **/
export const LUA_UNLOCK =
  "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";

/**
 * 续约
 * 返回 0 代表续约失败，可能是锁已经过期（不存在），或者锁的值不匹配
 * 返回 1 代表续约成功
 */
export const LUA_REFRESH =
  "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('pexpire', KEYS[1], ARGV[2]) else return 0 end";
