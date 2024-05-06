import { RedisLockService } from './redis-lock-service';
import { RedisLock } from './redis-lock';

export type {
  CommonRedisLockResult,
  RedisExpireParams,
  RedisLockOnceParams,
  RedisLockOptions,
  RedisLockParams,
  RedisLockResult,
  RedisService,
  RedisUnLockParams,
} from './type';

export { RedisLockService, RedisLock };

export default RedisLockService;
