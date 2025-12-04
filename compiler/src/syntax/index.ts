import { type Db, Fact } from "../db";
import { Node } from "../node";
import type { Visitor } from "../visit";
import { ParseError, Parser } from "./parser";

class SyntaxErrorNode extends Node {
    *children() {}

    visit(_visitor: Visitor): void {}
}

export class SyntaxError extends Fact<ParseError> {
    display(error: ParseError): string {
        return error.message + (error.committed ? ` ${error.committed}` : "");
    }
}

export const parse = <T extends Node>(
    db: Db,
    path: string,
    source: string,
    rule: (parser: Parser) => T,
) => {
    const parser = new Parser(path, source);

    try {
        const result = rule(parser);
        parser.finish();
        return result;
    } catch (e) {
        if (!(e instanceof ParseError)) {
            throw e;
        }

        const node = new SyntaxErrorNode(e.span);
        db.register(node);

        node.facts.set(SyntaxError, e);
    }
};

export const testParse = <T extends Node>(
    rule: (parser: Parser, commit: boolean) => T,
    source: string,
) => {
    const parser = new Parser("test", source);
    const result = rule(parser, true);
    parser.finish();

    const filter = (value: any) => {
        if (Array.isArray(value)) {
            value.forEach(filter);
        } else if (typeof value === "object" && value !== null) {
            if (value instanceof Node) {
                // @ts-expect-error
                delete value.facts;
                // @ts-expect-error
                delete value.isHidden;
            }

            delete value.span;

            for (const [k, v] of Object.entries(value)) {
                if (v === undefined) {
                    delete value[k];
                } else {
                    filter(v);
                }
            }
        }
    };

    filter(result);

    return result;
};
