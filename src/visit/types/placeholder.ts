import { Visit } from "../visitor";
import { Fact } from "../../db";
import { PlaceholderType } from "../../syntax";

export class IsPlaceholderType extends Fact<null> {}

export const visitPlaceholderType: Visit<PlaceholderType> = (visitor, _type, node) => {
    visitor.db.add(node, new IsPlaceholderType(null));
};
