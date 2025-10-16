import config from "../.prettierrc.mjs";
import pegjs from "prettier-plugin-pegjs";

export default {
    ...config,
    plugins: [pegjs]
};
