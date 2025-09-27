import { Set as ImmutableSet, List as ImmutableList } from "immutable";
import { Node } from "../db";

export class UnionFind {
    private sets = ImmutableList<ImmutableSet<Node>>();

    static from(other: UnionFind) {
        const unionFind = new UnionFind();
        unionFind.sets = ImmutableList(other.sets);
        return unionFind;
    }

    union(left: Node, right: Node) {
        const toUnify: ImmutableSet<Node>[] = [];
        const toKeep: ImmutableSet<Node>[] = [];
        for (const set of this.sets) {
            if (set.has(left) || set.has(right)) {
                toUnify.push(set);
            } else {
                toKeep.push(set);
            }
        }

        const union = toUnify.reduce(
            (result, set) => result.union(set),
            ImmutableSet([left, right]),
        );

        this.sets = ImmutableList([...toKeep, union]);
    }

    tryFind(node: Node) {
        const result: Node[] = [];
        for (const set of this.sets) {
            if (set.has(node)) {
                result.push([...set][0]); // will be consistent because sets are ordered
            }
        }

        if (result.length > 1) {
            throw new Error("node belongs to multiple sets");
        }

        return result[0];
    }

    find(node: Node) {
        const representative = this.tryFind(node);
        if (representative != null) {
            return representative;
        } else {
            this.sets = this.sets.push(ImmutableSet([node]));
            return node;
        }
    }

    nodes() {
        return Iterator.from(this.sets.values())
            .flatMap((nodes) => nodes)
            .toArray();
    }
}
