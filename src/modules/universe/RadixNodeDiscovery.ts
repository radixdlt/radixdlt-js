import RadixNode from './RadixNode'

export default interface RadixNodeDiscovery {
    loadNodes: () => Promise<RadixNode[]>
}
