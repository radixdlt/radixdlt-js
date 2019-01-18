import { TSMap } from 'typescript-map'

import * as crypto from 'crypto'

export class AuthSystem {

    private dapps: TSMap<string, any> = new TSMap()

    public async register(appInfo): Promise<string> {
        const token = crypto.randomBytes(128).toString('hex')

        const appEntry = {
            _id: token,
            token,
            name: appInfo.name,
            description: appInfo.description,
            permissions: appInfo.permissions,

            created_at: new Date(),
            expires: new Date(Date.now() + 30 * 60 * 1000), // 30min
        }

        this.dapps.set(token, appEntry)

        return token
    }

    public async authenticate(token: string, perms: string[]): Promise<boolean> {
        const appInfo = this.dapps.get(token)

        if (!appInfo) {
            throw new Error('Invalid token')
        }

        // Check expiration dates
        const timeDiff = Date.now() - appInfo.expires
        if (timeDiff > 0) {
            throw new Error('Token expired')
        }

        // Check if all permissions are allowed
        for (const perm of perms) {
            if (appInfo.permissions.indexOf(perm) < 0) {
                throw new Error(`Permission '${perm}' not granted`)
            }
        }

        // Refresh expiraton
        appInfo.expires = new Date(Date.now() + 30 * 60 * 1000) // 30min

        this.dapps.set(token, appInfo)

        return true
    }
}

export default new AuthSystem()
