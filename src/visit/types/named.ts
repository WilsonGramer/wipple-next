import { Visit } from "../visitor";
import { Fact, Node } from "../../db";
import { NamedType } from "../../syntax";
import { visitType } from ".";
import { TypeConstraint, types } from "../../typecheck";

export class ResolvedNamedType extends Fact<Node> {}
export class IsUnresolvedNamedType extends Fact<null> {}
export class ParameterInNamedType extends Fact<Node> {}

export const visitNamedType: Visit<NamedType> = (visitor, type, node) => {
    const typeDefinition = visitor.resolveName(type.name.value, node, (definition) => {
        switch (definition.type) {
            case "type":
                return [definition, ResolvedNamedType];
            default:
                return undefined;
        }
    });

    const parameters = type.parameters.map((parameter) =>
        visitor.visit(parameter, ParameterInNamedType, visitType),
    );

    if (typeDefinition != null) {
        // TODO: Ensure `parameters` has the right length

        visitor.addConstraints(
            new TypeConstraint(node, types.named(typeDefinition.node, parameters)),
        );
    } else {
        visitor.db.add(node, new IsUnresolvedNamedType(null));
    }
};
