import { Node } from "../../node";
import type { Span } from "../../span";

export abstract class StatementNode extends Node {
    comments: string[];

    constructor(comments: string[], span: Span) {
        super(span);
        this.comments = comments;
    }
}
