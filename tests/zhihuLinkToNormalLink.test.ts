// @ts-ignore ClojureScript compiled module has no TypeScript declarations
import { zhihuLinkToNormalLink } from "@cljs/core/utils";

describe("zhihuLinkToNormalLink", () => {
    it("should convert link.zhihu.com redirect", () => {
        const input =
            "https://link.zhihu.com/?target=https%3A%2F%2Fexample.com%2Ffoo%3Fbar%3Dbaz";
        const expected = "https://example.com/foo?bar=baz";
        expect(zhihuLinkToNormalLink(input)).toBe(expected);
    });

    it("should convert zhida.zhihu.com search redirect", () => {
        const input =
            "https://zhida.zhihu.com/search?content_id=716601298&content_type=Answer&match_order=1&q=%E4%BE%9B%E5%BA%94%E9%93%BE%E5%BC%80%E5%8F%91&zhida_source=entity";
        const expected = "https://www.zhihu.com/search?q=供应链开发";
        expect(zhihuLinkToNormalLink(input)).toBe(expected);
    });

    it("should return original link when not a redirect", () => {
        const input = "https://www.zhihu.com/question/123456";
        expect(zhihuLinkToNormalLink(input)).toBe(input);
    });
}); 