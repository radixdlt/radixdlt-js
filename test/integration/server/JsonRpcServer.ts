/*
 * (C) Copyright 2020 Radix DLT Ltd
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the “Software”),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */

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
