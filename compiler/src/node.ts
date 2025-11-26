import type { Codegen } from "./codegen";
import type { Span } from "./span";
import { compareSpans } from "./span";
import type { Visitor } from "./visit";

export abstract class Node {
    span: Span;
    db!: Db;
    facts = new Facts();
    isHidden = false;

    constructor(span: Span) {
        this.span = span;
    }

    *children(): Generator<Node> {}

    *traverse(): Generator<Node> {
        yield this;
        for (const child of this.children()) {
            yield* child.traverse();
        }
    }

    abstract visit(visitor: Visitor): void;

    codegen(codegen: Codegen): void {
        codegen.fail(`cannot codegen ${this}`);
    }

    instantiate(source: Node | undefined): Node {
        return new InstantiatedNode(this, source);
    }

    toString() {
        return `${this.constructor.name}(${this.render()} @ ${this.span.path}:${
            this.span.start.line
        }:${this.span.start.column})`;
    }

    render() {
        // Collapse multiple lines
        const source = this.span.source.trim().replace(/\n.*$/s, "⋯");
        return "`" + source + "`";
    }

    // eslint-disable-next-line
    [require("util").inspect.custom]() {
        return this.toString();
    }
}

export class InstantiatedNode extends Node {
    from: Node;
    source: Node | undefined;

    constructor(from: Node, source: Node | undefined) {
        super(from.span);
        this.from = from;
        this.source = source;

        this.isHidden = true;

        if (from.db == null) {
            throw new Error(`instantiating unregistered node: ${from.toString()}`);
        }

        this.db = from.db;
        this.db.register(this);
    }

    visit(_visitor: Visitor): void {}
}

export class InternalNode extends Node {
    constructor(span: Span, codegen?: (codegen: Codegen) => void) {
        super(span);

        if (codegen != null) {
            this.codegen = codegen;
        }
    }

    visit(_visitor: Visitor): void {}
}

export class Fact<T> {
    private declare _value: T;

    display: (value: T) => string;

    constructor(display: string | ((value: T) => string)) {
        this.display = typeof display === "string" ? () => display : display;
    }
}

export const fact = <T = null>(display: string | ((value: T) => string)) => new Fact(display);

export class Facts {
    private values = new Map<Fact<any>, any>();

    get<T>(key: Fact<T>): T | undefined {
        return this.values.get(key) as T | undefined;
    }

    getOr<T>(key: Fact<T>, defaultValue: NoInfer<T>): T {
        if (!this.values.has(key)) {
            this.values.set(key, defaultValue);
        }

        return this.values.get(key) as T;
    }

    set<T>(key: Fact<T>, value: NoInfer<T>) {
        this.values.set(key, value);
    }

    delete<T>(key: Fact<T>) {
        this.values.delete(key);
    }

    *[Symbol.iterator]() {
        for (const [key, value] of this.values) {
            yield [key, value] as const;
        }
    }
}

export class Db {
    private nodes = new Set<Node>();

    register(node: Node) {
        node.db = this;
        this.nodes.add(node);
    }

    *list<T>(key: Fact<T>) {
        for (const node of this.nodes) {
            const value = node.facts.get(key);
            if (value !== undefined) {
                yield [node, value] as const;
            }
        }
    }

    log(filter: (node: Node) => boolean) {
        const nodes = Iterator.from(this.nodes).filter(filter).toArray();
        nodes.sort((a, b) => compareSpans(a.span, b.span));

        for (const node of nodes) {
            console.log(node.toString());

            const facts = Array.from(node.facts);
            facts.sort((a, b) => a.constructor.name.localeCompare(b.constructor.name));

            if (facts.length > 0) {
                for (const [fact, value] of facts) {
                    console.log("  " + fact.display(value));
                }
            } else {
                console.log("  (no facts)");
            }

            console.log();
        }
    }

    *[Symbol.iterator]() {
        yield* this.nodes;
    }
}

export type Filter =
    | { path?: string }
    | { path?: string; start: number; end: number }
    | { path?: string; line: number };

export const nodeFilter =
    (filters: Filter[] = []) =>
    (node: Node): boolean => {
        if (node.isHidden) {
            return false;
        }

        if (filters.length === 0) {
            return true;
        }

        const { start, end } = node.span;

        return filters.some((filter) => {
            if ("path" in filter && filter.path !== node.span.path) {
                return false;
            }

            if ("line" in filter) {
                return filter.line === start.line;
            }

            if ("start" in filter && "end" in filter) {
                return start.offset >= filter.start && end.offset <= filter.end;
            }

            return true;
        });
    };
