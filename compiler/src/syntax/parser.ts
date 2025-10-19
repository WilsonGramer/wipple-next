import * as moo from "moo";

export interface Location {
    line: number;
    column: number;
    offset: number;
}

export interface LocationRange {
    path: string;
    source: any;
    start: Location;
    end: Location;
}

export interface Token {
    type: string;
    location: LocationRange;
    value: string;
}

export class SyntaxError extends Error {
    location: LocationRange;

    constructor(message: string, location: LocationRange) {
        super(`${location.start.line}:${location.start.column}: syntax error: ${message}`);
        this.location = location;
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
    private allowLineBreaks = true;

    constructor(path: string, source: string) {
        this.path = path;
        this.source = source;
        lexer.reset(source);

        this.tokens = Iterator.from<moo.Token>(lexer)
            .filter((token) => token.type !== "space")
            .map(
                (token): Token => ({
                    type: token.type!,
                    location: {
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
                }),
            )
            .toArray();

        this.consume();
    }

    withLocation<T>(f: () => Omit<T, "location">): T & { location: LocationRange } {
        const startIndex = this.index;
        const result = f();
        const endIndex = this.index;

        const start = this.tokens[startIndex]?.location.start ?? nullLocationRange(this.path).start;
        const end = this.tokens[endIndex - 1]?.location.end ?? nullLocationRange(this.path).end;
        const source = this.slice(start.offset, end.offset);

        return {
            ...(result as any),
            location: {
                path: this.path,
                source,
                start,
                end,
            } satisfies LocationRange,
        };
    }

    delimited<T>(left: string, right: string, f: () => T): T {
        const initialIndex = this.index;
        try {
            this.next(left);
            this.allowingLineBreaks(true, () => this.consume());
            const result = f();
            this.allowingLineBreaks(true, () => this.consume());
            this.next(right);
            return result;
        } catch (e) {
            this.index = initialIndex;
            throw e;
        }
    }

    collection<T, S extends string[]>(
        expected: string,
        separators: [...S],
        f: (parser: Parser) => T,
        operator = false,
    ): [T, S[number] | undefined][] {
        const empty = (parser: Parser) =>
            parser.delimited("leftParenthesis", "rightParenthesis", () => {
                parser.next(...separators);
                return [];
            });

        const nonEmpty = (parser: Parser) => {
            const elements: [T, S[number] | undefined][] = [[f(parser), undefined]];
            while (true) {
                const separator = parser.allowingLineBreaks(true, () => parser.try(...separators));
                if (separator == null) {
                    break;
                }

                try {
                    const element = f(parser);
                    elements.push([element, separator]);
                } catch (e) {
                    if (!(e instanceof SyntaxError)) {
                        throw e;
                    }

                    break;
                }
            }

            if (operator) {
                return elements;
            }

            const hasTrailingSeparator = parser.try(...separators); // trailing separator

            const minElements = hasTrailingSeparator ? 1 : 2;

            if (elements.length < minElements) {
                throw new SyntaxError(
                    `expected ${expected} here`,
                    this.tokens[this.index - 1]?.location ?? nullLocationRange(this.path),
                );
            }

            return elements;
        };

        return operator ? nonEmpty(this) : this.alternatives(expected, [empty, nonEmpty]);
    }

    many<T>(expected: string, f: (parser: Parser) => T, separator?: string): T[] {
        const results: T[] = [];
        while (true) {
            if (separator != null) {
                while (this.try(separator));
            }

            const entry = { committed: false };
            this.stack.push(entry);

            const initialIndex = this.index;

            let result: T;
            try {
                result = f(this);
            } catch (e) {
                if (!(e instanceof SyntaxError) || entry.committed) {
                    this.stack.pop();
                    throw e;
                } else {
                    this.index = initialIndex;
                    break;
                }
            }

            this.stack.pop();
            results.push(result);
        }

        if (results.length === 0) {
            throw new SyntaxError(
                `expected ${expected} here`,
                this.tokens[this.index - 1]?.location ?? nullLocationRange(this.path),
            );
        }

        return results;
    }

    alternatives<T>(expected: string, alternatives: ((parser: Parser) => T)[]): T {
        const entry = { committed: false };
        this.stack.push(entry);

        for (const f of alternatives) {
            const initialIndex = this.index;

            try {
                const result = f(this);
                this.stack.pop();
                return result;
            } catch (e) {
                if (!(e instanceof SyntaxError) || entry.committed) {
                    this.stack.pop();
                    throw e;
                } else {
                    this.index = initialIndex;
                    continue;
                }
            }
        }

        this.stack.pop();

        throw new SyntaxError(
            `expected ${expected} here`,
            this.tokens[this.index - 1]?.location ?? nullLocationRange(this.path),
        );
    }

    optional<T>(expected: string, f: (parser: Parser) => T, defaultValue: T): T {
        return this.alternatives(expected, [f, () => defaultValue]);
    }

    commit() {
        this.stack.at(-1)!.committed = true;
    }

    allowingLineBreaks<T>(allow: boolean, f: () => T): T {
        const prevAllowLineBreaks = this.allowLineBreaks;
        this.allowLineBreaks = allow;
        const result = f();
        this.allowLineBreaks = prevAllowLineBreaks;
        return result;
    }

    try<S extends string[]>(...types: [...S]): S[number] | undefined {
        const token = this.tokens[this.index];
        if (token == null || !types.includes(token.type)) {
            return undefined;
        }

        this.index++;
        this.consume();

        return token.type;
    }

    next(...types: string[]): Token {
        const token = this.tokens[this.index];
        if (token == null) {
            throw new SyntaxError(
                `expected ${types.join(" or ")} here`,
                this.tokens[this.tokens.length - 1]?.location ?? nullLocationRange(this.path),
            );
        }

        if (!types.includes(token.type)) {
            throw new SyntaxError(
                `expected ${types.join(" or ")} but found ${token.type}`,
                token.location,
            );
        }

        this.index++;
        this.consume();

        return {
            type: token.type,
            location: token.location,
            value: token.value,
        };
    }

    slice(start: number, end: number): string {
        return this.source.slice(start, end);
    }

    finish() {
        const token = this.tokens[this.index];
        if (token != null) {
            throw new SyntaxError(`unexpected ${token.type}`, token.location);
        }
    }

    private consume() {
        while (true) {
            const token = this.tokens[this.index];
            if (token == null) {
                break;
            }

            if (this.allowLineBreaks && token.type === "lineBreak") {
                this.index++;
            } else {
                break;
            }
        }
    }
}

const nullLocationRange = (path: string): LocationRange => ({
    path,
    source: "",
    start: { line: 1, column: 1, offset: 0 },
    end: { line: 1, column: 1, offset: 0 },
});
