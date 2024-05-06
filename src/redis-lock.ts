export class RedisLock {
  isStop: boolean = false;

  readonly key: string;

  readonly value: string;

  constructor({ key, value }: { key: string; value: string }) {
    this.key = key;
    this.value = value;
  }

  getIsStop() {
    return this.isStop;
  }

  stop() {
    this.isStop = true;
  }
}
