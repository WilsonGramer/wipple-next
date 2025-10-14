import { Visit } from "../visitor";
import { Fact, Node } from "../../db";
import { OrPattern } from "../../syntax";
import { visitPattern } from ".";
import { TypeConstraint } from "../../typecheck";
import * as codegen from "../../codegen";

export class IsOrPattern extends Fact<null> {}
export class PatternInOrPattern extends Fact<Node> {}

export const visitOrPattern: Visit<OrPattern> = (visitor, expression, node) => {
    const temporary = visitor.node(expression);
    visitor.currentMatch.temporaries.push(temporary);

    const patterns = expression.patterns.map((pattern) =>
        visitor.withMatchValue(temporary, () =>
            visitor.visit(pattern, PatternInOrPattern, visitPattern),
        ),
    );

    visitor.db.add(node, new IsOrPattern(null));

    for (const [pattern] of patterns) {
        visitor.addConstraints(new TypeConstraint(node, pattern));
    }

    visitor.currentMatch.temporaries.push(
        ...patterns.flatMap(([, { temporaries }]) => temporaries),
    );

    visitor.currentMatch.conditions.push(
        codegen.assignCondition(temporary, visitor.currentMatch.value),
        codegen.orCondition(patterns.map(([, { conditions }]) => conditions)),
    );
};
