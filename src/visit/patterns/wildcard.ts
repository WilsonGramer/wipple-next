import { Visit } from "../visitor";
import { Fact } from "../../db";
import { WildcardPattern } from "../../syntax";
import * as codegen from "../../codegen";

export class IsWildcardPattern extends Fact<null> {}

export const visitWildcardPattern: Visit<WildcardPattern> = (visitor, _pattern, node) => {
    visitor.db.add(node, new IsWildcardPattern(null));

    node.setCodegen(codegen.emptyCondition());
};
