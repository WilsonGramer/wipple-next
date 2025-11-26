import { SourceMapGenerator } from "source-map";
import type { Db } from "./db";
import { Node } from "./node";
import type { FileNode } from "./nodes";
import type { TraitDefinitionNode } from "./nodes/statements/trait-definition";
import { Typed } from "./nodes/types";
import { displayType, typeReferencesNode, type Type } from "./typecheck";
import { Instances } from "./visit";
import {
    ConstantDefinition,
    Defined,
    InstanceDefinition,
    TraitDefinition,
} from "./visit/definitions";
// @ts-ignore
import inlineSourceMapComment from "inline-source-map-comment";
import lineColumn from "line-column";
import type { Span } from "./span";

export interface CodegenOptions {
    prelude: string;
    format: { type: "module" } | { type: "iife"; arg: string };
}

class CodegenError extends Error {}

export class Codegen {
    file: string;
    db: Db;
    options: CodegenOptions;
    output: string;

    private mappings: [Span, number][] = [];
    private nodes: Node[] = [];
    private writtenTypes = new Map<string, [number, string]>();

    constructor(file: string, db: Db, options: CodegenOptions) {
        this.file = file;
        this.db = db;
        this.options = options;
        this.output = "";
    }

    node(node: Node): string {
        if (!this.nodes.includes(node)) {
            this.nodes.push(node);
        }

        return `_${this.nodes.indexOf(node)}`;
    }

    write(span: Span | undefined, ...items: (string | Node)[]) {
        for (const item of items) {
            if (span != null) {
                this.mappings.push([span, this.output.length]);
            }

            if (typeof item === "string") {
                this.output += item;
            } else if (item instanceof Node) {
                this.write(span, `/**! ${item.toString()} */`);
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
        const script = prelude + this.output;

        const lineColumnIndex = lineColumn(script);
        const sourceMap = new SourceMapGenerator({ file: this.file });
        for (const [span, index] of this.mappings) {
            const { line, col } = lineColumnIndex.fromIndex(prelude.length + index)!;

            sourceMap.addMapping({
                source: span.path,
                // Lines are 1-based and columns are 0-based
                original: { line: span.start.line, column: span.start.column - 1 },
                generated: { line: line + 1, column: col },
            });
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        return script + inlineSourceMapComment(sourceMap.toString());
    }
}
