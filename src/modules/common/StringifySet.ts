import { TSMap } from 'typescript-map'

export class StringifySet<T extends {toString(): string}> {
    private map: TSMap<string, T>
    
    constructor() {
        this.map = new TSMap()
    }

    public static of<T>(items: T[]) {
        const set = new this<T>()
        set.addAll(items)
        return set
    }

    public add(item: T) {
        this.map.set(item.toString(), item)
    }

    public addAll(items: T[]) {
        items.forEach(i => this.add(i))
    }

    public values() {
        return this.map.values()
    }

    public remove(item: T) {
        this.map.delete(item.toString())
    }
}
