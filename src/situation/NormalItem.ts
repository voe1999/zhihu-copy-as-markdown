import * as JSZip from "jszip";
import { lexer } from "../core/lexer";
import { LexType } from "../core/tokenTypes";
import { parser } from "../core/parser";
import * as utils from "../core/utils";
import savelex from "../core/savelex";

export interface AnswerData {
    id: string;
    title: string;
    content: string;
    author: {
        name: string;
        url: string;
    };
    url: string;
    voteCount: number;
    createdTime: string;
    updatedTime: string;
}

// 生成8位UUID
const getUUID = (): string => {
    return "xxxxxxxx".replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0,
            v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};

const getVoteCount = (dom: HTMLElement): number => {
    try {
        const contentItem = utils.getParent(dom, "ContentItem");
        if (!contentItem) return 0;
        
        const voteButton = contentItem.querySelector(".VoteButton--up");
        if (voteButton) {
            const voteText = voteButton.textContent?.trim() || "0";
            return parseInt(voteText) || 0;
        }
    } catch {}
    return 0;
};

export default async (dom: HTMLElement): Promise<AnswerData> => {
    const lex = lexer(dom.childNodes as NodeListOf<Element>);
    const markdown = parser(lex);

    const zop = (() => {
        let element = utils.getParent(dom, "AnswerItem");
        if (!element) element = utils.getParent(dom, "Post-content");

        try {
            if (element instanceof HTMLElement)
                return JSON.parse(decodeURIComponent(element.getAttribute("data-zop") || "{}"));
        } catch { }

        return null;
    })();

    const title = utils.getTitle(dom);
    const author = utils.getAuthor(dom);
    const url = utils.getURL(dom);
    const voteCount = getVoteCount(dom);
    const itemId = (zop?.itemId as string) || getUUID();

    const contentItem = utils.getParent(dom, "ContentItem");
    const createdTime = contentItem instanceof HTMLElement ? contentItem.getAttribute("data-created-time") || "" : "";
    const updatedTime = contentItem instanceof HTMLElement ? contentItem.getAttribute("data-updated-time") || "" : "";

    return {
        id: itemId,
        title: title.toString(),
        content: markdown.join("\n\n"),
        author: {
            name: author.toString(),
            url: `https://www.zhihu.com/people/${author.toString()}`
        },
        url,
        voteCount,
        createdTime,
        updatedTime
    };
};