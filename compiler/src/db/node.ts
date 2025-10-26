import chalk from "chalk";
import stripAnsi from "strip-ansi";
import { Span } from "./span";
import { CodegenItem } from "../codegen";

export const nodeDisplayOptions = {
    showLocation: true,
    markdown: false,
};

export class Node {
    private static counter = 0;

    id: string;
    span: Span;
    code: string;
    codegen!: CodegenItem;

    isHidden = false;
    instantiatedFrom?: Node;
    instantiatedBy?: Node;

    constructor(span: Span, code: string) {
        this.id = `<${Node.counter++}>`;
        this.span = span;
        this.code = code?.trim();
        this.codegen = undefined as any;
    }

    static instantiatedFrom(other: Node, source: Node | undefined): Node {
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

    toString(color = true) {
        let s = chalk.blue(nodeDisplayOptions.markdown ? "`" + this.code + "`" : this.code);

        if (nodeDisplayOptions.showLocation) {
            // s += chalk.dim(` ${this.id}`);

            s += chalk.dim(` @ ${this.span}`);

            if (this.instantiatedFrom != null) {
                s += chalk.dim(` (instantiated)`);
            }
        }

        return color ? s : stripAnsi(s);
    }
}
