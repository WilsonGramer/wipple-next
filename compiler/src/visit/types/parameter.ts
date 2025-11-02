import { Visit } from "../visitor";
import { Fact, Node } from "../../db";
import { ParameterType } from "../../syntax";
import { TypeConstraint, types } from "../../typecheck";
import { TypeParameterDefinition } from "../definitions";
import { visitType } from ".";
import { TypeParameter } from "../../typecheck/constraints/type";

export class ResolvedParameterType extends Fact<Node> {}
export class IsImplicitlyDefinedParameterType extends Fact<null> {}
export class IsUnresolvedParameterType extends Fact<null> {}
export class AnnotatedTypeInParameterType extends Fact<Node> {}
export class HasTypeParameter extends Fact<TypeParameterDefinition> {}

export const visitParameterType: Visit<ParameterType> = (visitor, type, node) => {
    if (type.value != null) {
        node.code = type.name.value;
    }

    const existing = visitor.resolveName(type.name.value, node, (definition) => {
        switch (definition.type) {
            case "typeParameter":
                return [definition.node, ResolvedParameterType];
            default:
                return undefined;
        }
    });

    if (existing != null) {
        visitor.addConstraints(new TypeConstraint(node, existing));
    } else if (visitor.currentDefinition?.implicitTypeParameters) {
        const definition: TypeParameterDefinition = {
            type: "typeParameter",
            name: type.name.value,
            node,
        };

        visitor.defineName(type.name.value, definition);

        const parameter = new TypeParameter(type.name.value, node, false);

        visitor.addConstraints(new TypeConstraint(node, types.parameter(parameter)));

        if (type.value != null) {
            const annotatedType = visitor.visit(
                type.value,
                AnnotatedTypeInParameterType,
                visitType,
            );

            visitor.addConstraints(
                new TypeConstraint(node, annotatedType, {
                    onlyIfInstantiated: true,
                }),
            );
        }

        visitor.db.add(node, new IsImplicitlyDefinedParameterType(null));
        visitor.db.add(visitor.currentDefinition.node, new HasTypeParameter(definition));
    } else {
        visitor.db.add(node, new IsUnresolvedParameterType(null));
    }
};
