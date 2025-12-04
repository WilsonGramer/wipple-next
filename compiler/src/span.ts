export interface Span {
    path: string;
    start: Location;
    end: Location;
    source: string;
}

export interface Location {
    line: number;
    column: number;
    offset: number;
}

export const nullSpan = (path: string): Span => ({
    path,
    source: "",
    start: { line: 1, column: 1, offset: 0 },
    end: { line: 1, column: 1, offset: 0 },
});

export const compareSpans = (a: Span, b: Span): number => {
    if (a.path !== b.path) {
        return a.path.localeCompare(b.path);
    }

    if (a.start.offset !== b.start.offset) {
        return a.start.offset - b.start.offset;
    }

    return a.end.offset - b.end.offset;
};

export const joinSpans = (left: Span, right: Span, source: string): Span => ({
    path: left.path,
    start: left.start,
    end: right.end,
    source: source.slice(left.start.offset, right.end.offset),
});

export const displaySpan = (span: Span): string =>
    `${span.path}:${span.start.line}:${span.start.column}`;
