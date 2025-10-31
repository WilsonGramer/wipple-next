import { RenderedFeedback } from "./render";
import { Db, Node } from "../db";
import { Query } from "../queries";

interface Feedback<T> {
    id: string;
    query: Query<T>;
    on: (props: T) => Node;
    render: (props: T, db: Db) => RenderedFeedback;
}

const feedback: Feedback<any>[] = [];
export const registerFeedback = <T>(item: Feedback<T>) => {
    feedback.push(item);
};

export default () => feedback;
