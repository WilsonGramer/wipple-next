import type { Span } from "../../span";

export type AttributeValue = StringAttributeValue;

export class StringAttributeValue {
    span: Span;
    value: string;

    constructor(value: string, span: Span) {
        this.span = span;
        this.value = value;
    }

    copy() {
        return new StringAttributeValue(this.value, this.span);
    }
}
