import { Visit } from "../visitor";
import { Fact } from "../../db";
import { WildcardPattern } from "../../syntax";

export class IsWildcardPattern extends Fact<null> {}

export const visitWildcardPattern: Visit<WildcardPattern> = (visitor, _pattern, node) => {
    visitor.db.add(node, new IsWildcardPattern(null));
};
