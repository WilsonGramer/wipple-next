import * as lsp from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import { Db, Node } from "./db";
import { compile } from "./compile";
import { collectFeedback } from "./feedback";
import { nodeFilter } from "./db/filter";
import { nodeDisplayOptions } from "./db/node";
import { LocationRange } from "peggy";
import * as queries from "./queries";

const tokenTypes = ["type", "function", "typeParameter"] as const;

export default () => {
    nodeDisplayOptions.showLocation = false;
    nodeDisplayOptions.markdown = true;

    const connection = lsp.createConnection(lsp.ProposedFeatures.all);
    const documents = new lsp.TextDocuments(TextDocument);
    const dbs = new Map<string, Db>();

    connection.onInitialize((params) => {
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
            },
        };
    });

    documents.listen(connection);

    documents.onDidChangeContent((e) => {
        const code = e.document.getText();

        try {
            const db = new Db();

            const result = compile(db, { path: e.document.uri, code });

            const diagnostics: lsp.Diagnostic[] = [];
            if (!result.success) {
                switch (result.type) {
                    case "parse": {
                        diagnostics.push({
                            severity: lsp.DiagnosticSeverity.Error,
                            range: convertRange(result.location),
                            message: `syntax error: ${result.message}`,
                            source: "wipple",
                        });

                        break;
                    }
                    default:
                        result.type satisfies never;
                        throw new Error("unknown error");
                }
            }

            addFeedback(e.document.uri, db, diagnostics);

            connection.sendDiagnostics({
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
        if (!db) {
            return { data: [] };
        }

        return addSemanticTokens(params.textDocument.uri, db);
    });

    connection.listen();
};

const convertRange = (location: LocationRange): lsp.Range => ({
    start: {
        line: location.start.line - 1,
        character: location.start.column - 1,
    },
    end: {
        line: location.end.line - 1,
        character: location.end.column - 1,
    },
});

const addFeedback = (uri: string, db: Db, diagnostics: lsp.Diagnostic[]) => {
    const filter = nodeFilter([{ path: uri }]);

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
            range: convertRange(feedback.on.span.range),
            message: feedback.rendered.toString(),
            source: "wipple",
        });
    }
};

const addSemanticTokens = (uri: string, db: Db) => {
    const filter = nodeFilter([{ path: uri }]);

    const tokens: [Node, (typeof tokenTypes)[number]][] = [];

    for (const { node } of queries.highlightType(db, filter)) {
        tokens.push([node, "type"]);
    }

    for (const { node } of queries.highlightFunction(db, filter)) {
        tokens.push([node, "function"]);
    }

    tokens.sort(([a], [b]) => a.span.range.start.offset - b.span.range.start.offset);

    const builder = new lsp.SemanticTokensBuilder();

    for (const [node, type] of tokens) {
        const { start, end } = convertRange(node.span.range);

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
