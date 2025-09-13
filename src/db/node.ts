import chalk from "chalk";
import { Span } from "./span";

let counter = 0;

export class Node {
    id: string;
    span: Span;
    code: string;
    isHidden = false;
    instantiatedFrom?: Node;
    instantiatedBy?: Node;

    constructor(span: Span, code: string) {
        this.id = `<${counter++}>`;
        this.span = span;
        this.code = code;
    }

    static instantiatedFrom(other: Node, source: Node | undefined): Node {
        if (other.instantiatedFrom) {
            throw new Error("already instantiated");
        }

        const node = new Node(other.span, other.code);
        node.isHidden = other.isHidden;
        node.instantiatedFrom = other;
        node.instantiatedBy = source;
        return node;
    }

    toString() {
        let s = chalk.blue(this.code);

        if (this.instantiatedFrom != null) {
            s += chalk.black.dim(` instantiated`);
        }

        s += chalk.black.dim(` @ ${this.span}`);

        return s;
    }
}
