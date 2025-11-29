import chalk, { type ColorName, type ModifierName } from "chalk";

export const code = (s: string, color: ColorName | ModifierName = "blue") =>
    chalk.level > 0 ? chalk[color](s) : "`" + s + "`";

export const extra = (s: string, color: ColorName | ModifierName = "dim") =>
    chalk.level > 0 ? chalk[color](s) : s;
