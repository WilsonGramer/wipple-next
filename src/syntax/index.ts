import assert from "node:assert/strict";
import { Statement } from "./statements";
import * as grammar from "./grammar.js";
import { LocationRange } from "peggy";

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

export type ParseResult<T> =
    | {
          success: true;
          value: T;
      }
    | {
          success: false;
          location: LocationRange;
          message: string;
      };

export const parse = <T>(source: string, startRule: string): ParseResult<T> => {
    try {
        const value = grammar.parse(source, { startRule });
        return { success: true, value };
    } catch (error) {
        if (!(error instanceof grammar.SyntaxError)) {
            throw error;
        }

        return { success: false, location: error.location, message: error.message };
    }
};

type WithoutLocation<T> =
    T extends Record<string, any> ? { [K in keyof Omit<T, "location">]: WithoutLocation<T[K]> } : T;

export const testParse = <T>(rule: string, source: string, expected: WithoutLocation<T>) => {
    const parsed = parse<T>(source, rule);

    const removeLocation = (x: any) => {
        if (x !== null && typeof x === "object") {
            delete x.location;

            for (const key in x) {
                removeLocation(x[key]);
            }
        }
    };

    if (!parsed.success) {
        throw new grammar.SyntaxError(parsed.message, null, null, parsed.location);
    }

    removeLocation(parsed);

    assert.deepStrictEqual(parsed, { success: true, value: expected });
};

export default (path: string, code: string) => {
    const result = parse<SourceFile>(code, "source_file");
    if (result.success) {
        result.value.path = path;
        result.value.code = code;
    }

    return result;
};
