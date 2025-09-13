import { Visit } from "../visitor";
import { Fact } from "../../db";
import { VariablePattern } from "../../syntax";

export class IsVariablePattern extends Fact<null> {}

export const visitVariablePattern: Visit<VariablePattern> = (visitor, pattern, node) => {
    visitor.defineName(pattern.variable.value, { type: "variable", node });

    visitor.db.add(node, new IsVariablePattern(null));
};
