import log from 'loglevel'

export default class RadixLogger {
  // 'trace', 'debug', 'info', 'warn', 'error'
  public static setLevel(level: string): void {
    log.setLevel(level)
  }
}

export const logger = log
