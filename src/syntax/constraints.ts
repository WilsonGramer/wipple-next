import { LocationRange } from "peggy";
import { Token } from "./tokens";
import { Type } from "./types";

export type Constraint = BoundConstraint | DefaultConstraint;

export interface BoundConstraint {
    type: "bound";
    location: LocationRange;
    trait: Token;
    parameters: Type[];
}

export interface DefaultConstraint {
    type: "default";
    location: LocationRange;
    parameter: Token;
    value: Type;
}
