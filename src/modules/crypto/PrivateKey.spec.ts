import { expect } from 'chai'
import 'mocha'

// tslint:disable:max-line-length

import PrivateKey from './PrivateKey'
import { RadixECSignature, sha256ByUTF8EncodingText } from '../..'

describe(`PrivateKey`, () => {
    describe(`ECDSA signatures`, () => {
        describe('RFC6979', function() {

            const verifyRFC6979 = (
                privateKeyHex: string,
                messageToUTF8EncodeAndThenSHA256Hash: string,
                kHex: string,
                expectedSignatureDERHex: string,
            ): void => {

                const privateKey = PrivateKey.from(privateKeyHex)
                const messageHashed = sha256ByUTF8EncodingText(messageToUTF8EncodeAndThenSHA256Hash)
                const signature = privateKey.sign(messageHashed)

                const importedSignature = RadixECSignature.fromDER(expectedSignatureDERHex)

                expect(signature.equals(importedSignature)).to.be.true

                const publicKey = privateKey.publicKey()

                expect(
                    publicKey.verifyThatSigningDataWithThisKeyProducesSignature(
                        messageHashed,
                        signature,
                    ),
                ).to.be.true
            }


            it(`should match expected test vector 1`, () => {
                verifyRFC6979(
                    'cca9fbcc1b41e5a95d369eaa6ddcff73b61a4efaa279cfc6567e8daa39cbaf50',
                    'sample',
                    '2df40ca70e639d89528a6b670d9d48d9165fdc0febc0974056bdce192b8e16a3',
                    '3045022100af340daf02cc15c8d5d08d7735dfe6b98a474ed373bdb5fbecf7571be52b384202205009fb27f37034a9b24b707b7c6b79ca23ddef9e25f7282e8a797efe53a8f124',
                )
            })

            it(`should match expected test vector 2`, () => {
                verifyRFC6979(
                    '0000000000000000000000000000000000000000000000000000000000000001',
                    'Satoshi Nakamoto',
                    '8f8a276c19f4149656b280621e358cce24f5f52542772691ee69063b74f15d15',
                    '3045022100934b1ea10a4b3c1757e2b0c017d0b6143ce3c9a7e6a4a49860d7a6ab210ee3d802202442ce9d2b916064108014783e923ec36b49743e2ffa1c4496f01a512aafd9e5',
                )
            })

            it(`should match expected test vector 3`, () => {
                verifyRFC6979(
                    'fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364140',
                    'Satoshi Nakamoto',
                    '33a19b60e25fb6f4435af53a3d42d493644827367e6453928554f43e49aa6f90',
                    '3045022100fd567d121db66e382991534ada77a6bd3106f0a1098c231e47993447cd6af2d002206b39cd0eb1bc8603e159ef5c20a5c8ad685a45b06ce9bebed3f153d10d93bed5',
                )
            })

            it(`should match expected test vector 4`, () => {
                verifyRFC6979(
                    'f8b8af8ce3c7cca5e300d33939540c10d45ce001b8f252bfbc57ba0342904181',
                    'Alan Turing',
                    '525a82b70e67874398067543fd84c83d30c175fdc45fdeee082fe13b1d7cfdf1',
                    '304402207063ae83e7f62bbb171798131b4a0564b956930092b33b07b395615d9ec7e15c022058dfcc1e00a35e1572f366ffe34ba0fc47db1e7189759b9fb233c5b05ab388ea',
                )
            })

            it(`should match expected test vector 5`, () => {
                verifyRFC6979(
                    '0000000000000000000000000000000000000000000000000000000000000001',
                    'All those moments will be lost in time, like tears in rain. Time to die...',
                    '38aa22d72376b4dbc472e06c3ba403ee0a394da63fc58d88686c611aba98d6b3',
                    '30450221008600dbd41e348fe5c9465ab92d23e3db8b98b873beecd930736488696438cb6b0220547fe64427496db33bf66019dacbf0039c04199abb0122918601db38a72cfc21',
                )
            })

            it(`should match expected test vector 6`, () => {
                verifyRFC6979(
                    'e91671c46231f833a6406ccbea0e3e392c76c167bac1cb013f6f1013980455c2',
                    "There is a computer disease that anybody who works with computers knows about. It's a very serious disease and it interferes completely with the work. The trouble with computers is that you 'play' with them!",
                    '1f4b84c23a86a221d233f2521be018d9318639d5b8bbd6374a8a59232d16ad3d',
                    '3045022100b552edd27580141f3b2a5463048cb7cd3e047b97c9f98076c32dbdf85a68718b0220279fa72dd19bfae05577e06c7c0c1900c371fcd5893f7e1d56a37d30174671f6',
                )
            })
        })

        describe(`By hashing seed`, () => {

            it('different addresses from same string seed has same private key', () => {
                const seed = Buffer.from('deadbeef', 'hex')
                const key1 = PrivateKey.importByHashingSeed(seed)
                const key2 = PrivateKey.importByHashingSeed(seed)
                expect(key1.toBuffer()).to.deep.equal(key2.toBuffer())
            })

            it('different addresses from same int-array seed has same private key', () => {
                const seed = [0x62, 0x75, 0x66, 0x66, 0x65, 0x72]
                const key1 = PrivateKey.importByHashingSeed(seed)
                const key2 = PrivateKey.importByHashingSeed(seed)
                expect(key1.toBuffer()).to.deep.equal(key2.toBuffer())
            })

        })
    })
})
