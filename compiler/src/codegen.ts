import { SourceNode } from "source-map";
import type { Db } from "./db";
import { Node } from "./node";
import type { FileNode } from "./nodes";
import type { TraitDefinitionNode } from "./nodes/statements/trait-definition";
import { Typed } from "./nodes/types";
import { type Span } from "./span";
import { displayType, typeReferencesNode, type Type } from "./typecheck";
import { Instances } from "./visit";
import {
    ConstantDefinition,
    Defined,
    InstanceDefinition,
    TraitDefinition,
} from "./visit/definitions";

export interface CodegenOptions {
    prelude: string;
    format: { type: "module" } | { type: "iife"; arg: string };
}

class CodegenError extends Error {}

export class Codegen {
    files: { path: string; source: string }[];
    outputPath: string;
    db: Db;
    options: CodegenOptions;
    output: SourceNode[];

    private mappings: [Span, number][] = [];
    private nodes: Node[] = [];
    private writtenTypes = new Map<string, [number, string]>();

    constructor(
        files: { path: string; source: string }[],
        outputPath: string,
        db: Db,
        options: CodegenOptions,
    ) {
        this.files = files;
        this.outputPath = outputPath;
        this.db = db;
        this.options = options;
        this.output = [];
    }

    node(node: Node): string {
        if (!this.nodes.includes(node)) {
            this.nodes.push(node);
        }

        return `_${this.nodes.indexOf(node)}`;
    }

    write(span: Span | undefined, ...items: (string | Node)[]) {
        for (const item of items) {
            if (typeof item === "string") {
                if (span != null) {
                    const {
                        path,
                        start: { line, column },
                    } = span;

                    // Lines are 1-based and columns are 0-based
                    this.output.push(new SourceNode(line, column - 1, path, item));
                } else {
                    this.output.push(new SourceNode(null, null, null, item));
                }
            } else if (item instanceof Node) {
                this.mappings.push([item.span, this.output.length]);
                item.codegen(this);
            }
        }
    }

    writeType(span: Span | undefined, type: Type) {
        let [typeCode, typeString] = this.type(type);

        if (!this.writtenTypes.has(typeCode)) {
            this.writtenTypes.set(typeCode, [this.writtenTypes.size, typeString]);
        }

        let index: number;
        [index, typeString] = this.writtenTypes.get(typeCode)!;

        this.write(span, `/**! ${typeString} */ typeCache[${index}]`);
    }

    private type(type: Type): [string, string];
    private type(type: Type, root: false): unknown;
    private type(type: Type, root = true): any {
        if (type instanceof Node) {
            type = type.facts.get(Typed)?.types[0] ?? type;
        }

        if (type instanceof Node || typeReferencesNode(type)) {
            this.fail(`unresolved type: ${displayType(type)}`);
        }

        const typeCode = type.codegen(
            type.children.map((child) => this.type(child, false)),
            this,
        );

        if (root) {
            return [JSON.stringify(typeCode), displayType(type)];
        } else {
            return typeCode;
        }
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

            this.write(undefined, `/**! ${node.toString()} */ `);
            this.write(
                undefined,
                `async function ${this.node(node)}(types) {\nreturn `,
                body,
                `;\n}\n`,
            );
        }
    }

    private writeInstances(trait: TraitDefinitionNode) {
        const instances = trait.facts.get(Instances) ?? [];

        this.write(undefined, `const ${this.node(trait)} = [\n`);

        for (const instance of instances) {
            if (instance.error) {
                continue; // skip error instances that have no value
            }

            this.write(undefined, `[${this.node(instance.node)}, {`);

            for (const [parameter, substitution] of instance.substitutions) {
                this.write(undefined, `${this.node(parameter)}: `);
                this.writeType(undefined, substitution);
                this.write(undefined, `, `);
            }

            this.write(undefined, `}],\n`);
        }

        this.write(undefined, `];\n`);
    }

    run(files: FileNode[]): string | undefined {
        switch (this.options.format.type) {
            case "module": {
                this.write(undefined, `export default async function(runtime) {\n`);
                break;
            }
            case "iife": {
                this.write(undefined, `(async (runtime) => {\n`);
                break;
            }
            default: {
                this.options.format satisfies never;
            }
        }

        try {
            this.writeDefinitions();
            this.write(undefined, "const types = {};\n");
            for (const file of files) {
                this.write(file.span, file);
            }
        } catch (e) {
            if (!(e instanceof CodegenError)) {
                throw e;
            }

            return undefined;
        }

        switch (this.options.format.type) {
            case "module": {
                this.write(undefined, `};\n`);
                break;
            }
            case "iife": {
                this.write(undefined, `})(${this.options.format.arg});\n`);
                break;
            }
            default: {
                this.options.format satisfies never;
            }
        }

        const typeCache = `const typeCache = [\n${Array.from(this.writtenTypes.keys()).join(
            ",\n",
        )},\n];\n`;

        const prelude = this.options.prelude + typeCache;

        const output = new SourceNode(null, null, null, this.output);
        output.prepend(prelude);

        const { code, map } = output.toStringWithSourceMap({ file: this.outputPath });
        for (const file of this.files) {
            map.setSourceContent(file.path, file.source);
        }

        const sourceMapComment = `\n//# sourceMappingURL=data:application/json;base64,${btoa(map.toString())}\n`;

        return code + sourceMapComment;
    }
}
