import type { Codegen } from "../codegen";
import { Node } from "../node";
import type { Span } from "../span";
import type { Visitor } from "../visit";
import type { StatementNode } from "./statements";

export class FileNode extends Node {
    statements: StatementNode[];

    constructor(statements: StatementNode[], span: Span) {
        super(span);
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
