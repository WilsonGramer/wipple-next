import { Node } from "../node";
import { FileNode } from "../nodes";
import { Parser } from "./parser";
import { parseStatements } from "./statements";

export const parseFile = (path: string, code: string) => {
    const parser = new Parser(path, code);

    const file = parser.spanned((span) => {
        const statements = parseStatements(parser);
        return new FileNode(statements, span());
    });

    parser.finish();

    return file;
};

export const testParse = <T>(name: string, rule: (parser: Parser) => T, source: string) => {
    test(name, () => {
        const parser = new Parser("test", source);
        const parsed = rule(parser);
        parser.finish();

        const filter = (value: any) => {
            if (Array.isArray(value)) {
                value.forEach(filter);
            } else if (typeof value === "object" && value !== null) {
                if (value instanceof Node) {
                    // @ts-expect-error
                    delete value.facts;
                }

                // eslint-disable-next-line
                delete value.span;

                for (const [k, v] of Object.entries(value)) {
                    if (v === undefined) {
                        // eslint-disable-next-line
                        delete value[k];
                    } else {
                        filter(v);
                    }
                }
            }
        };

        filter(parsed);

        expect(parsed).toMatchSnapshot();
    });
};
