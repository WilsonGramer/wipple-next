import chalk from "chalk";
import { Fact } from "./fact";
import { Filter } from "./filter";
import { Node } from "./node";
import { Span } from "./span";
import { stripVTControlCharacters } from "util";

export class Db {
    private facts: Map<Function, Map<Node, Set<any>>>;

    constructor() {
        this.facts = new Map();
    }

    add(node: Node, ...facts: Fact<unknown>[]) {
        for (const fact of facts) {
            if (!this.facts.has(fact.constructor)) {
                this.facts.set(fact.constructor, new Map());
            }

            const facts = this.facts.get(fact.constructor)!;
            if (!facts.has(node)) {
                facts.set(node, new Set());
            }

            facts.get(node)!.add(fact.value);
        }
    }

    nodes(): IteratorObject<Node> {
        const nodes = this.facts.values().flatMap((facts) => facts.keys());
        return new Set(nodes).values(); // deduplicate
    }

    list<T>(node: Node, fact: typeof Fact<T>): IteratorObject<T>;

    list(node: Node): IteratorObject<Fact<unknown>>;

    list<T>(fact: typeof Fact<T>): IteratorObject<[Node, T]>;

    list(...args: any[]): any {
        if (args.length === 2) {
            const [node, fact] = args;
            return Iterator.from(this.facts.get(fact)?.get(node) ?? []);
        } else if (args[0] instanceof Node) {
            const [node] = args;
            return this.facts.entries().flatMap(
                ([fact, values]) =>
                    values
                        .get(node)
                        ?.values()
                        .map((value) => new (fact as any)(value)) ?? [],
            );
        } else {
            const [fact] = args;
            return (
                this.facts
                    .get(fact)
                    ?.entries()
                    .flatMap(([node, values]) => values.values().map((value) => [node, value])) ??
                Iterator.from([])
            );
        }
    }

    get<T>(node: Node, fact: typeof Fact<T>): T | undefined {
        return this.list(node, fact).next().value as any;
    }

    find<T>(fact: typeof Fact<T>, value: T): Node | undefined {
        return this.list(fact)
            .filter(([_node, v]) => v === value)
            .map(([node]) => node)
            .next().value;
    }

    display<T>(node: Node, fact: typeof Fact<T>): string[] {
        const values = this.facts.get(fact)?.get(node)?.values() ?? [];

        return Array.from(values).map((value) =>
            stripVTControlCharacters(new (fact as any)(value).display(value)),
        );
    }

    has<T>(node: Node, fact: typeof Fact<T>, value?: T): boolean;
    has<T>(fact: typeof Fact<T>, value?: T): boolean;
    has(...args: any[]): any {
        const equal = (value: any, other: any) =>
            value !== undefined ? value === other : other !== undefined;

        if (args[0] instanceof Node) {
            const [node, fact, value] = args;
            const other = this.get(node, fact);
            return equal(value, other);
        } else {
            const [fact, value] = args;
            return this.list(fact as typeof Fact<any>).some(([_node, other]) =>
                equal(value, other),
            );
        }
    }

    log(filter: (node: Node) => boolean, indent = 0) {
        const nodes = this.nodes().filter(filter).toArray();
        nodes.sort((a, b) => a.span.sort(b.span));

        for (const node of nodes) {
            console.log("  ".repeat(indent) + chalk.underline(node.toString()));

            const facts = this.list(node)
                .filter((fact) => !(fact.value instanceof Node) || filter(fact.value))
                .toArray();

            facts.sort((a, b) => a.constructor.name.localeCompare(b.constructor.name));

            for (const fact of facts) {
                console.log("  ".repeat(indent + 1) + fact.toString());
            }
        }
    }

    snapshot(): Db {
        const db = new Db();
        for (const [fact, nodes] of this.facts) {
            for (const [node, values] of nodes) {
                for (const value of values) {
                    let newFact = new (fact as any)(value);
                    if ("clone" in newFact) {
                        newFact.value = newFact.clone(value);
                    }

                    db.add(node, newFact);
                }
            }
        }

        return db;
    }
}

export { Fact, Node, Span, Filter };
