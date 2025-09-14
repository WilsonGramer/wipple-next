import { LocationRange } from "peggy";
import { Db, Fact, Node, Span } from "../db";
import { Definition, InstanceDefinition } from "./definitions";
import { Constraint } from "../typecheck";
import { Type } from "../typecheck/constraints/type";

export type Visit<T> = (visitor: Visitor, value: T, node: Node) => void;

export class Visitor {
    path: string;
    code: string;
    db: Db;
    currentNode!: Node;
    scopes = [new Scope()];
    nodes = new Set<Node>();
    currentDefinition?: VisitorCurrentDefinition;
    definitions = new Map<Node, Definition>();
    definitionConstraints = new Map<Node, Constraint[]>();
    constraints = new Map<Node, Constraint[]>();
    instances = new Map<Node, InstanceDefinition[]>();

    constructor(path: string, code: string, db: Db) {
        this.path = path;
        this.code = code;
        this.db = db;
    }

    node(value: { location: LocationRange }) {
        const span = new Span(this.path, value.location);
        const code = this.code.slice(value.location.start.offset, value.location.end.offset);
        const node = new Node(span, code);
        this.nodes.add(node);
        return node;
    }

    visit<T extends { location: LocationRange }>(
        value: T,
        relation: typeof Fact<Node>,
        f: Visit<T>,
    ) {
        const node = this.node(value);
        this.db.add(node, new (relation as any)(this.currentNode));

        if (this.currentDefinition != null) {
            this.db.add(this.currentDefinition.node, new HasNode(this.currentNode));
        }

        const previousNode = this.currentNode;
        this.currentNode = node;
        f(this, value, node);
        this.currentNode = previousNode;

        return node;
    }

    addConstraints(...constraints: Constraint[]) {
        if (!this.currentNode) {
            throw new Error("cannot add a constraint outside visiting a node");
        }

        if (!this.constraints.has(this.currentNode)) {
            this.constraints.set(this.currentNode, []);
        }

        this.constraints.get(this.currentNode)!.push(...constraints);

        this.currentDefinition?.addConstraints(...constraints);
    }

    pushScope() {
        this.scopes.push(new Scope());
    }

    popScope() {
        this.scopes.pop();
    }

    resolveName<T>(
        name: string,
        from: Node,
        filter: (definition: Definition) => [T, typeof Fact<Node>] | undefined,
    ): T | undefined {
        for (const scope of this.scopes.toReversed()) {
            for (const definition of scope.definitions.get(name)?.toReversed() ?? []) {
                const result = filter(definition);
                if (result != null) {
                    const [value, relation] = result;
                    this.db.add(from, new (relation as any)(definition.node));
                    return value;
                }
            }
        }

        return undefined;
    }

    peekName<T>(name: string, filter: (definition: Definition) => T | undefined): T | undefined {
        for (const scope of this.scopes.toReversed()) {
            for (const definition of scope.definitions.get(name)?.toReversed() ?? []) {
                const value = filter(definition);
                if (value != null) {
                    return value;
                }
            }
        }

        return undefined;
    }

    defineName(name: string, definition: Definition) {
        const { definitions } = this.scopes.at(-1)!;
        if (!definitions.has(name)) {
            definitions.set(name, []);
        }

        definitions.get(name)!.push(definition);
    }

    defineInstance(definition: InstanceDefinition) {
        if (!this.instances.has(definition.trait)) {
            this.instances.set(definition.trait, []);
        }

        this.instances.get(definition.trait)!.push(definition);
    }

    withDefinition(node: Node, f: () => Definition | undefined) {
        const existingDefinitionInfo = this.currentDefinition;
        const newDefinitionInfo = new VisitorCurrentDefinition(node);
        this.currentDefinition = newDefinitionInfo;
        const resultDefinition = f();
        this.currentDefinition = existingDefinitionInfo;

        this.definitionConstraints.set(node, newDefinitionInfo.constraints);

        if (resultDefinition != null) {
            this.definitions.set(node, resultDefinition);
        }
    }

    finish() {
        for (const [node, constraints] of [...this.definitionConstraints, ...this.constraints]) {
            this.db.add(node, new HasConstraints(constraints));
        }

        return {
            definitions: this.definitions,
            instances: this.instances,
            // definitionConstraints: [...this.definitionConstraints.values()].flat(),
            // constraints: [...this.constraints.values()].flat(),
        };
    }
}

export class Scope {
    definitions = new Map<string, Definition[]>();
}

export class VisitorCurrentDefinition {
    node: Node;
    definition!: Definition;
    constraints: Constraint[] = [];
    implicitTypeParameters = false;

    constructor(node: Node) {
        this.node = node;
    }

    addConstraints(...constraints: Constraint[]) {
        this.constraints.push(...constraints);
    }
}

export class HasNode extends Fact<Node> {}

export class HasConstraints extends Fact<Constraint[]> {
    display = () => undefined;
}

export class HasInstance extends Fact<[Node, Map<Node, Type>]> {
    display = ([node]: [Node, Map<Node, Type>]) => node.toString();
}
