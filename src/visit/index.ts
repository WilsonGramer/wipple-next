import { Fact, Node, Db } from "../db";
import { SourceFile } from "../syntax";
import { visitStatement } from "./statements";
import { Visitor } from "./visitor";

export class StatementInSourceFile extends Fact<Node> {}
export class IsTyped extends Fact<null> {}
export class IsTopLevelVariableDefinition extends Fact<null> {}

export const visit = (file: SourceFile, db: Db) => {
    const visitor = new Visitor(file.path, file.code, db);

    const node = visitor.node(file);
    node.isHidden = true;

    visitor.currentNode = node;
    for (const statement of file.statements) {
        visitor.visit(statement, StatementInSourceFile, visitStatement);
    }

    visitor.runQueue();

    for (const variable of visitor.popScope().variables ?? []) {
        db.add(variable, new IsTopLevelVariableDefinition(null));
    }

    return visitor.finish();
};
