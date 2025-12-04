import * as util from "node:util";
import type { Codegen } from "./codegen";
import { Facts, type Db } from "./db";
import { displaySpan, type Span } from "./span";
import { code, extra } from "./util/color";
import type { Visitor } from "./visit";

export abstract class Node {
    span: Span;
    db!: Db;
    facts = new Facts();
    isHidden = false;

    constructor(span: Span) {
        this.span = span;
    }

    abstract children(): Generator<Node>;

    abstract visit(visitor: Visitor): void;

    codegen(codegen: Codegen): void {
        codegen.fail(`cannot codegen ${this}`);
    }

    instantiate(source: Node): Node {
        return new InstantiatedNode(this, source);
    }

    isFromFile(file: Node): boolean {
        return this.span.path === file.span.path;
    }

    toString() {
        return `${this.constructor.name}(${this.render()})`;
    }

    render() {
        const source = this.span.source
            .replaceAll(/^--.*\n/g, "") // strip comments
            .replace(/\{.*\}/, "{⋯}") // collapse braces
            .replace(/:.*/, "") // remove assigned value
            .replace(/\n.*$/s, "⋯") // collapse multiple lines
            .trim();

        const span = `(${displaySpan(this.span)})`;

        if (process.env.WIPPLE_LSP) {
            return code(source);
        } else {
            return `${code(source)} ${extra(span, "dim")}`;
        }
    }

    [util.inspect.custom]() {
        return this.toString();
    }
}

export class InstantiatedNode extends Node {
    from: Node;
    source: Node;

    *children(): Generator<Node> {}

    constructor(from: Node, source: Node) {
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

    override isFromFile(file: Node): boolean {
        return this.source.isFromFile(file);
    }
}

export class InternalNode extends Node {
    constructor(span: Span, codegen?: (codegen: Codegen) => void) {
        super(span);

        if (codegen != null) {
            this.codegen = codegen;
        }
    }

    *children(): Generator<Node> {}

    visit(_visitor: Visitor): void {}

    copy() {
        return new InternalNode(this.span, this.codegen.bind(this));
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
