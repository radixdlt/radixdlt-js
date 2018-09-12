export default interface RadixDecryptionProvider {
    decryptECIESPayload: (payload: Buffer) => Promise<Buffer>
}
