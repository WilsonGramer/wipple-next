import * as moo from "moo";
import { type Span } from "../span";

export interface Token {
    span: Span;
    type: TokenType;
    value: string;
}

export class SyntaxError extends Error {
    span: Span;

    constructor(message: string, context: string | undefined, span: Span) {
        super(
            `${span.path}:${span.start.line}:${span.start.column}: syntax error: ${message}${context ? ` in this ${context}` : ""}`,
        );
        this.span = span;
    }
}

const keywords = {
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
};

const rules = {
    space: /[ \t]+/,
    lineBreak: { match: /\n+/, lineBreaks: true },
    comment: { match: /--.*/, value: (s: string) => s.slice(2) },
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
        value: (s: string) => s.slice(1, -1),
    },
    capitalName: /(?:\d+-)*[A-Z][A-Za-z0-9_]*(?:-[A-Za-z0-9_]+)*(?:[!?])?/,
    lowercaseName: {
        match: /(?:\d+-)*[A-Za-z0-9_]+(?:-[A-Za-z0-9_]+)*(?:[!?])?/,
        type: moo.keywords(keywords),
    },
};

export type TokenType = keyof typeof rules | keyof typeof keywords;

const tokenNames: Record<TokenType, string> = {
    space: "space",
    lineBreak: "line break",
    comment: "comment",
    typeFunctionOperator: "`=>`",
    annotateOperator: "`::`",
    assignOperator: "`:`",
    functionOperator: "`->`",
    lessThanOrEqualOperator: "`<=`",
    greaterThanOrEqualOperator: "`>=`",
    notEqualOperator: "`/=`",
    powerOperator: "`^`",
    multiplyOperator: "`*`",
    divideOperator: "`/`",
    remainderOperator: "`%`",
    addOperator: "`+`",
    subtractOperator: "`-`",
    lessThanOperator: "`<`",
    greaterThanOperator: "`>`",
    equalOperator: "`=`",
    applyOperator: "`.`",
    tupleOperator: "`;`",
    collectionOperator: "`,`",
    leftParenthesis: "`(`",
    rightParenthesis: "`)`",
    leftBracket: "`[`",
    rightBracket: "`]`",
    leftBrace: "`{`",
    rightBrace: "`}`",
    number: "number",
    string: "string",
    capitalName: "name",
    lowercaseName: "name",
    underscoreKeyword: "`_`",
    doKeyword: "`do`",
    inferKeyword: "`infer`",
    instanceKeyword: "`instance`",
    intrinsicKeyword: "`intrinsic`",
    setKeyword: "`set`",
    traitKeyword: "`trait`",
    typeKeyword: "`type`",
    whenKeyword: "`when`",
    whereKeyword: "`where`",
    asOperator: "`as`",
    toOperator: "`to`",
    byOperator: "`by`",
    isOperator: "`is`",
    andOperator: "`and`",
    orOperator: "`or`",
};

const lexer = moo.compile(rules);

export class Parser {
    private path: string;
    private source: string;
    private tokens: Token[];

    private stack: { committed: boolean }[] = [];
    private cache: Map<number, Map<Function, [any, number]>> = new Map();

    private index = 0;
    private context?: string;
    private furthestError?: { index: number; error: SyntaxError };

    constructor(path: string, source: string) {
        this.path = path;
        this.source = source;
        lexer.reset(source);

        this.tokens = Iterator.from<moo.Token>(lexer)
            .filter((token) => token.type !== "space")
            .map((token) => ({
                type: token.type as TokenType,
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

    spanned<T>(context: string, f: (span: () => Span) => T): T {
        const span = () => this.tokens[this.index]?.span ?? nullSpan(this.path);

        const start = span().start;

        const prevContext = this.context;
        this.context = context;

        const result = f(() => {
            const end = span().end;
            const source = this.slice(start.offset, end.offset);
            return { path: this.path, source, start, end };
        });

        this.context = prevContext;

        return result;
    }

    delimited<T>(left: TokenType, right: TokenType, f: () => T): T {
        this.next(left);
        this.try("lineBreak");
        const result = f();
        this.try("lineBreak");

        const initialIndex = this.index;
        try {
            this.next(right);
        } catch (e) {
            if (!(e instanceof SyntaxError)) {
                throw e;
            } else {
                this.throwAndReset(
                    initialIndex,
                    `expected '${tokenNames[right]}' to close '${tokenNames[left]}'`,
                    true,
                );
            }
        }

        return result;
    }

    collection<T>(
        expected: string,
        separators: TokenType[],
        f: (parser: Parser) => T,
        operator = false,
    ): [T, Token | undefined][] {
        this.try("lineBreak");

        if (this.try(...separators) != null) {
            // Empty collection
            return [];
        }

        const initialIndex = this.index;
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

            try {
                const element = f(this);
                elements.push([element, separator]);
                hasTrailingSeparator = false;
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

        const minElements = hasTrailingSeparator ? 1 : 2;

        if (elements.length < minElements) {
            this.throwAndReset(initialIndex, `expected ${expected}`, false);
        }

        return elements;
    }

    many<T>(expected: string, f: (parser: Parser) => T, separators: TokenType[] = []): T[] {
        const initialIndex = this.index;

        const results: T[] = [];
        while (true) {
            this.try(...separators);

            let result: T;
            try {
                result = f(this);
            } catch (e) {
                if (!(e instanceof SyntaxError)) {
                    throw e;
                } else {
                    break;
                }
            }

            results.push(result);
        }

        if (results.length === 0) {
            this.throwAndReset(initialIndex, `expected ${expected}`, false);
        }

        return results;
    }

    alternatives<T>(
        expected: string,
        key: Function | undefined,
        alternatives: ((parser: Parser) => T)[],
    ): T {
        if (!this.cache.has(this.index)) {
            this.cache.set(this.index, new Map());
        }

        const cached = this.cache.get(this.index)!;
        if (key != null && cached.has(key)) {
            const [result, index] = cached.get(key)!;
            this.index = index;
            return result as T;
        }

        const initialIndex = this.index;

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

        this.throwAndReset(initialIndex, `expected ${expected}`, false);
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

    next(...types: TokenType[]): string {
        const expected = types.map((type) => tokenNames[type]).join(" or ");

        const token = this.tokens[this.index];
        if (token == null || !types.includes(token.type)) {
            this.throwAndReset(this.index, `expected ${expected}`, true);
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
        try {
            const token = this.tokens[this.index];
            if (token != null) {
                this.throwAndReset(this.index, `unexpected ${tokenNames[token.type]}`, true);
            }
        } catch (e) {
            if (!(e instanceof SyntaxError)) {
                throw e;
            }
        }

        if (this.furthestError != null) {
            throw this.furthestError.error;
        }
    }

    private throwAndReset(index: number, message: string, priority: boolean): never {
        const token = this.tokens[this.index - 1];

        const error = new SyntaxError(message, this.context, token?.span ?? nullSpan(this.path));

        if (
            this.furthestError == null ||
            (priority
                ? this.index >= this.furthestError.index
                : this.index > this.furthestError.index)
        ) {
            this.furthestError = { index: this.index, error };
        }

        this.index = index;

        throw error;
    }
}

export const nullSpan = (path: string) => ({
    path,
    source: "",
    start: { line: 1, column: 1, offset: 0 },
    end: { line: 1, column: 1, offset: 0 },
});
