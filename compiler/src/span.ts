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

export const compareSpans = (a: Span, b: Span): number => {
    if (a.path !== b.path) {
        return a.path.localeCompare(b.path);
    }

    if (a.start.offset !== b.start.offset) {
        return a.start.offset - b.start.offset;
    }

    return a.end.offset - b.end.offset;
};
