import type { Node } from "./node";
import { compareSpans } from "./span";

export abstract class Fact<T> {
    declare private _value: T;

    constructor() {
        throw new Error("facts can only be used as types, not values");
    }

    abstract display(value: T): string;

    copy?(value: T): T;
}

export class Facts {
    private values = new Map<typeof Fact<any>, any>();

    get<T>(key: typeof Fact<T>): T | undefined {
        return this.values.get(key) as T | undefined;
    }

    getOr<T>(key: typeof Fact<T>, defaultValue: NoInfer<T>): T {
        if (!this.values.has(key)) {
            this.values.set(key, defaultValue);
        }

        return this.values.get(key) as T;
    }

    set<T>(key: typeof Fact<T>, value: NoInfer<T>) {
        this.values.set(key, value);
    }

    delete<T>(key: typeof Fact<T>) {
        this.values.delete(key);
    }

    *[Symbol.iterator]() {
        for (const [key, value] of this.values) {
            yield [key, value] as const;
        }
    }

    copy() {
        const copy = new Facts();
        for (const [key, value] of this.values) {
            copy.set(key, key.prototype.copy != null ? key.prototype.copy(value) : value);
        }

        return copy;
    }
}

export class Db {
    private nodes = new Set<Node>();

    register(node: Node) {
        node.db = this;
        this.nodes.add(node);
    }

    *list<T>(key: typeof Fact<T>) {
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
                    console.log("  " + fact.prototype.display(value));
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

    copy() {
        const db = new Db();
        for (const node of this.nodes) {
            const copy = Object.assign(Object.create(Object.getPrototypeOf(node)), node) as Node;
            copy.facts = node.facts.copy();
            db.register(copy);
        }

        return db;
    }
}
