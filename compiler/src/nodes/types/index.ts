import { Fact } from "../../db";
import { Node } from "../../node";
import { displayType } from "../../typecheck";
import { Group } from "../../typecheck/solve";
import type { Visitor } from "../../visit";

export class Typed extends Fact<Group> {
    display(group: Group): string {
        return group.types.length > 0
            ? `has type(s) ${group.types.map((type) => "`" + displayType(type) + "`").join(" or ")}`
            : "missing type";
    }
}

export class MissingType extends Fact<null> {
    display(): string {
        return "is missing type";
    }
}

export class ExtraType extends Fact<null> {
    display(): string {
        return "is extra type";
    }
}

export abstract class TypeNode extends Node {
    visit(_visitor: Visitor): void {
        this.facts.set(Typed, Group.empty(this));
    }
}
