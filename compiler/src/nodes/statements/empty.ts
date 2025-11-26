import type { Node } from "../../node";
import type { Visitor } from "../../visit";
import { StatementNode } from "./index";

export class EmptyStatementNode extends StatementNode {
    *children(): Generator<Node> {}

    visit(_visitor: Visitor): void {
        throw new Error("empty statements should be filtered out");
    }
}
