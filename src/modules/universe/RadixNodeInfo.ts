import { RadixBytes, RadixEUID } from '../atommodel';

export default interface RadixNodeInfo {
    hid: RadixEUID,
    host: {
        ip: string
        port: number
    }
    protocols?: Array<string>
    serializer?: {
        class_id: number
    }
    system?: {
        agent: string
        clock: number
        key: RadixBytes
        shards: {
            anchor: number,
            serializer: string,
            range: {
                low: number,
                high: number,
                serializer: string,
            },
        }
        planck: 0
        port: 0
        serializer: string
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
