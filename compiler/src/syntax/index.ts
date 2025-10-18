import { expect } from "chai";
import { parseStatements, Statement } from "./statements";
import { Parser, LocationRange } from "./parser";

export { SyntaxError, Location, LocationRange } from "./parser";
export * from "./attributes";
export * from "./constraints";
export * from "./expressions";
export * from "./patterns";
export * from "./statements";
export * from "./tokens";
export * from "./types";

export interface SourceFile {
    path: string;
    code: string;
    location: LocationRange;
    statements: Statement[];
}

type DeepPartial<T> = T extends Record<string, any> ? { [P in keyof T]?: DeepPartial<T[P]> } : T;

export const testParse = <T>(
    rule: (parser: Parser) => T,
    source: string,
    expected: DeepPartial<T>
) => {
    const parsed = rule(new Parser(source));

    const removeLocation = (x: any) => {
        if (x !== null && typeof x === "object") {
            delete x.location;

            for (const key in x) {
                removeLocation(x[key]);
            }
        }
    };

    removeLocation(parsed);

    expect(parsed).to.containSubset(expected);
};

const parseSourceFile = (path: string, code: string): SourceFile => {
    const parser = new Parser(code);

    const sourceFile = parser.withLocation<SourceFile>(() => ({
        path,
        code,
        statements: parseStatements(parser),
    }));

    parser.finish();

    return sourceFile;
};

export default parseSourceFile;
