import { Db } from "../db";

export interface CodegenOptions {
    format: "module" | "iife";
    debug?: boolean;
}

export class Codegen {
    db: Db;
    options: CodegenOptions;

    constructor(db: Db, options: CodegenOptions) {
        this.db = db;
        this.options = options;
    }
}

export type CodegenItem = (codegen: Codegen) => string;

export * from "./conditions";
export * from "./expressions";
export * from "./statements";
export * from "./types";
