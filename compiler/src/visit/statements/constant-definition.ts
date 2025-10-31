import { Visit } from "../visitor";
import { Fact, Node } from "../../db";
import { ConstantDefinitionStatement } from "../../syntax";
import { visitType } from "../types";
import { TypeConstraint } from "../../typecheck";
import { visitConstraint } from "../constraints";
import { parseConstantAttributes } from "../attributes";
import { ConstantDefinition } from "../definitions";

export class TypeInConstantDefinition extends Fact<Node> {}
export class ConstraintInConstantDefinition extends Fact<Node> {}

export const visitConstantDefinition: Visit<ConstantDefinitionStatement> = (
    visitor,
    statement,
    definitionNode,
) => {
    visitor.withDefinition(definitionNode, () => {
        definitionNode.code = statement.name.value;

        visitor.pushScope();

        const attributes = parseConstantAttributes(visitor, statement.attributes);

        let type: Node;
        visitor.enqueue("afterTypeDefinitions", () => {
            visitor.currentDefinition!.implicitTypeParameters = true;

            type = visitor.visit(statement.constraints.type, TypeInConstantDefinition, visitType);

            for (const constraint of statement.constraints.constraints) {
                visitor.visit(constraint, ConstraintInConstantDefinition, visitConstraint);
            }

            visitor.currentDefinition!.implicitTypeParameters = false;

            visitor.addConstraints(new TypeConstraint(definitionNode, type));
        });

        visitor.popScope();

        const definition: ConstantDefinition = {
            type: "constant",
            node: definitionNode,
            comments: statement.comments,
            attributes,
            value: { assigned: false, type: () => type },
        };

        visitor.defineName(statement.name.value, definition);

        return definition;
    });
};
