import RadixKeyPair from '../wallet/RadixKeyPair'

export default interface RadixContact {
  keyPair: RadixKeyPair
  address: string
  alias: string
}
