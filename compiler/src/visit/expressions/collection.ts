import { Visit } from "../visitor";
import { Fact, Node } from "../../db";
import { CollectionExpression } from "../../syntax";
import { visitExpression } from ".";
import * as codegen from "../../codegen";
import { BoundConstraint, InstantiateConstraint, TypeConstraint, types } from "../../typecheck";
import { Type, TypeParameter } from "../../typecheck/constraints/type";

export class ResolvedBuildCollectionInCollectionExpression extends Fact<Node> {}
export class ResolvedInitialCollectionInCollectionExpression extends Fact<Node> {}
export class IsUnresolvedCollectionExpression extends Fact<null> {}
export class ElementInCollectionExpression extends Fact<Node> {}

export const visitCollectionExpression: Visit<CollectionExpression> = (
    visitor,
    expression,
    node,
) => {
    const elements = expression.elements.map((element) =>
        visitor.visit(element, ElementInCollectionExpression, visitExpression),
    );

    const buildCollectionNode = visitor.resolveName("Build-Collection", node, (definition) => {
        if (definition.type !== "trait") {
            return undefined;
        }

        const buildCollectionNode = visitor.node(expression);

        const substitutions = new Map<TypeParameter, Type>();

        buildCollectionNode.setCodegen(codegen.traitExpression(definition.node, substitutions));

        visitor.addConstraints(
            new InstantiateConstraint({
                source: buildCollectionNode,
                definition: definition.node,
                substitutions,
                replacements: new Map([[definition.node, buildCollectionNode]]),
            }),
        );

        return [buildCollectionNode, ResolvedBuildCollectionInCollectionExpression];
    });

    const initialCollectionNode = visitor.resolveName("Initial-Collection", node, (definition) => {
        if (definition.type !== "trait") {
            return undefined;
        }

        const initialCollectionNode = visitor.node(expression);

        const substitutions = new Map<TypeParameter, Type>();
        const replacements = new Map([[definition.node, initialCollectionNode]]);

        initialCollectionNode.setCodegen(codegen.traitExpression(definition.node, substitutions));

        visitor.addConstraints(
            new InstantiateConstraint({
                source: initialCollectionNode,
                definition: definition.node,
                substitutions,
                replacements,
            }),
        );

        return [initialCollectionNode, ResolvedBuildCollectionInCollectionExpression];
    });

    if (buildCollectionNode == null || initialCollectionNode == null) {
        visitor.db.add(node, new IsUnresolvedCollectionExpression(null));
        return;
    }

    const resultNode = elements.reduce((collection, element) => {
        const next = visitor.node(expression);
        visitor.addConstraints(
            new TypeConstraint(buildCollectionNode, types.function([element, collection], next)),
        );

        return next;
    }, initialCollectionNode);

    visitor.addConstraints(new TypeConstraint(node, resultNode));

    node.setCodegen(
        elements.reduce<codegen.CodegenItem>(
            (result, element) => codegen.callExpression(buildCollectionNode, [element, result]),
            initialCollectionNode,
        ),
    );
};
