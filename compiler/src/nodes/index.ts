import type { Codegen } from "../codegen";
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

    visit(visitor: Visitor): void {
        for (const statement of this.statements) {
            if (!(statement instanceof EmptyStatementNode)) {
                visitor.visit(statement);
            }
        }
    }

    codegen(codegen: Codegen): void {
        // for (const [variable, _] of this.db.list(IsTopLevelVariableDefinition)) {
        //     this.write(`let ${this.node(variable)};\n`);
        // }
        // for (const [statement, _] of this.db.list(IsTopLevelExecutableStatement)) {
        //     this.write(statement);
        // }
    }
}
