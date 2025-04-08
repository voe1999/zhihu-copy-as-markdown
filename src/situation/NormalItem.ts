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
            // 提取数字部分
            const match = voteText.match(/\d+/);
            return match ? parseInt(match[0]) : 0;
        }
    } catch {}
    return 0;
};

export default async (dom: HTMLElement): Promise<AnswerData> => {
    const lex = lexer(dom.childNodes as NodeListOf<Element>);
    const markdown = parser(lex);

    // 获取回答元素
    const answerItem = utils.getParent(dom, "AnswerItem") || utils.getParent(dom, "Post-content");
    if (!answerItem) {
        throw new Error("Cannot find answer item");
    }

    // 获取作者信息
    const authorLink = answerItem.querySelector(".UserLink-link") as HTMLAnchorElement;
    const authorName = authorLink?.innerText?.trim() || "匿名用户";
    const authorId = authorLink?.href?.split("/").pop() || "";

    // 获取创建和更新时间
    const contentItem = answerItem.closest(".ContentItem");
    const timeSpan = contentItem?.querySelector(".ContentItem-time span");
    const timeText = timeSpan?.getAttribute("data-tooltip") || timeSpan?.getAttribute("aria-label") || "";
    const createdTime = timeText.replace(/^发布于\s+/, "");
    const updatedTime = contentItem?.getAttribute("data-updated-time") || createdTime;

    // 获取回答 ID
    const answerLink = contentItem?.querySelector(".ContentItem-time a") as HTMLAnchorElement;
    const answerUrl = answerLink?.href || "";
    const answerId = answerUrl.split("/answer/")[1] || getUUID();

    // 获取标题和其他信息
    const title = utils.getTitle(dom);
    const url = answerUrl || utils.getURL(dom);
    const voteCount = getVoteCount(dom);

    return {
        id: answerId,
        title: title.toString(),
        content: markdown.join("\n\n"),
        author: {
            name: authorName,
            url: authorId ? `https://www.zhihu.com/people/${authorId}` : ""
        },
        url,
        voteCount,
        createdTime,
        updatedTime
    };
};