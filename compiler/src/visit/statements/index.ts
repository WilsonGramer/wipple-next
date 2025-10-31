import { Visit, Visitor } from "../visitor";
import { Statement } from "../../syntax";
import { visitExpressionStatement } from "./expression";
import { visitAssignmentStatement } from "./assignment";
import { visitConstantDefinition } from "./constant-definition";
import { visitTypeDefinition } from "./type-definition";
import { visitTraitDefinition } from "./trait-definition";
import { visitInstanceDefinition } from "./instance-definition";
import { Fact, Node } from "../../db";

export class IsStatement extends Fact<null> {}
export class IsTopLevelExecutableStatement extends Fact<null> {}

export const visitStatement: Visit<Statement> = (visitor, statement, node) => {
    visitor.db.add(node, new IsStatement(null));

    if ("comments" in statement) {
        const end = statement.comments.at(-1)?.location.end;
        if (end != null) node.trimBefore(end);
    }

    if ("attributes" in statement) {
        const end = statement.attributes.at(-1)?.location.end;
        if (end != null) node.trimBefore(end);
    }

    switch (statement.type) {
        case "constantDefinition": {
            visitConstantDefinition(visitor, statement, node);
            break;
        }
        case "typeDefinition": {
            visitTypeDefinition(visitor, statement, node);
            break;
        }
        case "traitDefinition": {
            visitTraitDefinition(visitor, statement, node);
            break;
        }
        case "instanceDefinition": {
            visitInstanceDefinition(visitor, statement, node);
            break;
        }
        case "assignment": {
            node.isHidden = true;

            visitor.enqueue("afterAllDefinitions", () => {
                visitAssignmentStatement(visitor, statement, node);
            });

            break;
        }
        case "expression": {
            node.isHidden = true;

            visitor.enqueue("afterAllDefinitions", () => {
                visitExpressionStatement(visitor, statement, node);
            });

            break;
        }
        case "empty": {
            node.isHidden = true;
            break;
        }
    }
};

export const trySetTopLevelExecutableStatement = (visitor: Visitor, node: Node) => {
    const isTopLevelStatement = visitor.scopes.length === 1;

    if (isTopLevelStatement) {
        visitor.db.add(node, new IsTopLevelExecutableStatement(null));
    }
};
