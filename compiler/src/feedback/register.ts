import type { RenderedFeedback } from "./render";
import type { Node } from "../node";
import type { Query } from "../queries";

interface Feedback<T extends Record<string, unknown>> {
    id: string;
    query: Query<T>;
    on: (node: Node, props: T) => Node;
    render: (node: Node, props: T) => RenderedFeedback;
}

const feedback: Feedback<Record<string, any>>[] = [];
export const registerFeedback = <T extends Record<string, unknown>>(item: Feedback<T>) => {
    feedback.push(item as Feedback<Record<string, any>>);
};

export default () => feedback;
