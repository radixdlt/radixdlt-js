import log, { LogLevelDesc } from 'loglevel'

export default class RadixLogger {
  // 'trace', 'debug', 'info', 'warn', 'error'
  public static setLevel(level: LogLevelDesc): void {
    log.setLevel(level)
  }
}

export const logger = log
