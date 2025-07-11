import * as fs from "fs";
import * as path from "path";
import { JSDOM } from "jsdom";

// 使用 mock 避免加载 ClojureScript 构建产物（ESM 语法导致 Jest 报错）
jest.mock("@cljs/core/utils", () => ({
    zhihuLinkToNormalLink: (url: string) => url,
}));

import { lexer } from "../src/core/lexer";

/**
 * 测试思路：
 * 1. 在 tests/fixtures 目录放置若干 .html 文件，文件名可自定义。
 * 2. 用 JSDOM 解析 HTML，获取 <body> 下的所有顶级元素。
 * 3. 调用 lexer，并对 tokens 结果做快照比对。
 *    - 若修改 lexer 行为，只需更新快照。
 */

describe("lexer", () => {
    const fixturesDir = path.join(__dirname, "fixtures");

    // 如果没有 fixture，则提示开发者手动添加
    if (!fs.existsSync(fixturesDir)) {
        it("should have fixture files", () => {
            expect(fs.existsSync(fixturesDir)).toBe(true);
        });
        return;
    }

    const htmlFiles = fs
        .readdirSync(fixturesDir)
        .filter((file: string) => file.endsWith(".html"));

    if (htmlFiles.length === 0) {
        it("should have at least one .html fixture", () => {
            expect(htmlFiles.length).toBeGreaterThan(0);
        });
        return;
    }

    it.each(htmlFiles)("parses %s correctly", (filename) => {
        const html = fs.readFileSync(path.join(fixturesDir, filename), "utf-8");

        const dom = new JSDOM(html);
        const articleRoot =
            dom.window.document.querySelector(".RichText") ??
            dom.window.document;              // 兜底

        // 只拿第一层子元素
        const nodeList = articleRoot.children;

        // lexer 要求 NodeListOf<Element>
        const tokens = lexer(nodeList as unknown as NodeListOf<Element>);

        expect(tokens).toMatchSnapshot();
    });
}); 