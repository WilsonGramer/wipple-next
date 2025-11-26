import type { Visitor } from "../../visit";
import { StatementNode } from "./index";
import type { Node } from "../../node";

export class EmptyStatementNode extends StatementNode {
    *children(): Generator<Node> {}

    visit(_visitor: Visitor): void {
        throw new Error("empty statements should be filtered out");
    }
}
