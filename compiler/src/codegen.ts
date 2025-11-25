import { type Db, Node } from "./node";
import type { FileNode } from "./nodes";
import type { TraitDefinitionNode } from "./nodes/statements/trait-definition";
import { Typed } from "./nodes/types";
import type { Type } from "./typecheck";
import { Instances } from "./visit";
import {
    ConstantDefinition,
    Defined,
    InstanceDefinition,
    TraitDefinition,
} from "./visit/definitions";

export interface CodegenOptions {
    format: { type: "module" } | { type: "iife"; arg: string };
}

class CodegenError extends Error {}

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

    write(...items: (string | Node)[]) {
        for (const item of items) {
            if (typeof item === "string") {
                this.output += item;
            } else if (item instanceof Node) {
                item.codegen(this);
            }
        }
    }

    writeType(type: Type) {
        if (type instanceof Node) {
            const applied = type.facts.get(Typed)?.types[0];
            if (applied == null) {
                throw new Error(`unresolved type: ${type.toString()}`);
            }

            type = applied;
        }

        this.output += JSON.stringify(type.codegen(type.children, this));
    }

    fail(message = "explicit call to `fail()`"): never {
        console.error(new Error(message).stack);
        throw new CodegenError();
    }

    private writeDefinitions() {
        for (const [node, definition] of this.db.list(Defined)) {
            if (definition instanceof TraitDefinition) {
                this.writeInstances(definition.node);
                continue;
            }

            let body: Node | undefined;
            if (definition instanceof ConstantDefinition) {
                if (definition.value.assigned) {
                    body = definition.value.node;
                }
            } else if (definition instanceof InstanceDefinition) {
                body = definition.value;
            }

            if (body == null) {
                continue;
            }

            this.write(`/**! ${node.toString()} */ `);
            this.write(`async function ${this.node(node)}(types) {\nreturn `, body, `;\n}\n`);
        }
    }

    private writeInstances(trait: TraitDefinitionNode) {
        const instances = trait.facts.get(Instances) ?? [];

        this.write(`const ${this.node(trait)} = [\n`);

        for (const instance of instances) {
            this.write(`[${this.node(instance.node)}, {`);

            for (const [parameter, substitution] of instance.substitutions) {
                this.write(`${this.node(parameter)}: `);
                this.writeType(substitution);
                this.write(`, `);
            }

            this.write(`}],\n`);
        }

        this.write(`];\n`);
    }

    run(files: FileNode[]): string | undefined {
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

        try {
            this.writeDefinitions();
            this.write("const types = {};\n");
            for (const file of files) {
                this.write(file);
            }
        } catch (e) {
            if (!(e instanceof CodegenError)) {
                throw e;
            }

            return undefined;
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
