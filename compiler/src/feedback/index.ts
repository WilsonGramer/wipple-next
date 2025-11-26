import type { Db } from "../db";
import { Node } from "../node";
import { compareSpans } from "../span";
import "./items";
import feedback from "./register";
import type { RenderedFeedback } from "./render";

export const collectFeedback = (db: Db, filter: (node: Node) => boolean) => {
    const items: { id: string; on: Node; rendered: RenderedFeedback }[] = [];

    for (const item of feedback()) {
        const { id } = item;

        for (const node of db) {
            if (!filter(node)) {
                continue;
            }

            for (const props of item.query(node, filter)) {
                if (Object.values(props).some((node) => node instanceof Node && !filter(node))) {
                    continue;
                }

                const on = item.on(node, props);
                const rendered = item.render(node, props);
                items.push({ id, on, rendered });
            }
        }
    }

    items.sort((a, b) => compareSpans(a.on.span, b.on.span) || a.id.localeCompare(b.id));

    return items;
};
