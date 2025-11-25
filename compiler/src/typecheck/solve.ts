import type { ConstructedType, Type } from ".";
import { traverseType, typeReferencesNode, typesAreEqual } from ".";
import type { Db } from "../node";
import { Node } from "../node";
import { ExpressionNode } from "../nodes/expressions";
import { PatternNode } from "../nodes/patterns";
import { Constraints } from "./constraints";
import type { Instance } from "./constraints/bound";
import type { Constraint } from "./constraints/constraint";

export class Solver {
    db: Db;
    private groups = new Map<Set<Node>, ConstructedType[]>();
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
    }

    add(...constraints: Constraint[]) {
        this.constraints.add(...constraints);
    }

    setGroup(group: Group) {
        this.groups.set(new Set(group.nodes), group.types);
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
            for (const [nodes, types] of this.groups) {
                if (nodes.has(type)) {
                    return types.at(-1) ?? type;
                }
            }
        }

        return type;
    }

    groupOf(node: Node): Group | undefined {
        for (const [nodes, types] of this.groups) {
            if (nodes.has(node)) {
                return new Group(nodes, types);
            }
        }

        return undefined;
    }

    private insert(node: Node, ...newTypes: Type[]) {
        for (const [nodes, types] of this.groups) {
            if (nodes.has(node)) {
                for (const type of newTypes) {
                    if (type instanceof Node) {
                        nodes.add(type);
                    } else {
                        types.push(type);
                    }
                }

                return;
            }
        }

        const groupNodes = new Set<Node>([node]);
        const groupTypes: ConstructedType[] = [];
        for (const type of newTypes) {
            if (type instanceof Node) {
                groupNodes.add(type);
            } else {
                groupTypes.push(type);
            }
        }

        this.groups.set(groupNodes, groupTypes);
    }

    private merge(left: Node, right: Node) {
        let leftGroup = Group.empty(left);
        let rightGroup = Group.empty(right);
        for (const [nodes, types] of this.groups) {
            if (nodes.has(left)) {
                leftGroup = new Group(nodes, types);
                this.groups.delete(nodes);
            } else if (nodes.has(right)) {
                rightGroup = new Group(nodes, types);
                this.groups.delete(nodes);
            }
        }

        this.groups.set(new Set([...leftGroup.nodes, ...rightGroup.nodes]), leftGroup.types);

        for (const type of rightGroup.types) {
            this.unify(left, type);
        }
    }

    finish(): Group[] {
        return this.groups
            .entries()
            .map(([nodes, types]): Group => {
                types = types.map((type) => this.apply(type) as ConstructedType);
                return new Group(nodes, types).normalize();
            })
            .toArray();
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
        // Prefer showing patterns first, then expressions, etc.
        const nodeOrder = [PatternNode, ExpressionNode];
        const compareKey = (node: Node) => {
            const index = nodeOrder.findIndex((type) => node instanceof type);
            return index === -1 ? nodeOrder.length : index;
        };

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
