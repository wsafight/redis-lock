import { RedisLockService } from './redis-lock-service';

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

export { RedisLockService };

export default RedisLockService;
