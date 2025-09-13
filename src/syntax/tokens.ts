import { LocationRange } from "peggy";

export interface Token {
    location: LocationRange;
    value: string;
}
