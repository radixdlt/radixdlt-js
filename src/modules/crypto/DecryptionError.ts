export default class DecryptionError extends Error {
    private constructor(readonly message: string) {
        super(message)
    }

    public static keyMismatch = new DecryptionError('Key mismatch')
    public static macMismatch = new DecryptionError('Mac mismatch')
    public static failedToDeccodePubKeyPoint = new DecryptionError('Failed to decode public key point')

}
