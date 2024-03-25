import { RedisLockOptions } from "./redis-lock";

export const DEFAULT_LOCK_PREFIX = 'lock';

export const getDefaultOptions = (): RedisLockOptions => ({
  clientName: '',
  prefix: DEFAULT_LOCK_PREFIX,
});
