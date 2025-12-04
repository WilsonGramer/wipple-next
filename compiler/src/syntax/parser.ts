import { joinSpans, nullSpan, type Span } from "../span";
import { lexer, tokenNames, type Token, type TokenType } from "./lexer";

interface Position {
    (): Span;
    index: number;
}

// NOTE: `ParseError` deliberately does not extend `Error` because constructing
// `Error`s is expensive
export class ParseError {
    message: string;
    reason: string | undefined;
    span: Span;

    committed?: string;

    constructor(message: string, reason: string | undefined, span: Span) {
        this.message = message;
        this.reason = reason;
        this.span = span;
    }
}

interface CommitEntry {
    committed?: string;
}

export class Parser {
    private path: string;
    private source: string;
    private tokens: Token[];

    private index = 0;
    private stack: CommitEntry[] = [];
    private cache: Map<number, Map<Function, [any, number]>> = new Map();

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

    position(): Position {
        const startIndex = this.index;

        const position: Position = () => {
            const start = this.tokens[startIndex]?.span ?? this.eofSpan();
            const end = this.tokens[this.index - 1]?.span ?? this.eofSpan();
            return this.join(start, end);
        };

        position.index = startIndex;

        return position;
    }

    private backtrack(position: Position) {
        this.index = position.index;
    }

    or<T>(key: Function, options: (() => T)[], elseMessage: string): T {
        return this.cached(key, () => {
            const start = this.position();

            const commitEntry: CommitEntry = {};
            this.stack.push(commitEntry);

            try {
                for (const option of options) {
                    let result: T;
                    try {
                        result = option();
                    } catch (e) {
                        if (!(e instanceof ParseError) || e.committed != null) {
                            throw e;
                        }

                        if (commitEntry.committed != null) {
                            e.committed = commitEntry.committed;
                            throw e;
                        } else {
                            this.backtrack(start);
                            continue;
                        }
                    }

                    return result;
                }
            } finally {
                this.stack.pop();
            }

            this.error(elseMessage);
        });
    }

    many<T>(f: () => T, separator: undefined): T[];
    many<T, S>(f: () => T, separator: () => S): [S | undefined, T][];
    many<T, S>(f: () => T, separator: (() => S) | undefined) {
        let first = true;

        const results: [S | undefined, T][] = [];
        while (true) {
            const start = this.position();

            let separatorResult: S | undefined;
            if (!first && separator != null) {
                try {
                    separatorResult = separator();
                } catch (e) {
                    if (!(e instanceof ParseError) || e.committed != null) {
                        throw e;
                    }

                    this.backtrack(start);
                    break;
                }
            }

            const commitEntry: CommitEntry = {};
            this.stack.push(commitEntry);

            let result: T;
            try {
                result = f();
            } catch (e) {
                if (!(e instanceof ParseError) || e.committed != null) {
                    throw e;
                }

                if (commitEntry.committed != null) {
                    e.committed = commitEntry.committed;
                    throw e;
                } else {
                    this.backtrack(start);
                    break;
                }
            } finally {
                this.stack.pop();
            }

            results.push([separatorResult, result]);

            first = false;
        }

        return separator != null ? results : results.map(([, element]) => element);
    }

    manyN<T>(n: number, f: () => T, separator: undefined): T[];
    manyN<T, S>(n: number, f: () => T, separator: () => S): [S | undefined, T][];
    manyN<T, S>(n: number, f: () => T, separator: (() => S) | undefined) {
        const results = this.many(f, separator as any);
        if (results.length < n) {
            this.error(`expected at least ${n} items`);
        }

        return results;
    }

    lines<T>(f: () => T, { requireLineBreaks = true } = {}): T[] {
        this.consumeLineBreaks();

        const result = requireLineBreaks
            ? this.many(f, () => this.token("lineBreak"))
            : this.many(f, () => this.consumeLineBreaks());

        this.consumeLineBreaks();

        return result.map(([, result]) => result);
    }

    linesN<T>(n: number, f: () => T) {
        this.consumeLineBreaks();

        const result = this.manyN(n, f, () => this.token("lineBreak"));

        this.consumeLineBreaks();

        return result.map(([, result]) => result);
    }

    try<T>(f: () => T): T | undefined {
        const commitEntry: CommitEntry = {};
        this.stack.push(commitEntry);

        const start = this.position();

        let result: T | undefined;
        try {
            result = f();
        } catch (e) {
            if (!(e instanceof ParseError) || e.committed != null) {
                throw e;
            }

            if (commitEntry.committed != null) {
                e.committed = commitEntry.committed;
                throw e;
            } else {
                this.backtrack(start);
            }
        } finally {
            this.stack.pop();
        }

        return result;
    }

    token(type: TokenType, reason?: string): Token {
        return this._token(type, undefined, undefined, reason);
    }

    tokenWithName(type: TokenType, name: string, reason?: string): Token {
        return this._token(type, name, undefined, reason);
    }

    commitToken(type: TokenType, trace: string): Token {
        return this._token(type, undefined, trace);
    }

    private _token(
        type: TokenType,
        name: string | undefined,
        commitTrace: string | undefined,
        reason?: string,
    ): Token {
        const token = this.tokens[this.index];
        if (token == null) {
            this.error(`Expected ${name ?? tokenNames[type]}`, reason);
        }

        if (token.type !== type) {
            this.error(
                `Expected ${name ?? tokenNames[type]}, but found ${tokenNames[token.type]}`,
                reason,
            );
        }

        this.index++;

        if (commitTrace != null) {
            this.commit(commitTrace);
        }

        return token;
    }

    consumeLineBreaks() {
        while (this.tokens[this.index]?.type === "lineBreak") {
            this.index++;
        }
    }

    commit(trace: string) {
        if (this.stack.length > 0) {
            this.stack.at(-1)!.committed = trace;
        }
    }

    error(message: string, reason?: string): never {
        const span = this.tokens[this.index]?.span ?? this.eofSpan();

        // (See comment on `ParseError`)
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw new ParseError(message, reason, span);
    }

    private cached<T>(key: Function, f: () => T): T {
        if (this.cache.has(this.index)) {
            const cached = this.cache.get(this.index)!;
            if (cached.has(key)) {
                const [result, newIndex] = cached.get(key)!;
                this.index = newIndex;
                return result;
            }
        }

        const start = this.position();
        const result = f();

        if (!this.cache.has(start.index)) {
            this.cache.set(start.index, new Map());
        }

        this.cache.get(start.index)!.set(key, [result, this.index]);

        return result;
    }

    join(left: Span, right: Span): Span {
        return joinSpans(left, right, this.source);
    }

    private eofSpan(): Span {
        return this.tokens[this.tokens.length - 1]?.span ?? nullSpan(this.path);
    }

    finish() {
        if (this.index < this.tokens.length) {
            this.error(`Unexpected ${tokenNames[this.tokens[this.index].type]}`);
        }
    }
}
