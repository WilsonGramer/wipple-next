import { LocationRange } from "peggy";
import { Db, Fact, Node, Span } from "../db";
import { AnyDefinition, InstanceDefinition } from "./definitions";
import { Constraint } from "../typecheck";
import { CodegenItem } from "../codegen";

export type Visit<T> = (visitor: Visitor, value: T, node: Node) => void;

export class Visitor {
    path: string;
    code: string;
    db: Db;

    scopes = [new Scope()];
    currentNode!: Node;
    currentMatch!: VisitorCurrentMatch;
    currentDefinition?: VisitorCurrentDefinition;

    nodes = new Set<Node>();
    definitions = new Map<Node, AnyDefinition>();
    definitionConstraints = new Map<Node, Constraint[]>();
    constraints = new Map<Node, Constraint[]>();
    instances = new Map<Node, InstanceDefinition[]>();
    queue = new Queue();

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

    pushScope(scope = new Scope()) {
        this.scopes.push(scope);
    }

    peekScope() {
        return this.scopes.at(-1)!;
    }

    popScope() {
        const scope = this.scopes.pop()!;

        const definitionsByType: {
            [T in `${AnyDefinition["type"]}s`]?: Node[];
        } = Object.fromEntries(
            Object.entries(
                Object.groupBy(
                    scope.definitions.values().flatMap((definitions) => definitions),
                    (definition) => definition.type,
                ),
            ).map(([type, definitions]) => [`${type}s`, definitions.map(({ node }) => node)]),
        ) as any;

        return definitionsByType;
    }

    resolveName<T>(
        name: string,
        from: Node,
        filter: (definition: AnyDefinition) => [T, typeof Fact<Node>] | undefined,
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

    peekName<T>(name: string, filter: (definition: AnyDefinition) => T | undefined): T | undefined {
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

    defineName(name: string, definition: AnyDefinition) {
        const { definitions } = this.peekScope();
        if (!definitions.has(name)) {
            definitions.set(name, []);
        }

        definitions.get(name)!.push(definition);
    }

    defineInstance(trait: Node, definition: InstanceDefinition) {
        if (!this.instances.has(trait)) {
            this.instances.set(trait, []);
        }

        this.instances.get(trait)!.push(definition);
    }

    withMatchValue<T>(
        value: Node,
        f: () => T,
    ): [T, { conditions: CodegenItem[]; temporaries: Node[] }] {
        const existingMatch = this.currentMatch;
        const conditions: CodegenItem[] = [];
        const temporaries: Node[] = [];

        this.currentMatch = { value, conditions, temporaries };
        const result = f();
        this.currentMatch = existingMatch;

        return [result, { conditions, temporaries }];
    }

    withDefinition(node: Node, f: () => AnyDefinition | undefined) {
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

    enqueue(key: QueueKey, f: () => void) {
        this.queue[key].push({
            scopes: [...this.scopes],
            currentNode: this.currentNode,
            currentMatch: this.currentMatch,
            currentDefinition: this.currentDefinition,
            f,
        });
    }

    runQueue() {
        for (const { f, ...props } of this.queue) {
            Object.assign(this, props);
            f();
        }
    }

    finish() {
        for (const [node, constraints] of [...this.definitionConstraints, ...this.constraints]) {
            this.db.add(node, new HasConstraints(constraints));
        }

        for (const [node, definition] of this.definitions) {
            this.db.add(node, new Definition(definition));
        }

        return {
            definitions: this.definitions,
            instances: this.instances,
        };
    }
}

export class Scope {
    definitions = new Map<string, AnyDefinition[]>();
}

export interface VisitorCurrentMatch {
    value: Node;
    conditions: CodegenItem[];
    temporaries: Node[];
}

export class VisitorCurrentDefinition {
    node: Node;
    definition!: AnyDefinition;
    constraints: Constraint[] = [];
    implicitTypeParameters = false;

    constructor(node: Node) {
        this.node = node;
    }

    addConstraints(...constraints: Constraint[]) {
        this.constraints.push(...constraints);
    }
}

/** Needed so definitions are resolved before nodes that reference them */
class Queue {
    afterTypeDefinitions: QueuedVisit[] = [];
    afterAllDefinitions: QueuedVisit[] = [];

    *[Symbol.iterator]() {
        yield* this.afterTypeDefinitions;
        yield* this.afterAllDefinitions;
    }
}

interface QueuedVisit extends Partial<Visitor> {
    f: () => void;
}

type QueueKey = { [K in keyof Queue]: Queue[K] extends QueuedVisit[] ? K : never }[keyof Queue];

export class HasNode extends Fact<Node> {}

export class HasConstraints extends Fact<Constraint[]> {
    display = () => undefined;
}

export interface Instance {
    node: Node;
    substitutions: Map<Node, Node>;
    default?: boolean;
    error?: boolean;
}

export class HasInstance extends Fact<Instance> {
    display = ({ node }: Instance) => node.toString();
}

export class Definition extends Fact<AnyDefinition> {}
