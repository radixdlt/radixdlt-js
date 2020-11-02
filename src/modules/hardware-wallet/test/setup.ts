import { radixUniverse, RadixUniverse, RadixSimpleIdentity, RadixAddress, RRI, RadixIdentity } from 'radixdlt'
import { TokenData } from './utils'
import 'mocha'

export let alice: RadixIdentity
export let bob: RadixIdentity
export let clara: RadixIdentity
export let diana: RadixIdentity
export let hal: RadixIdentity

export let token: TokenData

export const setupFinished = new Promise((resolve, reject) => {
    doneResolve = resolve
})

let doneResolve

(async () => {
    try {
        await radixUniverse.bootstrapTrustedNode(RadixUniverse.LOCAL_SINGLE_NODE)
    } catch (e) {
        throw new Error(
            `Failed to bootstrap universe. A local node needs to 
                be running to run these tests.
                ${e.message}`,
        )
    }

    alice = new RadixSimpleIdentity(RadixAddress.fromAddress('JEyoKNEYawJkNTiinQh1hR9c3F57ANixyBRi9fsSEfGedumiffR'))
    bob = new RadixSimpleIdentity(RadixAddress.fromAddress('JFeqmatdMyjxNce38w3pEfDeJ9CV6NCkygDt3kXtivHLsP3p846'))
    clara = new RadixSimpleIdentity(RadixAddress.fromAddress('JG3Ntbhj144hpz2ZooKsQG3Hq7UkCMwmFMwXfaYQgKFzNXAQvo5'))
    diana = new RadixSimpleIdentity(RadixAddress.fromAddress('JFtJPDGvw4NDQyqCk7P5pWudNMeT8TFGCSvY9pTEqiyVhUGM9R9'))
    hal = new RadixSimpleIdentity(RadixAddress.fromAddress('JEWaBeWxn9cju3i6SA5A41FWkBUn8hvRYHCtPh26rCRnumyVCfP'))

    token = {
        rri: new RRI(alice.address, 'ZELDA'),
        availableAmount: 1000,
    }

    doneResolve()
})()
