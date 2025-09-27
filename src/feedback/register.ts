import { RenderedFeedback } from "./render";
import { Db, Node } from "../db";

interface Feedback<T> {
    id: string;
    query: (db: Db, filter: (node: Node) => boolean) => Generator<T>;
    on: (props: T) => Node;
    render: (props: T) => RenderedFeedback;
}

const feedback: Feedback<any>[] = [];
export const registerFeedback = <T>(item: Feedback<T>) => {
    feedback.push(item);
};

export default () => feedback;
