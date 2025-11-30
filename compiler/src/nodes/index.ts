import type { Codegen } from "../codegen";
import { Node } from "../node";
import type { Span } from "../span";
import type { Visitor } from "../visit";
import type { StatementNode } from "./statements";

export class FileNode extends Node {
    imports: Import[];
    statements: StatementNode[];

    constructor(imports: Import[], statements: StatementNode[], span: Span) {
        super(span);

        this.imports = imports;
        this.statements = statements;
        this.isHidden = true;
    }

    *children(): Generator<Node> {
        yield* this.statements;
    }

    visit(visitor: Visitor): void {
        for (const statement of this.statements) {
            visitor.visit(statement);
        }
    }

    codegen(codegen: Codegen): void {
        for (const statement of this.statements) {
            codegen.write(this.span, statement);
        }
    }
}

export class Import {
    path: string;
    span: Span;

    constructor(path: string, span: Span) {
        this.path = path;
        this.span = span;
    }
}
