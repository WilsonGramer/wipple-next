import { Db } from "../db";

export interface CodegenOptions {
    format: "module" | "iife";
    debug?: boolean;
}

export class Codegen {
    db: Db;
    options: CodegenOptions;
    output: string;

    constructor(db: Db, options: CodegenOptions) {
        this.db = db;
        this.options = options;
        this.output = "";
    }

    write(item: CodegenItem) {
        if ("codegen" in item) {
            this.write(item.codegen);
        } else {
            this.output += item(this);
        }
    }
}

type CodegenFunction = (codegen: Codegen) => string;
export type CodegenItem = CodegenFunction | { codegen: CodegenItem };

export * from "./conditions";
export * from "./expressions";
export * from "./statements";
export * from "./types";
