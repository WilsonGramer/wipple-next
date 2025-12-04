import { relative } from "node:path";
import { TextDocument } from "vscode-languageserver-textdocument";
import * as lsp from "vscode-languageserver/node";
import { compile, makeRoot } from "./compile";
import type { Db } from "./db";
import { collectFeedback } from "./feedback";
import { render } from "./feedback/render";
import type { Node } from "./node";
import { nodeFilter } from "./node";
import * as queries from "./queries";
import type { Span } from "./span";
import { parse } from "./syntax";
import { parseFile } from "./syntax/grammar";
import { displayType } from "./typecheck";

const tokenTypes = ["type", "interface", "typeParameter", "function"] as const;

export default () => {
    process.env.WIPPLE_LSP = "1";

    let workspacePath = "";
    const connection = lsp.createConnection(lsp.ProposedFeatures.all);
    const documents = new lsp.TextDocuments(TextDocument);
    const dbs = new Map<string, Db>();

    connection.onInitialize((params) => {
        if (params.workspaceFolders != null) {
            workspacePath = new URL(params.workspaceFolders[0].uri).pathname;
        }

        return {
            capabilities: {
                textDocumentSync: lsp.TextDocumentSyncKind.Full,
                semanticTokensProvider: {
                    documentSelector: null,
                    legend: {
                        tokenTypes: tokenTypes as any,
                        tokenModifiers: [],
                    },
                    full: true,
                },
                hoverProvider: true,
                documentHighlightProvider: true,
            },
        };
    });

    documents.listen(connection);

    documents.onDidChangeContent(async (e) => {
        const filter = nodeFilter([{ path: path(e.document) }]);
        const code = e.document.getText();

        try {
            const root = makeRoot();
            const { db } = root;

            // TODO: Support multiple files
            const file = parse(db, path(e.document), code, parseFile);
            if (file != null) {
                compile(root, [file]);
            }

            const diagnostics = addFeedback(db, filter);

            await connection.sendDiagnostics({
                uri: e.document.uri,
                diagnostics,
            });

            dbs.set(e.document.uri, db);
        } catch (error) {
            console.error("ERROR:", error);
        }
    });

    connection.languages.semanticTokens.on((params) => {
        const db = dbs.get(params.textDocument.uri);
        if (db == null) {
            return { data: [] };
        }

        return addSemanticTokens(params.textDocument, db);
    });

    connection.onHover((params) => {
        const db = dbs.get(params.textDocument.uri);
        if (db == null) {
            return null;
        }

        return getHover(params.textDocument, params.position, db);
    });

    connection.onDocumentHighlight((params) => {
        const db = dbs.get(params.textDocument.uri);
        if (db == null) {
            return [];
        }

        return getRelated(params.textDocument, params.position, db);
    });

    connection.listen();

    // MARK: Helpers

    const path = (document: { uri: string }) =>
        relative(workspacePath, new URL(document.uri).pathname);

    const convertSpan = (span: Span): lsp.Range => ({
        start: {
            line: span.start.line - 1,
            character: span.start.column - 1,
        },
        end: {
            line: span.end.line - 1,
            character: span.end.column - 1,
        },
    });

    const addFeedback = (db: Db, filter: (node: Node) => boolean): lsp.Diagnostic[] => {
        const diagnostics: lsp.Diagnostic[] = [];
        const seenFeedback = new Map<Node, Set<string>>();
        for (const feedback of collectFeedback(db, filter)) {
            if (!seenFeedback.get(feedback.on)) {
                seenFeedback.set(feedback.on, new Set());
            }

            const seenFeedbackForNode = seenFeedback.get(feedback.on)!;

            if (seenFeedbackForNode.has(feedback.id)) {
                continue;
            }

            seenFeedbackForNode.add(feedback.id);

            diagnostics.push({
                severity: lsp.DiagnosticSeverity.Information,
                range: convertSpan(feedback.on.span),
                message: feedback.rendered.render(),
                source: "wipple",
            });
        }

        return diagnostics;
    };

    const addSemanticTokens = (document: { uri: string }, db: Db) => {
        const filter = nodeFilter([{ path: path(document) }]);

        const tokens: [Node, (typeof tokenTypes)[number]][] = [];

        for (const node of db) {
            if (!filter(node)) continue;

            // Don't highlight across whitespace
            if (node.span.source.match(/\s/)) continue;

            for (const {} of queries.highlightType(node, filter)) {
                tokens.push([node, "type"]);
            }

            for (const {} of queries.highlightTrait(node, filter)) {
                tokens.push([node, "interface"]);
            }

            for (const {} of queries.highlightTypeParameter(node, filter)) {
                tokens.push([node, "typeParameter"]);
            }

            for (const {} of queries.highlightFunction(node, filter)) {
                tokens.push([node, "function"]);
            }
        }

        tokens.sort(([a], [b]) => a.span.start.offset - b.span.start.offset);

        const builder = new lsp.SemanticTokensBuilder();

        for (const [node, type] of tokens) {
            const { start, end } = convertSpan(node.span);

            builder.push(
                start.line,
                start.character,
                end.character - start.character,
                tokenTypes.indexOf(type),
                0,
            );
        }

        return builder.build();
    };

    const getHover = (
        document: { uri: string },
        position: lsp.Position,
        db: Db,
    ): lsp.Hover | undefined => {
        const filter = nodeFilter([{ path: path(document) }]);

        const nodeAtPosition = getNodeAtPosition(document, position, db);
        if (nodeAtPosition == null) {
            return undefined;
        }

        const contents: lsp.Hover["contents"] = [];

        for (const { type } of queries.type(nodeAtPosition, filter)) {
            contents.push({
                language: "wipple",
                value: displayType(type),
            });
        }

        for (const { node, comments, links } of queries.comments(nodeAtPosition, filter)) {
            if (node !== nodeAtPosition) continue;

            const documentation = render.comments(comments, links).render();
            contents.push(documentation);
        }

        return {
            range: convertSpan(nodeAtPosition.span),
            contents,
        };
    };

    const getRelated = (
        document: { uri: string },
        position: lsp.Position,
        db: Db,
    ): lsp.DocumentHighlight[] => {
        const filter = nodeFilter([{ path: path(document) }]);

        const nodeAtPosition = getNodeAtPosition(document, position, db);
        if (nodeAtPosition == null) {
            return [];
        }

        const locations: lsp.Location[] = [
            { uri: document.uri, range: convertSpan(nodeAtPosition.span) },
        ];
        for (const { related } of queries.related(nodeAtPosition, filter)) {
            locations.push({ uri: document.uri, range: convertSpan(related.span) });
        }

        return locations;
    };

    const getNodeAtPosition = (
        document: { uri: string },
        position: lsp.Position,
        db: Db,
    ): Node | undefined => {
        const filter = nodeFilter([{ path: path(document) }]);

        const matches: { length: number; node: Node }[] = [];
        for (const node of db) {
            if (!filter(node)) continue;

            const range = convertSpan(node.span);

            if (
                range.start.line === position.line &&
                range.start.character <= position.character &&
                range.end.line === position.line &&
                range.end.character >= position.character
            ) {
                matches.push({
                    length: range.end.character - range.start.character,
                    node,
                });
            }
        }

        matches.sort((a, b) => a.length - b.length);

        return matches[0]?.node;
    };
};
