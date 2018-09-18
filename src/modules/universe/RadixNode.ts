import {RadixBase64,
    } from '../atom_model'

export default interface RadixNode {
  attempts?: number
  hash?: string
  host: {
    ip: string
    port: number
  }
  id?: string
  protocols?: Array<string>
  serializer?: {
    class_id: number
  }
  statistics?: {
    duration: number
    traffic_in: number
    traffic_out: number
  }
  system?: {
    agent: string
    clock: number
    key: RadixBase64
    shards: {
      low: number
      high: number
    }
    period: 0
    port: 0
    serializer: {
      class_id: number
    }
    services: Array<any>
    version: {
      agent: number
      object: number
      protocol: number
    }
  }
  timestamps?: {
    active: number
    banned: number
    connected: number
    disconnected: number
  }
  version?: {
    object: number
  }
}
