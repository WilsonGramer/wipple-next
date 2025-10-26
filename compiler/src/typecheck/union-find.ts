import { Node } from "../db";

export class UnionFind {
    private sets: Set<Node>[] = [];

    constructor(other?: UnionFind) {
        this.sets = other?.sets.map((set) => new Set(set)) ?? [];
    }

    union(left: Node, right: Node) {
        const toUnify = new Set<Node>();
        const toKeep: Set<Node>[] = [];
        for (const set of this.sets) {
            if (set.has(left) || set.has(right)) {
                for (const node of set) {
                    toUnify.add(node);
                }

                toUnify.add(left);
                toUnify.add(right);
            } else {
                toKeep.push(set);
            }
        }

        this.sets = [...toKeep, toUnify];
    }

    findAll(node: Node) {
        for (const set of this.sets) {
            if (set.has(node)) {
                return set.values();
            }
        }

        return undefined;
    }

    tryFind(node: Node) {
        return this.findAll(node)?.next().value;
    }

    find(node: Node) {
        const representative = this.tryFind(node);
        if (representative != null) {
            return representative;
        } else {
            this.sets.push(new Set([node]));
            return node;
        }
    }

    nodes() {
        return Iterator.from(this.sets.values())
            .flatMap((set) => set)
            .toArray();
    }
}
