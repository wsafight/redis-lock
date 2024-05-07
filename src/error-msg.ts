/** Redis 指令执行超时 */
export const COMMAND_TIMED_OUT = 'Command timed out';

/** 锁数据为空 */
export const LOCK_FIELD_EMPTY = 'lockKey or lockVal is empty';

/** 锁已经存在 */
export const LOCK_EXIST = 'lock already exist';

/** 锁已经停止 */
export const LOCK_STOP = 'The lock has stopped';

/** lockVal 不匹配或者锁不存在 */
export const LOCK_NOT_EXIST = 'lockVal not match or lock not exist';
