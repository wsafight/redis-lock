import { RedisLockOptions } from './type';

export const DEFAULT_LOCK_PREFIX = 'lock';

export const getDefaultOptions = (): RedisLockOptions => ({
  clientName: '',
  prefix: DEFAULT_LOCK_PREFIX,
});
