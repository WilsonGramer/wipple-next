import { Node } from "../../node";
import type { Span } from "../../span";
import type { Visitor } from "../../visit";

export class StatementNode extends Node {
    comments: string[];

    constructor(comments: string[], span: Span) {
        super(span);
        this.comments = comments;
    }

    visit(_visitor: Visitor): void {}
}
