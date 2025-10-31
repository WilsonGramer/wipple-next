import type { Db, Node } from "../db";
import "./items";
import feedback from "./register";

export const collectFeedback = function* (db: Db, filter: (node: Node) => boolean) {
    for (const item of feedback()) {
        const { id } = item;
        for (const props of item.query(db, filter)) {
            const on = item.on(props);
            if (on.isHidden) {
                continue;
            }

            const rendered = item.render(props, db);
            yield { id, on, rendered };
        }
    }
};
