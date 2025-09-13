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
        if (left === right) {
            return;
        }

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

    find(node: Node): Node {
        for (const set of this.sets) {
            if (set.has(node)) {
                return [...set][0]; // will be consistent because sets are ordered
            }
        }

        this.sets.push(ImmutableSet([node]));
        return node;
    }

    nodes() {
        return Iterator.from(this.sets.values())
            .flatMap((nodes) => nodes)
            .toArray();
    }
}
