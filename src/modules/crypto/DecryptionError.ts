export default class DecryptionError extends Error {
    private constructor(readonly message: string) {
        super(message)
    }

    public static keyMismatch = new DecryptionError('Key mismatch')
    public static macMismatch = new DecryptionError('Mac mismatch')

}
