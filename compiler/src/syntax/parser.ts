import * as moo from "moo";
import type { Span } from "../span";
import type { Node } from "../node";
import type { Db } from "../db";

export interface Token {
    span: Span;
    type: string;
    value: string;
}

export class SyntaxError extends Error {
    span: Span;

    constructor(message: string, span: Span) {
        super(`${span.path}:${span.start.line}:${span.start.column}: syntax error: ${message}`);
        this.span = span;
    }
}

const lexer = moo.compile({
    space: /[ \t]+/,
    lineBreak: { match: /\n+/, lineBreaks: true },
    comment: { match: /--.*/, value: (s) => s.slice(2) },
    typeFunctionOperator: "=>",
    annotateOperator: "::",
    assignOperator: ":",
    functionOperator: "->",
    lessThanOrEqualOperator: "<=",
    greaterThanOrEqualOperator: ">=",
    notEqualOperator: "/=",
    powerOperator: "^",
    multiplyOperator: "*",
    divideOperator: "/",
    remainderOperator: "%",
    addOperator: "+",
    subtractOperator: "-",
    lessThanOperator: "<",
    greaterThanOperator: ">",
    equalOperator: "=",
    applyOperator: ".",
    tupleOperator: ";",
    collectionOperator: ",",
    leftParenthesis: "(",
    rightParenthesis: ")",
    leftBracket: "[",
    rightBracket: "]",
    leftBrace: "{",
    rightBrace: "}",
    number: /[+-]?\d+(?:\.\d+)?/,
    string: {
        match: /"[^"]*"|'[^']*'/,
        value: (s) => s.slice(1, -1),
    },
    capitalName: /(?:\d+-)*[A-Z][A-Za-z0-9_]*(?:-[A-Za-z0-9_]+)*(?:[!?])?/,
    lowercaseName: {
        match: /(?:\d+-)*[A-Za-z0-9_]+(?:-[A-Za-z0-9_]+)*(?:[!?])?/,
        type: moo.keywords({
            underscoreKeyword: "_",
            doKeyword: "do",
            inferKeyword: "infer",
            instanceKeyword: "instance",
            intrinsicKeyword: "intrinsic",
            setKeyword: "set",
            traitKeyword: "trait",
            typeKeyword: "type",
            whenKeyword: "when",
            whereKeyword: "where",
            asOperator: "as",
            toOperator: "to",
            byOperator: "by",
            isOperator: "is",
            andOperator: "and",
            orOperator: "or",
        }),
    },
});

export class Parser {
    private path: string;
    private source: string;
    private tokens: Token[];
    private index = 0;
    private stack: { committed: boolean }[] = [];
    private cache: Map<number, Map<Function, [any, number]>> = new Map();

    constructor(path: string, source: string) {
        this.path = path;
        this.source = source;
        lexer.reset(source);

        this.tokens = Iterator.from<moo.Token>(lexer)
            .filter((token) => token.type !== "space")
            .map((token) => ({
                type: token.type!,
                span: {
                    path,
                    start: {
                        offset: token.offset,
                        line: token.line,
                        column: token.col,
                    },
                    end: {
                        offset: token.offset + token.text.length,
                        line: token.line, // TODO: handle line breaks?
                        column: token.col + token.text.length,
                    },
                    source: token.text,
                },
                value: token.value,
            }))
            .toArray();
    }

    spanned<T>(f: (span: () => Span) => T): T {
        const startIndex = this.index;
        return f(() => {
            const endIndex = this.index;

            const start = this.tokens[startIndex]?.span.start ?? nullSpan(this.path).start;

            const end = this.tokens[endIndex - 1]?.span.end ?? nullSpan(this.path).end;

            const source = this.slice(start.offset, end.offset);

            return {
                path: this.path,
                source,
                start,
                end,
            };
        });
    }

    delimited<T>(left: string, right: string, f: () => T): T {
        this.next(left);
        this.try("lineBreak");
        const result = f();
        this.try("lineBreak");
        this.next(right);
        return result;
    }

    collection<T>(
        expected: string,
        separators: string[],
        f: (parser: Parser) => T,
        operator = false,
    ): [T, Token | undefined][] {
        const initialIndex = this.index;

        this.try("lineBreak");

        if (this.try(...separators) != null) {
            // Empty collection
            return [];
        }

        const elements: [T, Token | undefined][] = [[f(this), undefined]];
        let hasTrailingSeparator = false;
        while (true) {
            this.try("lineBreak");

            const separator = this.try(...separators);
            if (separator == null) {
                break;
            } else {
                hasTrailingSeparator = true;
            }

            this.try("lineBreak");

            const initialIndex = this.index;
            try {
                const element = f(this);
                elements.push([element, separator]);
                hasTrailingSeparator = false;
            } catch {
                this.index = initialIndex;
                break;
            }
        }

        if (operator) {
            return elements;
        }

        const minElements = hasTrailingSeparator ? 1 : 2;

        if (elements.length < minElements) {
            const token = this.tokens[this.index - 1];
            this.index = initialIndex;

            throw new SyntaxError(`expected ${expected} here`, token?.span ?? nullSpan(this.path));
        }

        return elements;
    }

    many<T>(expected: string, f: (parser: Parser) => T, separators: string[] = []): T[] {
        const initialIndex = this.index;

        const results: T[] = [];
        while (true) {
            this.try(...separators);

            const initialIndex = this.index;

            let result: T;
            try {
                result = f(this);
            } catch (e) {
                if (!(e instanceof SyntaxError)) {
                    throw e;
                } else {
                    this.index = initialIndex;
                    break;
                }
            }

            results.push(result);
        }

        if (results.length === 0) {
            const token = this.tokens[this.index - 1];
            this.index = initialIndex;

            throw new SyntaxError(`expected ${expected} here`, token?.span ?? nullSpan(this.path));
        }

        return results;
    }

    alternatives<T>(
        expected: string,
        key: Function | undefined,
        alternatives: ((parser: Parser) => T)[],
    ): T {
        const initialIndex = this.index;

        if (!this.cache.has(initialIndex)) {
            this.cache.set(initialIndex, new Map());
        }

        const cached = this.cache.get(initialIndex)!;
        if (key != null && cached.has(key)) {
            const [result, index] = cached.get(key)!;
            this.index = index;
            return result as T;
        }

        const entry = { committed: false };
        this.stack.push(entry);

        for (const f of alternatives) {
            this.index = initialIndex;

            try {
                const result = f(this);
                this.stack.pop();

                if (key != null) {
                    cached.set(key, [result, this.index]);
                }

                return result;
            } catch (e) {
                if (!(e instanceof SyntaxError) || entry.committed) {
                    this.stack.pop();
                    throw e;
                } else {
                    continue;
                }
            }
        }

        this.stack.pop();

        const token = this.tokens[this.index - 1];
        this.index = initialIndex;

        throw new SyntaxError(`expected ${expected} here`, token?.span ?? nullSpan(this.path));
    }

    optional<T>(f: (parser: Parser) => T, defaultValue: T): T {
        const initialIndex = this.index;
        try {
            return f(this);
        } catch (e) {
            if (!(e instanceof SyntaxError)) {
                throw e;
            }

            this.index = initialIndex;
            return defaultValue;
        }
    }

    commit() {
        this.stack.at(-1)!.committed = true;
    }

    try<S extends string[]>(...types: [...S]): Token | undefined {
        const token = this.tokens[this.index];
        if (token == null || !types.includes(token.type)) {
            return undefined;
        }

        this.index++;

        return token;
    }

    next(...types: string[]): string {
        const token = this.tokens[this.index];
        if (token == null) {
            throw new SyntaxError(
                `expected ${types.join(" or ")} here`,
                this.tokens[this.tokens.length - 1]?.span ?? nullSpan(this.path),
            );
        }

        if (!types.includes(token.type)) {
            throw new SyntaxError(
                `expected ${types.join(" or ")} but found ${token.type}`,
                token.span,
            );
        }

        this.index++;

        return token.value;
    }

    slice(start: number, end: number): string {
        return this.source.slice(start, end);
    }

    join(left: Span, right: Span): Span {
        return {
            path: left.path,
            source: this.source.slice(left.start.offset, right.end.offset),
            start: left.start,
            end: right.end,
        };
    }

    finish() {
        const token = this.tokens[this.index];
        if (token != null) {
            throw new SyntaxError(`unexpected ${token.type}`, token.span);
        }
    }
}

export const nullSpan = (path: string) => ({
    path,
    source: "",
    start: { line: 1, column: 1, offset: 0 },
    end: { line: 1, column: 1, offset: 0 },
});
