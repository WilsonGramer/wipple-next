import type { PatternNode } from "../nodes/patterns";
import { AnnotatePatternNode } from "../nodes/patterns/annotate";
import { ConstructorPatternNode } from "../nodes/patterns/constructor";
import { NumberPatternNode } from "../nodes/patterns/number";
import { OrPatternNode } from "../nodes/patterns/or";
import { SetPatternNode } from "../nodes/patterns/set";
import { StringPatternNode } from "../nodes/patterns/string";
import { StructurePatternField, StructurePatternNode } from "../nodes/patterns/structure";
import { TuplePatternNode } from "../nodes/patterns/tuple";
import { UnitPatternNode } from "../nodes/patterns/unit";
import { VariablePatternNode } from "../nodes/patterns/variable";
import { WildcardPatternNode } from "../nodes/patterns/wildcard";
import {
    parseConstructorName,
    parseNumber,
    parseString,
    parseTypeName,
    parseVariableName,
} from "./atoms";
import type { Parser } from "./parser";
import { parseTypeElement } from "./types";

export const parsePattern = (parser: Parser): PatternNode =>
    parser.alternatives<PatternNode>("pattern", parsePattern, [
        parseTuplePattern,
        parseOrPattern,
        parseAnnotatePattern,
        parsePatternElement,
    ]);

export const parsePatternElement = (parser: Parser): PatternNode =>
    parser.alternatives<PatternNode>("pattern", parsePatternElement, [
        parseStructurePattern,
        parseConstructorPattern,
        parseSetPattern,
        parseAtomicPattern,
    ]);

export const parseAtomicPattern = (parser: Parser): PatternNode =>
    parser.alternatives<PatternNode>("pattern", parseAtomicPattern, [
        parseWildcardPattern,
        parseVariablePattern,
        parseNumberPattern,
        parseStringPattern,
        parseUnitPattern,
        parseParenthesizedPattern,
    ]);

export const parseParenthesizedPattern = (parser: Parser) =>
    parser.delimited("leftParenthesis", "rightParenthesis", () => parsePattern(parser));

export const parseWildcardPattern = (parser: Parser) =>
    parser.spanned((span) => {
        parser.next("underscoreKeyword");
        return new WildcardPatternNode(span());
    });

export const parseVariablePattern = (parser: Parser) =>
    parser.spanned((span) => new VariablePatternNode(parseVariableName(parser), span()));

export const parseNumberPattern = (parser: Parser) =>
    parser.spanned((span) => new NumberPatternNode(parseNumber(parser), span()));

export const parseStringPattern = (parser: Parser) =>
    parser.spanned((span) => new StringPatternNode(parseString(parser), span()));

export const parseStructurePattern = (parser: Parser) =>
    parser.spanned((span) => {
        const name = parseTypeName(parser);
        const fields = parser.delimited("leftBrace", "rightBrace", () =>
            parser.many("field", parseStructurePatternField, ["lineBreak"]),
        );
        return new StructurePatternNode(name, fields, span());
    });

export const parseStructurePatternField = (parser: Parser) =>
    parser.spanned((span) => {
        const name = parseVariableName(parser);
        parser.next("assignOperator");
        parser.commit();
        const value = parsePattern(parser);
        return new StructurePatternField(name, value, span());
    });

export const parseUnitPattern = (parser: Parser) =>
    parser.spanned((span) => {
        parser.delimited("leftParenthesis", "rightParenthesis", () => undefined);
        return new UnitPatternNode(span());
    });

export const parseTuplePattern = (parser: Parser) =>
    parser.spanned((span) => {
        const elements = parser
            .collection("tuple pattern", ["tupleOperator"], parsePatternElement)
            .map(([element]) => element);
        return new TuplePatternNode(elements, span());
    });

export const parseOrPattern = (parser: Parser) =>
    parser.spanned((span) => {
        const patterns = parser
            .collection("or pattern", ["orOperator"], parsePatternElement)
            .map(([element]) => element);
        return new OrPatternNode(patterns, span());
    });

export const parseSetPattern = (parser: Parser) =>
    parser.spanned((span) => {
        parser.next("setKeyword");
        return new SetPatternNode(parseVariableName(parser), span());
    });

export const parseConstructorPattern = (parser: Parser) =>
    parser.spanned((span) => {
        const constructor = parseConstructorName(parser);
        const elements = parser.optional(() => parser.many("pattern", parseAtomicPattern), []);
        return new ConstructorPatternNode(constructor, elements, span());
    });

export const parseAnnotatePattern = (parser: Parser) =>
    parser.spanned((span) => {
        const left = parsePatternElement(parser);
        parser.next("annotateOperator");
        const right = parseTypeElement(parser);
        return new AnnotatePatternNode(left, right, span());
    });
