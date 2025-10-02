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

export const visitStatement: Visit<Statement> = (visitor, statement, node) => {
    visitor.db.add(node, new IsStatement(null));

    node.code = node.code.slice(
        statement.comments.location.end.offset - statement.comments.location.start.offset,
    );

    if ("attributes" in statement) {
        node.code = node.code.slice(
            statement.attributes.location.end.offset - statement.attributes.location.start.offset,
        );
    }

    switch (statement.type) {
        case "constantDefinition": {
            return visitConstantDefinition(visitor, statement, node);
        }
        case "typeDefinition": {
            return visitTypeDefinition(visitor, statement, node);
        }
        case "traitDefinition": {
            return visitTraitDefinition(visitor, statement, node);
        }
        case "instanceDefinition": {
            return visitInstanceDefinition(visitor, statement, node);
        }
        case "assignment": {
            node.isHidden = true;
            return visitAssignmentStatement(visitor, statement, node);
        }
        case "expression": {
            node.isHidden = true;
            return visitExpressionStatement(visitor, statement, node);
        }
        case "empty": {
            node.isHidden = true;
            break;
        }
    }
};
