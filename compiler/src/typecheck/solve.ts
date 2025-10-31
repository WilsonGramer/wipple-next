import { Db, Node } from "../db";
import { Instance } from "../visit/visitor";
import { Constraint, Constraints, Score } from "./constraints";
import {
    traverseType,
    Type,
    cloneType,
    ConstructedType,
    typesAreEqual,
    TypeParameter,
} from "./constraints/type";

export class Solver {
    db: Db;
    private groups = new Map<Set<Node>, ConstructedType[]>();
    constraints = new Constraints();
    defaultConstraints = new Constraints();
    impliedInstances: Instance[] = [];
    applyQueue: Map<TypeParameter, Type>[] = [];
    error = false;
    appliedDefaults = false;

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
        this.applyQueue = [...other.applyQueue];
    }

    add(...constraints: Constraint[]) {
        for (const constraint of constraints) {
            if ("isDefault" in constraint && constraint.isDefault) {
                this.defaultConstraints.add(constraint);
            } else {
                this.constraints.add(constraint);
            }
        }

        this.defaultConstraints.sort();
        this.constraints.sort();
    }

    setGroup(group: Group) {
        this.groups.set(new Set(group.nodes), group.types);
    }

    run({ until }: { until?: Score } = {}) {
        this.appliedDefaults = false;
        this.constraints.run(this, { until });
        this.defaultConstraints.run(this, { until });
        this.appliedDefaults = true;
        this.constraints.run(this, { until });
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
            }
        }
    }

    apply(type: Type) {
        return traverseType(type, (type) => this.applyShallow(type));
    }

    groupOf(node: Node): Group | undefined {
        for (const [nodes, types] of this.groups) {
            if (nodes.has(node)) {
                return { nodes, types };
            }
        }

        return undefined;
    }

    private applyShallow(type: Type): Type {
        if (type instanceof Node) {
            for (const [nodes, types] of this.groups) {
                if (nodes.has(type)) {
                    return types[0] ?? type;
                }
            }
        }

        return type;
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
        let leftGroup: Group = { nodes: new Set([left]), types: [] };
        let rightGroup: Group = { nodes: new Set([right]), types: [] };
        for (const [nodes, types] of this.groups) {
            if (nodes.has(left)) {
                leftGroup = { nodes, types };
                this.groups.delete(nodes);
            } else if (nodes.has(right)) {
                rightGroup = { nodes, types };
                this.groups.delete(nodes);
            }
        }

        this.groups.set(new Set([...leftGroup.nodes, ...rightGroup.nodes]), leftGroup.types);

        for (const type of rightGroup.types) {
            this.unify(left, type);
        }
    }

    finish(): Group[] {
        // Forward applied types to any substitution maps created elsewhere
        for (const substitutions of this.applyQueue) {
            for (const [node, type] of substitutions) {
                substitutions.set(node, this.apply(type));
            }
        }

        return this.groups
            .entries()
            .map(
                ([nodes, types]): Group => ({
                    nodes,
                    types: deduplicate(
                        types.map((type) => this.apply(type) as ConstructedType),
                        typesAreEqual,
                    ),
                }),
            )
            .toArray();
    }
}

export interface Group {
    nodes: Set<Node>;
    types: ConstructedType[];
}

export const cloneGroup = (group: Group): Group => ({
    nodes: new Set(group.nodes),
    types: group.types.map(cloneType),
});

const deduplicate = <T>(array: T[], equal: (a: T, b: T) => boolean): T[] => {
    const result: T[] = [];
    for (const item of array) {
        if (!result.some((existing) => equal(existing, item))) {
            result.push(item);
        }
    }

    return result;
};
