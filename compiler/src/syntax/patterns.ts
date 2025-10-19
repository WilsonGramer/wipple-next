import { Parser, LocationRange, Token } from "./parser";
import {
    parseConstructorName,
    parseNumber,
    parseString,
    parseTypeName,
    parseVariableName,
} from "./tokens";
import { parseTypeElement, Type } from "./types";

export type Pattern =
    | UnitPattern
    | WildcardPattern
    | VariablePattern
    | NumberPattern
    | StringPattern
    | StructurePattern
    | SetPattern
    | ConstructorPattern
    | OrPattern
    | TuplePattern
    | AnnotatePattern;

let patterns: ((parser: Parser) => Pattern)[];
export const parsePattern = (parser: Parser): Pattern => {
    if (patterns === undefined) {
        patterns = [parseTuplePattern, parseOrPattern, parseAnnotatePattern, parsePatternElement];
    }

    return parser.alternatives<Pattern>("pattern", patterns);
};

let patternElements: ((parser: Parser) => Pattern)[];
export const parsePatternElement = (parser: Parser): Pattern => {
    if (patternElements === undefined) {
        patternElements = [
            parseStructurePattern,
            parseConstructorPattern,
            parseSetPattern,
            parseAtomicPattern,
        ];
    }

    return parser.alternatives<Pattern>("pattern", patternElements);
};

let atomicPatterns: ((parser: Parser) => Pattern)[];
export const parseAtomicPattern = (parser: Parser): Pattern => {
    if (atomicPatterns === undefined) {
        atomicPatterns = [
            parseWildcardPattern,
            parseVariablePattern,
            parseNumberPattern,
            parseStringPattern,
            parseUnitPattern,
            parseParenthesizedPattern,
        ];
    }

    return parser.alternatives<Pattern>("pattern", atomicPatterns);
};

export const parseParenthesizedPattern = (parser: Parser): Pattern =>
    parser.withLocation(() =>
        parser.delimited("leftParenthesis", "rightParenthesis", () => parsePattern(parser)),
    );

export interface WildcardPattern {
    type: "wildcard";
    location: LocationRange;
}

export const parseWildcardPattern = (parser: Parser): WildcardPattern =>
    parser.withLocation(() => {
        parser.next("underscoreKeyword");
        return { type: "wildcard" };
    });

export interface VariablePattern {
    type: "variable";
    location: LocationRange;
    variable: Token;
}

export const parseVariablePattern = (parser: Parser): VariablePattern =>
    parser.withLocation(() => ({
        type: "variable",
        variable: parseVariableName(parser),
    }));

export interface NumberPattern {
    type: "number";
    location: LocationRange;
    value: Token;
}

export const parseNumberPattern = (parser: Parser): NumberPattern =>
    parser.withLocation(() => ({
        type: "number",
        value: parseNumber(parser),
    }));

export interface StringPattern {
    type: "string";
    location: LocationRange;
    value: Token;
}

export const parseStringPattern = (parser: Parser): StringPattern =>
    parser.withLocation(() => ({
        type: "string",
        value: parseString(parser),
    }));

export interface StructurePattern {
    type: "structure";
    location: LocationRange;
    name: Token;
    fields: StructurePatternField[];
}

export const parseStructurePattern = (parser: Parser): StructurePattern =>
    parser.withLocation(() => ({
        type: "structure",
        name: parseTypeName(parser),
        fields: parser.delimited("leftBrace", "rightBrace", () =>
            parser.many("field", parseStructurePatternField, ["lineBreak"]),
        ),
    }));

export interface StructurePatternField {
    location: LocationRange;
    name: Token;
    value: Pattern;
}

export const parseStructurePatternField = (parser: Parser): StructurePatternField =>
    parser.withLocation(() => {
        const name = parseVariableName(parser);
        parser.next("assignOperator");
        parser.commit();
        const value = parsePattern(parser);
        return { name, value };
    });

export interface UnitPattern {
    type: "unit";
    location: LocationRange;
}

export const parseUnitPattern = (parser: Parser): UnitPattern =>
    parser.withLocation(() =>
        parser.delimited("leftParenthesis", "rightParenthesis", () => ({
            type: "unit",
        })),
    );

export interface TuplePattern {
    type: "tuple";
    location: LocationRange;
    elements: Pattern[];
}

export const parseTuplePattern = (parser: Parser): TuplePattern =>
    parser.withLocation(() => ({
        type: "tuple",
        elements: parser
            .collection("tuple pattern", ["tupleOperator"], parsePatternElement)
            .map(([element]) => element),
    }));

export interface OrPattern {
    type: "or";
    location: LocationRange;
    patterns: Pattern[];
}

export const parseOrPattern = (parser: Parser): OrPattern =>
    parser.withLocation(() => ({
        type: "or",
        patterns: parser
            .collection("or pattern", ["orOperator"], parsePatternElement)
            .map(([element]) => element),
    }));

export interface SetPattern {
    type: "set";
    location: LocationRange;
    variable: Token;
}

export const parseSetPattern = (parser: Parser): SetPattern =>
    parser.withLocation(() => {
        parser.next("setKeyword");
        return { type: "set", variable: parseVariableName(parser) };
    });

export interface ConstructorPattern {
    type: "constructor";
    location: LocationRange;
    constructor: Token;
    elements: Pattern[];
}

export const parseConstructorPattern = (parser: Parser): ConstructorPattern =>
    parser.withLocation(() => ({
        type: "constructor",
        constructor: parseConstructorName(parser),
        elements: parser.optional(() => parser.many("pattern", parseAtomicPattern), []),
    }));

export interface AnnotatePattern {
    type: "annotate";
    location: LocationRange;
    left: Pattern;
    right: Type;
}

export const parseAnnotatePattern = (parser: Parser): AnnotatePattern =>
    parser.withLocation(() => {
        const left = parsePatternElement(parser);
        parser.next("annotateOperator");
        const right = parseTypeElement(parser);
        return { type: "annotate", left, right };
    });
