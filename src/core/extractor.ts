import { getParent } from "./utils";

export interface ExtractedAnswerData {
    id: string;
    url: string;
    title: string;

    authorName: string;
    authorBadge?: string;
    authorUrl: string;

    upvoteCount: number;
    commentCount: number;

    createdTime: string;
    updatedTime: string;

    isFollowedVoted: boolean;
    isEditorRecommended: boolean;

    content: string; // markdown content
}

// 生成8位UUID
const getUUID = (): string => {
    return "xxxxxxxx".replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0,
            v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};

/**
 * 从 meta 标签或 CSS 选择器提取信息。
 * @param element - The element to search within.
 * @param metaSelector - The CSS selector for the meta tag.
 * @param fallbackSelector - The CSS selector for the fallback element.
 * @param attribute - The attribute to extract from the meta tag (default: "content").
 * @returns The extracted text content or an empty string.
 */
function extractInfo(element: Element, metaSelector: string, fallbackSelector?: string, attribute = "content"): string {
    const metaElement = element.querySelector(metaSelector);
    if (metaElement) {
        const value = metaElement.getAttribute(attribute);
        if (value) return value;
    }
    if (fallbackSelector) {
        const fallbackElement = element.querySelector(fallbackSelector);
        return fallbackElement?.textContent?.trim() || "";
    }
    return "";
}

function extractCount(element: Element, metaSelector: string, fallbackSelector: string): number {
    const text = extractInfo(element, metaSelector, fallbackSelector);
    return parseInt(text.replace(/[^0-9]/g, ""), 10) || 0;
}

/**
 * Extracts all relevant data from an answer item element.
 * @param answerElement The root element of the answer (.ContentItem.AnswerItem).
 * @param markdownContent The parsed markdown content of the answer.
 * @returns An object containing all extracted data.
 */
export function extractAnswerData(answerElement: HTMLElement, markdownContent: string): ExtractedAnswerData {
    const authorElement = answerElement.querySelector<HTMLAnchorElement>(".AuthorInfo-name a");

    const answerUrlElement = answerElement.querySelector<HTMLAnchorElement>(".ContentItem-time a");
    const answerUrl = answerUrlElement?.href || "";
    const id = answerElement.dataset.zopId || answerUrl.split("/answer/")[1] || getUUID();

    const titleElement = document.querySelector(".QuestionHeader-title");
    let title = "未知问题";
    if (titleElement) {
        const clone = titleElement.cloneNode(true) as HTMLElement;
        const buttonInClone = clone.querySelector(".zhihucopier-button");
        if (buttonInClone) {
            buttonInClone.remove();
        }
        title = clone.textContent?.trim() || "未知问题";
    }
    const url = answerUrl || `https://www.zhihu.com/question/${document.location.pathname.split("/")[2]}/answer/${id}`;

    // Extract data using the specified strategy
    const authorName = authorElement?.textContent?.trim() || "匿名用户";
    const authorUrl = authorElement?.href || "";
    const authorBadge = answerElement.querySelector(".AuthorInfo-badgeText")?.textContent?.trim();

    const upvoteCount = extractCount(answerElement, "meta[itemprop=\"upvoteCount\"]", "button.VoteButton--up");
    const commentCount = extractCount(answerElement, "meta[itemprop=\"commentCount\"]", "button:has(svg.Zi--Comment)");

    const createdTime = extractInfo(answerElement, "meta[itemprop=\"dateCreated\"]", ".ContentItem-time [data-tooltip]");
    let updatedTime = extractInfo(answerElement, "meta[itemprop=\"dateModified\"]", ".ContentItem-time span");

    //知乎的 meta[itemprop="dateModified"] 在未更新时与创建时间相同，需要额外判断
    const updatedTimeSpan = answerElement.querySelector(".ContentItem-time span");
    if (updatedTimeSpan && !updatedTimeSpan.textContent?.includes("编辑于")) {
        updatedTime = createdTime;
    }
    if (updatedTime === createdTime) {
        updatedTime = ""; // 如果没更新过，则不显示更新时间
    }

    const voteInfoElement = answerElement.querySelector(".css-18k7i4m");
    const isFollowedVoted = !!voteInfoElement && voteInfoElement.textContent?.includes("等人赞同");

    const metaDivs = answerElement.querySelectorAll(".ContentItem-meta div");
    let isEditorRecommended = false;
    for (const div of Array.from(metaDivs)) {
        if (div.textContent?.trim() === "编辑推荐") {
            isEditorRecommended = true;
            break;
        }
    }

    return {
        id,
        title,
        url,
        authorName,
        authorBadge,
        authorUrl,
        upvoteCount,
        commentCount,
        createdTime,
        updatedTime,
        isFollowedVoted,
        isEditorRecommended,
        content: markdownContent
    };
} 