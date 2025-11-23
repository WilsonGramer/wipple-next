import { Node } from "../../node";
import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import type { AttributeValue } from "./value";

export class AttributeNode extends Node {
    name: string;
    value: AttributeValue | undefined;

    constructor(name: string, value: AttributeValue | undefined, span: Span) {
        super(span);
        this.name = name;
        this.value = value;
    }

    visit(_visitor: Visitor): void {}
}
