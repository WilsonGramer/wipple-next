import { Visit } from "../visitor";
import { Fact, Node } from "../../db";
import { ParameterType } from "../../syntax";
import { TypeConstraint, types } from "../../typecheck";

export class ResolvedParameterType extends Fact<Node> {}
export class IsImplicitlyDefinedParameterType extends Fact<null> {}
export class IsUnresolvedParameterType extends Fact<null> {}

export const visitParameterType: Visit<ParameterType> = (visitor, type, node) => {
    const existing = visitor.resolveName(type.name.value, node, (definition) => {
        switch (definition.type) {
            case "typeParameter":
                node.isHidden = true;
                return [definition.node, ResolvedParameterType];
            default:
                return undefined;
        }
    });

    if (existing != null) {
        visitor.addConstraints(new TypeConstraint(node, existing));
    } else if (visitor.currentDefinition?.implicitTypeParameters) {
        visitor.defineName(type.name.value, { type: "typeParameter", node });
        visitor.addConstraints(new TypeConstraint(node, types.parameter(node)));
        visitor.db.add(node, new IsImplicitlyDefinedParameterType(null));
    } else {
        visitor.db.add(node, new IsUnresolvedParameterType(null));
    }
};
