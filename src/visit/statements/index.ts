import { Visit } from "../visitor";
import { Statement } from "../../syntax";
import { visitExpressionStatement } from "./expression";
import { visitAssignmentStatement } from "./assignment";
import { visitConstantDefinition } from "./constant-definition";
import { visitTypeDefinition } from "./type-definition";
import { visitTraitDefinition } from "./trait-definition";
import { visitInstanceDefinition } from "./instance-definition";
import { Fact } from "../../db";

export class IsStatement extends Fact<null> {}
export class IsTopLevelExecutableStatement extends Fact<null> {}

export const visitStatement: Visit<Statement> = (visitor, statement, node) => {
    node.code = node.code.slice(
        statement.comments.location.end.offset - statement.comments.location.start.offset,
    );

    if ("attributes" in statement) {
        node.code = node.code.slice(
            statement.attributes.location.end.offset - statement.attributes.location.start.offset,
        );
    }

    visitor.db.add(node, new IsStatement(null));

    const isTopLevelStatement = visitor.scopes.length === 1;

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

            if (isTopLevelStatement) {
                visitor.db.add(node, new IsTopLevelExecutableStatement(null));
            }

            visitor.enqueue("afterAllDefinitions", () => {
                visitAssignmentStatement(visitor, statement, node);
            });

            break;
        }
        case "expression": {
            node.isHidden = true;

            if (isTopLevelStatement) {
                visitor.db.add(node, new IsTopLevelExecutableStatement(null));
            }

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
