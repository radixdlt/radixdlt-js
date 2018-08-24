export default interface RadixSerializable {
    toJson(): {serializer: number | string}
    toByteArray(): Buffer
}
