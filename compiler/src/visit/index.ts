import type { Db, Node } from "../node";
import { Fact, InternalNode } from "../node";
import { Defined, type Definition, type InstanceDefinition } from "./definitions";
import type { Instance } from "../typecheck/constraints/bound";
import type { TypeParameterNode } from "../nodes/types/parameter";
import type { Constraint } from "../typecheck/constraints/constraint";
import { type PatternNode } from "../nodes/patterns";

export class Resolved extends Fact<Definition | string> {
    display = (definition: Definition | string) =>
        typeof definition === "string" ? "unresolved" : `resolved to ${definition.node}`;
}

export class DefinitionConstraints extends Fact<Constraint[]> {
    display = () => "has definition constraints";
}

export class TypeParameters extends Fact<TypeParameterNode[]> {
    display = () => "has type parameters";
}

export class Instances extends Fact<Instance[]> {
    display = () => "has instances";
}

export class Visitor {
    db: Db;
    scopes: Scope[];
    currentNode!: Node;
    currentDefinition?: VisitorCurrentDefinition;
    currentMatch!: Node;

    private constraints: Constraint[] = [];
    private definitions = new Map<Node, Definition>();
    private instances = new Map<Node, InstanceDefinition[]>();
    private queue = new Queue();

    constructor(db: Db, scopes: Scope[]) {
        this.db = db;
        this.scopes = scopes;
        this.pushScope();
    }

    visit(node: Node) {
        this.db.register(node);

        const previousNode = this.currentNode;
        this.currentNode = node;
        node.visit(this);
        this.currentNode = previousNode;
    }

    constraint(constraint: Constraint) {
        if (this.currentDefinition != null) {
            this.currentDefinition.constraint(constraint);
        } else {
            this.constraints.push(constraint);
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

    resolve<T extends abstract new (...args: any[]) => Definition>(
        name: string,
        type: T[],
        node: Node,
    ): InstanceType<T> | undefined {
        const definition = this.peek(name, type);
        node.facts.set(Resolved, definition ?? name);
        return definition;
    }

    peek<T extends abstract new (...args: any[]) => Definition>(
        name: string,
        types: T[],
    ): InstanceType<T> | undefined {
        return this.scopes
            .toReversed()
            .flatMap((scope) => scope.definitions.get(name)?.toReversed() ?? [])
            .find((definition): definition is InstanceType<T> =>
                types.some((type) => definition instanceof type),
            );
    }

    define(name: string, definition: Definition) {
        const { definitions } = this.peekScope();
        if (!definitions.has(name)) {
            definitions.set(name, []);
        }

        definitions.get(name)!.push(definition);
    }

    instance(trait: Node, definition: InstanceDefinition) {
        if (!this.instances.has(trait)) {
            this.instances.set(trait, []);
        }

        this.instances.get(trait)!.push(definition);
    }

    defining<T extends Definition | undefined>(node: Node, f: () => T): T {
        const existingDefinitionInfo = this.currentDefinition;
        const newDefinitionInfo = new VisitorCurrentDefinition(node);
        this.currentDefinition = newDefinitionInfo;
        const resultDefinition = f();
        this.currentDefinition = existingDefinitionInfo;

        if (resultDefinition != null) {
            this.definitions.set(node, resultDefinition);
            node.facts.set(Defined, resultDefinition);
        }

        return resultDefinition;
    }

    matching<T>(temporary: InternalNode, f: () => T): T {
        const existingMatching = this.currentMatch;
        this.currentMatch = temporary;
        const result = f();
        this.currentMatch = existingMatching;
        return result;
    }

    subpattern(pattern: PatternNode): Node {
        const temporary = new InternalNode(pattern.span);
        this.db.register(temporary);

        const previousMatch = this.currentMatch;
        this.currentMatch = temporary;
        this.visit(pattern);
        this.currentMatch = previousMatch;

        return temporary;
    }

    enqueue(key: QueueKey, f: () => void) {
        this.queue[key].push({
            ...this.captureForQueue(),
            f,
        });
    }

    private captureForQueue(): Partial<Visitor> {
        return {
            scopes: [...this.scopes],
            currentDefinition: this.currentDefinition,
        };
    }

    private runQueue() {
        for (const { f, ...props } of this.queue) {
            const prev = this.captureForQueue();
            Object.assign(this, props);
            f();
            Object.assign(this, prev);
        }
    }

    finish() {
        this.runQueue();

        return {
            constraints: this.constraints,
            scope: this.popScope(),
        };
    }
}

export class Scope {
    definitions = new Map<string, Definition[]>();
}

export class VisitorCurrentDefinition {
    node: Node;
    implicitTypeParameters = false;
    withinConstantValue = false;

    constructor(node: Node) {
        this.node = node;
    }

    get constraints() {
        return this.node.facts.getOr(DefinitionConstraints, []);
    }

    constraint(constraint: Constraint) {
        if (this.withinConstantValue) {
            constraint.shouldInstantiate = false;
        }

        this.constraints.push(constraint);
    }

    withImplicitTypeParameters<T>(f: () => T): T {
        this.implicitTypeParameters = true;
        const result = f();
        this.implicitTypeParameters = false;
        return result;
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
