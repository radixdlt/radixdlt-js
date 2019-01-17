import { TSMap } from 'typescript-map'

import * as jsonrpc from 'jsonrpc-lite'

export default class JsonRpcServer {

    private handlers: TSMap<string, ((params: any, ws: any) => Promise<any>)> = new TSMap()

    constructor(readonly wss) {
        wss.on('connection', (ws) => {
            ws.on('message', this.onMessage(ws))
        })
    }

    public register(method: string, handler: ((params: any, ws: any) => Promise<any>)): void {
        this.handlers.set(method, handler)
    }

    public onMessage = ws => async (message) => {

        // Parse message
        const parsedRequest = jsonrpc.parse(message)

        if (Array.isArray(parsedRequest)) {
            const promises = []

            for (const requestObj of parsedRequest) {
                promises.push(this.handleRequest(requestObj, ws))
            }

            Promise.all(promises).then((responses) => {
                ws.send(JSON.stringify(responses.filter(response => response)))
            })
        } else {
            const response = await this.handleRequest(parsedRequest, ws)

            if (response) {
                ws.send(JSON.stringify(response))
            }
        }

    }

    public handleRequest = async (requestObj, ws) => {
        if (requestObj.type === 'invalid') {
            return jsonrpc.JsonRpcError.invalidRequest('Invalid Request')
        } else if (requestObj.type === 'request') {

            // Find handler or error
            if (!this.handlers.has(requestObj.payload.method)) {
                return jsonrpc.JsonRpcError.methodNotFound('Method not found')
            }

            const handler = this.handlers.get(requestObj.payload.method)

            try {
                // Await handler
                const result = await handler(requestObj.payload.params, ws)

                // Send response
                return jsonrpc.success(requestObj.payload.id, result)
            } catch (err) {
                return jsonrpc.error(requestObj.payload.id, jsonrpc.JsonRpcError.internalError(err.message))
            }
        }

        return null
    }
}
