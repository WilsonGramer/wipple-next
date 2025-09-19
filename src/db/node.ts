import chalk from "chalk";
import { Span } from "./span";
import { CodegenItem } from "../codegen";

let counter = 0;

export class Node {
    id: string;
    span: Span;
    code: string;
    codegen!: CodegenItem;

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
        node.codegen = other.codegen;
        node.isHidden = other.isHidden;
        node.instantiatedFrom = other;
        node.instantiatedBy = source;
        return node;
    }

    setCodegen(codegen: CodegenItem) {
        this.codegen = codegen;
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
