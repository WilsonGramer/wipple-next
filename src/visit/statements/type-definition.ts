import { Visit } from "../visitor";
import { Fact, Node } from "../../db";
import { TypeDefinitionStatement } from "../../syntax";
import { TypeConstraint, types } from "../../typecheck";
import { parseTypeAttributes } from "../attributes";
import { TypeDefinition } from "../definitions";

export class ParameterInTypeDefinition extends Fact<Node> {}
export class IsInvalidInferredTypeParameter extends Fact<null> {}

export const visitTypeDefinition: Visit<TypeDefinitionStatement> = (
    visitor,
    statement,
    definitionNode,
) => {
    visitor.withDefinition(definitionNode, () => {
        definitionNode.code = statement.name.value;

        visitor.pushScope();

        const attributes = parseTypeAttributes(visitor, statement.attributes);

        const parameters = statement.parameters.map(({ name, infer }) =>
            visitor.visit(name, ParameterInTypeDefinition, (visitor, parameter, node) => {
                visitor.defineName(parameter.value, {
                    type: "typeParameter",
                    node,
                });

                visitor.addConstraints(new TypeConstraint(node, types.parameter(node)));

                if (infer) {
                    visitor.db.add(node, new IsInvalidInferredTypeParameter(null));
                }
            }),
        );

        // Types don't have additional constraints

        // TODO: Handle representation (structure, enumeration, etc.)

        visitor.popScope();

        const definition: TypeDefinition = {
            type: "type",
            node: definitionNode,
            comments: statement.comments,
            attributes,
            parameters,
        };

        visitor.defineName(statement.name.value, definition);

        return definition;
    });
};
