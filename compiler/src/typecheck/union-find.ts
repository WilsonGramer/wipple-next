import { Set as ImmutableSet, List as ImmutableList } from "immutable";
import { Node } from "../db";

export class UnionFind {
    private sets = ImmutableList<[Node, ImmutableSet<Node>]>();

    static from(other: UnionFind) {
        const unionFind = new UnionFind();
        unionFind.sets = other.sets;
        return unionFind;
    }

    union(left: Node, right: Node) {
        const toUnify: ImmutableSet<Node>[] = [];
        const toKeep: [Node, ImmutableSet<Node>][] = [];
        for (const [setRepresentative, set] of this.sets) {
            if (set.has(left) || set.has(right)) {
                toUnify.push(set);
            } else {
                toKeep.push([setRepresentative, set]);
            }
        }

        const union = ImmutableSet([left, right]).union(...toUnify);

        // Make `left` (ie. a more recent node) the new representative. This
        // helps form better groups
        this.sets = ImmutableList([...toKeep, [left, union]]);
    }

    findAll(node: Node) {
        return (
            this.sets
                .map(([, set]) => set)
                .findEntry((set) => set.has(node))?.[1]
                .values() ?? Iterator.from([node])
        );
    }

    tryFind(node: Node) {
        const result: Node[] = [];
        for (const [representative, set] of this.sets) {
            if (set.has(node)) {
                result.push(representative);
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
            this.sets = this.sets.push([node, ImmutableSet([node])]);
            return node;
        }
    }

    nodes() {
        return Iterator.from(this.sets.values())
            .flatMap(([, nodes]) => nodes)
            .toArray();
    }
}
