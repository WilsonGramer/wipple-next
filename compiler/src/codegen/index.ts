import { Db, Node } from "../db";
import { IsTopLevelVariableDefinition } from "../visit";
import { IsTopLevelExecutableStatement } from "../visit/statements";
import { Definition, HasInstance } from "../visit/visitor";

export interface CodegenOptions {
    format: { type: "module" } | { type: "iife"; arg: string };
    debug?: boolean;
}

export class Codegen {
    db: Db;
    options: CodegenOptions;
    output: string;
    nodes = new Map<Node, number>();

    constructor(db: Db, options: CodegenOptions) {
        this.db = db;
        this.options = options;
        this.output = "";
    }

    static from(other: Codegen): Codegen {
        const codegen = new Codegen(other.db, other.options);
        codegen.nodes = new Map(other.nodes);
        return codegen;
    }

    node(node: Node): string {
        if (!this.nodes.has(node)) {
            this.nodes.set(node, this.nodes.size);
        }

        return `_${this.nodes.get(node)!}`;
    }

    write(item: string | CodegenItem) {
        if (typeof item === "string") {
            this.output += item;
        } else if ("codegen" in item) {
            if (item.codegen != null) {
                this.write(item.codegen);
            } else {
                throw new Error(`cannot codegen ${item}`);
            }
        } else if (typeof item === "function") {
            item(this);
        } else if (Array.isArray(item)) {
            item.forEach((item) => this.write(item));
        } else {
            throw new Error(`cannot codegen ${item}`);
        }
    }

    stringify(item: CodegenItem): string {
        const temp = Codegen.from(this);
        temp.write(item);
        return temp.output;
    }

    private writeDefinitions() {
        for (const [node, definition] of this.db.list(Definition)) {
            if (definition.type === "trait") {
                this.writeInstances(node);
                continue;
            }

            let body: Node | undefined;
            switch (definition.type) {
                case "constant": {
                    if (definition.value.assigned) {
                        body = definition.value.node;
                    }

                    break;
                }
                case "instance": {
                    body = definition.value();
                    break;
                }
            }

            if (body == null) {
                continue;
            }

            if (this.options.debug) {
                this.write(`/**! ${node.span.toString()} */ `);
            }

            this.write(`async function ${this.node(node)}(types) {\nreturn `);
            this.write(body);
            this.write(`;\n}\n`);
        }
    }

    private writeInstances(trait: Node) {
        const instances = this.db.list(trait, HasInstance);

        this.write(`const ${this.node(trait)} = [\n`);

        for (const instance of instances) {
            this.write(`[${this.node(instance.node)}, {`);

            for (const [parameter, substitution] of instance.substitutions) {
                this.write(`${this.node(parameter.source)}: `);
                this.write(substitution);
                this.write(`, `);
            }

            this.write(`}],\n`);
        }

        this.write(`];\n`);
    }

    run(): string {
        switch (this.options.format.type) {
            case "module": {
                this.write(`export default async function(runtime) {\n`);
                break;
            }
            case "iife": {
                this.write(`(async (runtime) => {\n`);
                break;
            }
            default: {
                this.options.format satisfies never;
            }
        }

        this.writeDefinitions();

        this.write("const types = {};\n");

        for (const [variable, _] of this.db.list(IsTopLevelVariableDefinition)) {
            this.write(`let ${this.node(variable)};\n`);
        }

        for (const [statement, _] of this.db.list(IsTopLevelExecutableStatement)) {
            this.write(statement);
        }

        switch (this.options.format.type) {
            case "module": {
                this.write(`};\n`);
                break;
            }
            case "iife": {
                this.write(`})(${this.options.format.arg});\n`);
                break;
            }
            default: {
                this.options.format satisfies never;
            }
        }

        return this.output;
    }
}

type CodegenFunction = (codegen: Codegen) => void;
export type CodegenItem = CodegenFunction | { codegen: CodegenItem } | CodegenItem[];

export * from "./conditions";
export * from "./expressions";
export * from "./statements";
export * from "./types";
