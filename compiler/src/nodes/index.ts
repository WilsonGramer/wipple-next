import { Node } from "../node";
import type { Span } from "../span";
import type { Visitor } from "../visit";
import type { StatementNode } from "./statements";
import { EmptyStatementNode } from "./statements/empty";

export class FileNode extends Node {
    statements: StatementNode[];

    constructor(statements: StatementNode[], span: Span) {
        super(span);
        this.statements = statements;
        this.isHidden = true;
    }

    *children() {
        yield* this.statements;
    }

    codegen(): void {}

    visit(visitor: Visitor): void {
        for (const statement of this.statements) {
            if (!(statement instanceof EmptyStatementNode)) {
                visitor.visit(statement);
            }
        }
    }
}
