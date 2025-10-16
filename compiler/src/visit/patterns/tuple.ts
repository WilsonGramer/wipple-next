import { Visit } from "../visitor";
import { Fact, Node } from "../../db";
import { TuplePattern } from "../../syntax";
import { visitPattern } from ".";
import * as codegen from "../../codegen";
import { TypeConstraint, types } from "../../typecheck";

export class IsTuplePattern extends Fact<null> {}
export class ElementInTuplePattern extends Fact<Node> {}

export const visitTuplePattern: Visit<TuplePattern> = (visitor, expression, node) => {
    visitor.db.add(node, new IsTuplePattern(null));

    const elements = expression.elements.map((pattern, index) => {
        const temporary = visitor.node(pattern);
        visitor.currentMatch.temporaries.push(temporary);
        visitor.currentMatch.conditions.push(
            codegen.elementCondition(temporary, visitor.currentMatch.value, index),
        );

        const [element, { conditions, temporaries }] = visitor.withMatchValue(temporary, () =>
            visitor.visit(pattern, ElementInTuplePattern, visitPattern),
        );

        visitor.currentMatch.conditions.push(...conditions);
        visitor.currentMatch.temporaries.push(...temporaries);

        return element;
    });

    visitor.addConstraints(new TypeConstraint(node, types.tuple(elements)));
};
