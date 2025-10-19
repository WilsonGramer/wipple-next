import { Map as ImmutableMap, List as ImmutableList } from "immutable";
import { UnionFind } from "./union-find";
import { Db, Node } from "../db";
import { Constraint, Constraints } from "./constraints";
import { traverseType, typeReferencesNode, typesAreEqual, Type } from "./constraints/type";

export class Solver {
    db: Db;
    private constraints = new Constraints();
    private unionFind = new UnionFind();
    private groups = ImmutableMap<Node, ImmutableList<Type>>();
    applyQueue: Map<Node, Type>[] = [];
    error = false;

    constructor(db: Db) {
        this.db = db;
    }

    static from(other: Solver) {
        const solver = new Solver(other.db);
        solver.replaceWith(other);
        return solver;
    }

    replaceWith(other: Solver) {
        this.unionFind = UnionFind.from(other.unionFind);
        this.groups = other.groups;
        this.applyQueue = other.applyQueue;
    }

    add(...constraints: Constraint[]) {
        this.constraints.add(...constraints);
    }

    run() {
        this.constraints.run(this);
    }

    unify(left: Type, right: Type) {
        if (left === right) {
            return;
        }

        const leftNode = left instanceof Node ? left : undefined;
        const rightNode = right instanceof Node ? right : undefined;

        if (leftNode != null && rightNode != null) {
            this.merge(leftNode, rightNode);
        }

        left = this.applyShallow(left);
        right = this.applyShallow(right);

        if (left instanceof Node && right instanceof Node) {
            // already merged groups above
        } else if (left instanceof Node) {
            this.insert(left, right);
        } else if (right instanceof Node) {
            this.insert(right, left);
        } else {
            if (left.tag === right.tag) {
                for (let i = 0; i < Math.min(left.children.length, right.children.length); i++) {
                    const leftChild = left.children[i];
                    const rightChild = right.children[i];
                    this.unify(leftChild, rightChild);
                }
            }

            if (left.tag !== right.tag || left.children.length !== right.children.length) {
                this.error = true;

                if (leftNode != null) {
                    this.insert(leftNode, left, right);
                }

                if (rightNode != null) {
                    this.insert(rightNode, left, right);
                }

                if (leftNode == null && rightNode == null) {
                    throw new Error("encountered conflict without any nodes");
                }
            }
        }
    }

    apply(type: Type) {
        return traverseType(type, (type) => this.applyShallow(type));
    }

    private applyShallow(type: Type) {
        if (type instanceof Node) {
            const representative = this.unionFind.find(type);
            return this.groups.get(representative)?.first() ?? representative;
        } else {
            return type;
        }
    }

    private insert(node: Node, ...types: Type[]) {
        const representative = this.unionFind.find(node);

        // Deduplicate types
        types = types
            .map((type) => this.apply(type))
            .reduce(
                (result, type) =>
                    result.every((other) => !typesAreEqual(type, other))
                        ? [...result, type]
                        : result,
                [] as Type[],
            );

        // Prevent recursive types
        types = types.filter((type) => !typeReferencesNode(type, representative));
        if (types.length === 0) {
            return;
        }

        if (!this.groups.has(representative)) {
            this.groups = this.groups.set(representative, ImmutableList(types));
        } else {
            let group = this.groups.get(representative)!;
            for (const type of types) {
                if (group.every((other) => !typesAreEqual(type, other))) {
                    group = group.push(type);
                }
            }

            this.groups = this.groups.set(representative, group);
        }
    }

    private merge(left: Node, right: Node) {
        const leftRepresentative = this.unionFind.find(left);
        const rightRepresentative = this.unionFind.find(right);

        this.unionFind.union(leftRepresentative, rightRepresentative);

        const rightTypes = this.groups.get(rightRepresentative);

        if (rightTypes != null) {
            this.groups = this.groups.delete(rightRepresentative);

            for (const type of rightTypes) {
                this.unify(leftRepresentative, type);
            }
        }
    }

    finish(): Group[] {
        for (const substitutions of this.applyQueue) {
            for (const [node, type] of substitutions) {
                substitutions.set(node, this.apply(type));
            }
        }

        const groups: Group[] = [];
        for (const [representative, types] of this.groups) {
            const group: Group = {
                nodes: [representative, ...this.unionFind.findAll(representative)],
                types:
                    types.size > 0
                        ? types.toArray().map((type) => this.apply(type))
                        : [representative],
            };

            groups.push(group);
        }

        for (const node of this.unionFind.nodes()) {
            if (!groups.some((group) => group.nodes.includes(node))) {
                groups.push({
                    nodes: [node],
                    types: [node],
                });
            }
        }

        for (const group of groups) {
            group.nodes.sort((a, b) => a.span.sort(b.span));
        }

        return groups;
    }
}

export interface Group {
    nodes: Node[];
    types: Type[];
}
