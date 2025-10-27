import { Db, Fact, Node, Span } from "../db";
import { AnyDefinition, InstanceDefinition } from "./definitions";
import { Constraint } from "../typecheck";
import { CodegenItem } from "../codegen";
import { LocationRange } from "../syntax";
import { Type, TypeParameter } from "../typecheck/constraints/type";

export type Visit<T> = (visitor: Visitor, value: T, node: Node) => void;

export class Visitor {
    db: Db;

    scopes: Scope[];
    currentNode!: Node;
    currentMatch!: VisitorCurrentMatch;
    currentDefinition?: VisitorCurrentDefinition;

    nodes = new Set<Node>();
    definitions = new Map<Node, AnyDefinition>();
    definitionConstraints = new Map<Node, Constraint[]>();
    constantValueConstraints = new Map<Node, Constraint[]>(); // constant value constraints are resolved with definitions but shouldn't be instantiated alongside the constant
    constraints = new Map<Node, Constraint[]>();
    instances = new Map<Node, InstanceDefinition[]>();
    queue = new Queue();

    constructor(db: Db) {
        this.db = db;

        const existingScopes = this.db
            .list(HasTopLevelScope)
            .map(([, scope]) => scope)
            .toArray();

        this.scopes = existingScopes.length > 0 ? existingScopes : [new Scope()];
    }

    node(value: { location: LocationRange }) {
        const span = new Span(value.location);
        const node = new Node(span, value.location.source);
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

        if (this.currentDefinition != null) {
            if (this.currentDefinition.withinConstantValue) {
                if (!this.constantValueConstraints.has(this.currentNode)) {
                    this.constantValueConstraints.set(this.currentNode, []);
                }

                this.constantValueConstraints.get(this.currentNode)!.push(...constraints);
            } else {
                if (!this.definitionConstraints.has(this.currentDefinition.node)) {
                    this.definitionConstraints.set(this.currentDefinition.node, []);
                }

                this.definitionConstraints.get(this.currentDefinition.node)!.push(...constraints);
            }
        } else {
            if (!this.constraints.has(this.currentNode)) {
                this.constraints.set(this.currentNode, []);
            }

            this.constraints.get(this.currentNode)!.push(...constraints);
        }
    }

    pushScope(scope = new Scope()) {
        this.scopes.push(scope);
    }

    peekScope() {
        return this.scopes.at(-1)!;
    }

    popScope() {
        return this.scopes.pop()!;
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
        for (const [node, constraints] of this.definitionConstraints) {
            this.db.add(node, new HasDefinitionConstraints(constraints));
        }

        for (const [node, constraints] of this.constantValueConstraints) {
            this.db.add(node, new HasConstantValueConstraints(constraints));
        }

        for (const [node, constraints] of this.constraints) {
            this.db.add(node, new HasTopLevelConstraints(constraints));
        }

        for (const [node, definition] of this.definitions) {
            this.db.add(node, new Definition(definition));
        }

        this.db.add(this.currentNode, new HasTopLevelScope(this.scopes.pop()!));

        return {
            definitions: this.definitions,
            instances: this.instances,
        };
    }
}

export class Scope {
    definitions = new Map<string, AnyDefinition[]>();

    getDefinitions() {
        return Object.fromEntries(
            Object.entries(
                Object.groupBy(
                    this.definitions.values().flatMap((definitions) => definitions),
                    (definition) => definition.type,
                ),
            ).map(([type, definitions]) => [`${type}s`, definitions.map(({ node }) => node)]),
        ) as {
            [T in `${AnyDefinition["type"]}s`]?: Node[];
        };
    }
}

export interface VisitorCurrentMatch {
    value: Node;
    conditions: CodegenItem[];
    temporaries: Node[];
}

export class VisitorCurrentDefinition {
    node: Node;
    definition!: AnyDefinition;
    implicitTypeParameters = false;
    withinConstantValue = false;

    constructor(node: Node) {
        this.node = node;
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

export class HasTopLevelScope extends Fact<Scope> {}

export class HasNode extends Fact<Node> {}

export class HasDefinitionConstraints extends Fact<Constraint[]> {
    display = () => undefined;
}

export class HasConstantValueConstraints extends Fact<Constraint[]> {
    display = () => undefined;
}

export class HasTopLevelConstraints extends Fact<Constraint[]> {
    display = () => undefined;
}

export interface Instance {
    node: Node;
    trait: Node;
    substitutions: Map<TypeParameter, Type>;
    default?: boolean;
    error?: boolean;
}

export class HasInstance extends Fact<Instance> {
    display = ({ node }: Instance) => node.toString();
}

export class Definition extends Fact<AnyDefinition> {}
