import { Visit } from "../visitor";
import { Fact, Node } from "../../db";
import { AssignmentStatement } from "../../syntax";
import { visitExpression } from "../expressions";
import { TypeConstraint } from "../../typecheck";
import { visitPattern } from "../patterns";
import * as codegen from "../../codegen";

export class PatternInAssignmentStatement extends Fact<Node> {}
export class ValueInAssignmentStatement extends Fact<Node> {}
export class ValueInConstantDefinition extends Fact<Node> {}
export class AssignedTo extends Fact<Node> {}

export const visitAssignmentStatement: Visit<AssignmentStatement> = (visitor, statement, node) => {
    const value = visitor.visit(statement.value, ValueInAssignmentStatement, visitExpression);

    // Try assigning to an existing constant if possible
    if (statement.pattern.type === "variable") {
        node.code = statement.pattern.variable.value;

        const definition = visitor.peekName(statement.pattern.variable.value, (definition) => {
            switch (definition.type) {
                case "constant":
                    return definition;
                default:
                    return undefined;
            }
        });

        if (definition != null) {
            if (!definition.value.assigned) {
                // Ensure the value is assignable to the constant's type
                visitor.addConstraints(new TypeConstraint(value, definition.value.type()));

                visitor.db.add(value, new ValueInConstantDefinition(definition.node));
                definition.value = { assigned: true, node: value };
            } else {
                // TODO: Constant already assigned a value
            }
            return;
        }
    }

    const [pattern, conditions] = visitor.withMatchValue(value, () =>
        visitor.visit(statement.pattern, PatternInAssignmentStatement, visitPattern),
    );

    visitor.db.add(pattern, new AssignedTo(value));
    visitor.addConstraints(new TypeConstraint(value, pattern));

    node.setCodegen(codegen.ifStatement(value, conditions, []));
};
