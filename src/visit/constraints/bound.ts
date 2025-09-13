import { Visit } from "../visitor";
import { Fact, Node } from "../../db";
import { BoundConstraint as SyntaxBoundConstraint } from "../../syntax";
import { visitType } from "../types";
import { BoundConstraint } from "../../typecheck";
import { Bound } from "../../typecheck/constraints/bound";
import { IsInferredTypeParameter } from "../statements/trait-definition";

export class TraitInBoundConstraint extends Fact<Node> {}
export class IsUnresolvedBoundConstraint extends Fact<null> {}
export class ParameterInBoundConstraint extends Fact<Node> {}

export const visitBoundConstraint: Visit<SyntaxBoundConstraint> = (visitor, statement, node) => {
    const trait = visitor.resolveName(statement.trait.value, node, (definition) => {
        switch (definition.type) {
            case "trait":
                return [definition, TraitInBoundConstraint];
            default:
                return undefined;
        }
    });

    if (trait == null) {
        visitor.db.add(node, new IsUnresolvedBoundConstraint(null));
        return;
    }

    const parameters = statement.parameters.map((type) =>
        visitor.visit(type, ParameterInBoundConstraint, visitType),
    );

    // TODO: Ensure `parameters` has the right length
    const substitutions = new Map(
        trait.parameters.map((parameter, index) => [parameter, parameters[index]]),
    );

    const bound: Bound = {
        source: undefined, // will be updated during instantiation
        trait: trait.node,
        substitutions,
    };

    visitor.currentDefinition!.addConstraints(new BoundConstraint(bound));
};
