import RadixPOW from './RadixPOW'

export default class RadixPOWTask {
    pow: RadixPOW

    constructor(
        readonly magic: number,
        readonly seed: Buffer,
        readonly target: Buffer
    ) {
        this.pow = new RadixPOW(magic, seed)
        console.log(target.toString('hex'))
    }

    computePow() {
        return new Promise<RadixPOW>((resolve, reject) => {
            this.attemptPow(resolve)
        })
    }

    // attemptPow(callback: Function) {
    //    const hash = this.pow.getHash()
    //    if (this.meetsTarget(hash)) {
    //        console.log(hash.toString('hex'))
    //        callback(this.pow)
    //    }
    //    else {
    //        this.pow.incrementNonce()

    //        // Non-blocking
    //        setTimeout(() => {
    //            this.attemptPow(callback)
    //        }, 0)
    //    }
    // }

    attemptPow(callback: Function) {
        for (let i = 0; i < 100; i++) {
            this.pow.incrementNonce()
            const hash = this.pow.getHash()

            if (this.meetsTarget(hash)) {
                console.log(hash.toString('hex'))

                setTimeout(() => {
                    callback(this.pow)
                })

                return
            }
        }

        // Non-blocking
        setTimeout(() => {
            this.attemptPow(callback)
        }, 0)
    }

    meetsTarget(hash: Buffer) {
        return hash.compare(this.target) < 0
    }
}
