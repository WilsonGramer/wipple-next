import { joinSpans, nullSpan, type Span } from "../span";
import { lexer, tokenNames, type Token, type TokenType } from "./lexer";

interface Position {
    (): Span;
    index: number;
}

export class ParseError extends Error {
    span: Span;
    committedAt?: string;

    constructor(message: string, span: Span) {
        super(message);
        this.span = span;
    }
}

export class Parser {
    private path: string;
    private source: string;
    private tokens: Token[];

    private index = 0;
    private stack: { committed: string | undefined }[] = [];
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
        if (this.cache.has(this.index)) {
            const cached = this.cache.get(this.index)!.get(key);
            if (cached != null) {
                const [result, newIndex] = cached;
                this.index = newIndex;
                return result;
            }
        }

        const start = this.position();

        const commitEntry = { committed: undefined as string | undefined };
        this.stack.push(commitEntry);

        try {
            for (const option of options) {
                let result: T;
                try {
                    result = option();
                } catch (e) {
                    if (!(e instanceof ParseError) || e.committedAt != null) {
                        throw e;
                    }

                    if (commitEntry.committed != null) {
                        e.committedAt = commitEntry.committed;
                        throw e;
                    } else {
                        this.backtrack(start);
                        continue;
                    }
                }

                if (!this.cache.has(start.index)) {
                    this.cache.set(start.index, new Map());
                }

                this.cache.get(start.index)!.set(key, [result, this.index]);

                return result;
            }
        } finally {
            this.stack.pop();
        }

        this.error(elseMessage);
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
                    if (!(e instanceof ParseError) || e.committedAt != null) {
                        throw e;
                    }

                    this.backtrack(start);
                    break;
                }
            }

            const commitEntry = { committed: undefined as string | undefined };
            this.stack.push(commitEntry);

            let result: T;
            try {
                result = f();
            } catch (e) {
                if (!(e instanceof ParseError) || e.committedAt != null) {
                    throw e;
                }

                if (commitEntry.committed != null) {
                    e.committedAt = commitEntry.committed;
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

    try<T>(f: () => T): T | undefined {
        const commitEntry = { committed: undefined as string | undefined };
        this.stack.push(commitEntry);

        const start = this.position();

        let result: T | undefined;
        try {
            result = f();
        } catch (e) {
            if (!(e instanceof ParseError) || e.committedAt != null) {
                throw e;
            }

            if (commitEntry.committed != null) {
                e.committedAt = commitEntry.committed;
                throw e;
            } else {
                this.backtrack(start);
            }
        } finally {
            this.stack.pop();
        }

        return result;
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

        const result = this.manyN(n, f, () => this.commitToken("lineBreak"));

        this.consumeLineBreaks();

        return result.map(([, result]) => result);
    }

    token(type: TokenType): Token {
        return this._token(type, false);
    }

    commitToken(type: TokenType): Token {
        return this._token(type, true);
    }

    private _token(type: TokenType, commit: boolean): Token {
        const token = this.tokens[this.index];
        if (token == null) {
            this.error(`Expected ${tokenNames[type]}`);
        }

        if (token.type !== type) {
            this.error(`Expected ${tokenNames[type]}, but found ${tokenNames[token.type]}`);
        }

        this.index++;

        if (commit) {
            this.commit();
        }

        return token;
    }

    consumeLineBreaks() {
        while (this.tokens[this.index]?.type === "lineBreak") {
            this.index++;
        }
    }

    commit() {
        if (this.stack.length > 0) {
            this.stack.at(-1)!.committed = new Error().stack;
        }
    }

    error(message: string): never {
        const span = this.tokens[this.index]?.span ?? this.eofSpan();
        throw new ParseError(message, span);
    }

    join(left: Span, right: Span): Span {
        return joinSpans(left, right, this.source);
    }

    eofSpan(): Span {
        return this.tokens[this.tokens.length - 1]?.span ?? nullSpan(this.path);
    }

    finish() {
        if (this.index < this.tokens.length) {
            this.error(`unexpected ${tokenNames[this.tokens[this.index].type]}`);
        }
    }
}

// TODO: commit when `symbol()` succeeds
