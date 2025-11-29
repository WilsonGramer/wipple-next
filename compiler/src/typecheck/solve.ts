import type { ConstructedType, Type } from ".";
import { traverseType, typeReferencesNode, typesAreEqual } from ".";
import type { Db } from "../db";
import { Node } from "../node";
import { ExpressionNode } from "../nodes/expressions";
import { PatternNode } from "../nodes/patterns";
import { Constraints } from "./constraints";
import type { Instance } from "./constraints/bound";
import type { Constraint } from "./constraints/constraint";

export class Solver {
    db: Db;
    private groups = new Map<Set<Node>, ConstructedType[]>();
    private cache = new Map<Node, Set<Node>>();
    constraints = new Constraints();
    impliedInstances: Instance[] = [];
    progress = false;
    error = false;

    constructor(db: Db) {
        this.db = db;
    }

    static from(other: Solver) {
        const solver = new Solver(other.db);
        solver.inherit(other);
        return solver;
    }

    inherit(other: Solver) {
        this.groups = new Map(
            other.groups.entries().map(([nodes, types]) => [new Set(nodes), [...types]]),
        );

        for (const set of this.groups.keys()) {
            for (const node of set) {
                this.cache.set(node, set);
            }
        }
    }

    add(...constraints: Constraint[]) {
        this.constraints.add(...constraints);
    }

    setGroup(group: Group) {
        const set = new Set(group.nodes);
        this.groups.set(set, group.types);
        for (const node of group.nodes) {
            this.cache.set(node, set);
        }
    }

    run() {
        while (true) {
            this.progress = false;
            this.runPassUntil(undefined);
            if (!this.progress) {
                break;
            }
        }

        this.runPassUntil(undefined);
    }

    runPassUntil<T extends abstract new (...args: any[]) => Constraint>(until: T | undefined) {
        this.constraints.runUntil(this, until);
    }

    imply(instance: Instance) {
        if (this.impliedInstances.every((existing) => existing.node !== instance.node)) {
            this.impliedInstances.push(instance);
        }
    }

    unify(left: Type, right: Type) {
        if (left === right) {
            return;
        }

        const leftNode = left instanceof Node ? left : undefined;

        const rightNode = right instanceof Node ? right : undefined;

        if (leftNode != null && rightNode != null) {
            this.merge(leftNode, rightNode);
            this.progress = true;
        }

        left = this.applyShallow(left);
        right = this.applyShallow(right);

        if (left instanceof Node && right instanceof Node) {
            // already merged groups above
        } else if (left instanceof Node) {
            this.insert(left, right);
            this.progress = true;
        } else if (right instanceof Node) {
            this.insert(right, left);
            this.progress = true;
        } else {
            if (left.tag === right.tag) {
                for (let i = 0; i < Math.min(left.children.length, right.children.length); i++) {
                    const leftChild = left.children[i];
                    const rightChild = right.children[i];

                    if (
                        typeReferencesNode(leftChild, leftNode, rightNode) ||
                        typeReferencesNode(rightChild, leftNode, rightNode)
                    ) {
                        // Recursive types
                        continue;
                    }

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
            }
        }
    }

    apply(type: Type) {
        return traverseType(type, (type) => this.applyShallow(type));
    }

    private applyShallow(type: Type): Type {
        if (type instanceof Node) {
            const set = this.cache.get(type);
            if (set == null) {
                return type;
            }

            const types = this.groups.get(set)!;
            return types.at(-1) ?? type;
        }

        return type;
    }

    groupOf(node: Node): Group | undefined {
        const set = this.cache.get(node);
        if (set == null) {
            return undefined;
        }

        const types = this.groups.get(set)!;
        return new Group(set, types);
    }

    private insert(node: Node, ...newTypes: Type[]) {
        const set = this.cache.get(node);
        if (set != null) {
            const types = this.groups.get(set)!;

            for (const type of newTypes) {
                if (type instanceof Node) {
                    set.add(type);
                } else {
                    types.push(type);
                }
            }

            return;
        }

        const groupSet = new Set<Node>([node]);
        const groupTypes: ConstructedType[] = [];
        for (const type of newTypes) {
            if (type instanceof Node) {
                groupSet.add(type);
            } else {
                groupTypes.push(type);
            }
        }

        this.groups.set(groupSet, groupTypes);
        for (const node of groupSet) {
            this.cache.set(node, groupSet);
        }
    }

    private merge(left: Node, right: Node) {
        const leftSet = this.cache.get(left);

        const leftGroup =
            leftSet != null ? new Group(leftSet, this.groups.get(leftSet)!) : Group.empty(left);

        if (leftSet != null) {
            this.groups.delete(leftSet);

            for (const node of leftGroup.nodes) {
                this.cache.delete(node);
            }
        }

        const rightSet = this.cache.get(right);

        const rightGroup =
            rightSet != null ? new Group(rightSet, this.groups.get(rightSet)!) : Group.empty(right);

        if (rightSet != null) {
            this.groups.delete(rightSet);

            for (const node of rightGroup.nodes) {
                this.cache.delete(node);
            }
        }

        const newSet = new Set([...leftGroup.nodes, ...rightGroup.nodes]);
        this.groups.set(newSet, leftGroup.types);
        for (const node of newSet) {
            this.cache.set(node, newSet);
        }

        for (const type of rightGroup.types) {
            this.unify(left, type);
        }
    }

    *toGroups() {
        for (let [nodes, types] of this.groups) {
            types = types.map((type) => this.apply(type) as ConstructedType);
            yield new Group(nodes, types).normalize();
        }
    }
}

export class Group {
    nodes: Node[];
    types: ConstructedType[];

    constructor(nodes: Iterable<Node>, types: Iterable<ConstructedType>) {
        this.nodes = Array.from(nodes);
        this.types = Array.from(types);
    }

    static empty(node: Node): Group {
        return new Group([node], []);
    }

    static from(other: Group): Group {
        return new Group(other.nodes, other.types);
    }

    normalize() {
        // Prefer showing patterns first, then expressions
        const compareKey = (node: Node) =>
            node instanceof PatternNode ? 0 : node instanceof ExpressionNode ? 1 : 2;

        this.nodes.sort((a, b) => compareKey(a) - compareKey(b));

        this.types = deduplicate(this.types, typesAreEqual);

        return this;
    }

    isEmpty(): boolean {
        return this.nodes.length <= 1 && this.types.length === 0;
    }
}

const deduplicate = <T>(array: T[], equal: (a: T, b: T) => boolean): T[] => {
    const result: T[] = [];
    for (const item of array) {
        if (result.every((existing) => !equal(existing, item))) {
            result.push(item);
        }
    }

    return result;
};
