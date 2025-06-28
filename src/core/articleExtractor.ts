import { ExtractedAnswerData } from "./answerExtractor";

/**
 * Extracts all relevant data from a zhihu article element.
 * @param articleElement The root element of the article (.Post-content).
 * @param markdownContent The parsed markdown content of the article.
 * @returns An object containing all extracted data.
 */
export function extractArticleData(articleElement: HTMLElement, markdownContent: string): ExtractedAnswerData {
	let jsonData: any = {};
	try {
		const scriptTag = document.getElementById("js-initialData");
		if (scriptTag) {
			jsonData = JSON.parse(scriptTag.innerHTML);
		}
	} catch (e) {
		console.error("Failed to parse js-initialData", e);
	}

	const articleId = Object.keys(jsonData.initialState.entities.articles)[0];
	const articleData = jsonData.initialState.entities.articles[articleId];

	const title = articleData.title || "未知文章";
	const id = articleData.id.toString();
	const url = articleData.url || window.location.href;

	const authorInfo = articleData.author;
	const authorName = authorInfo.name || "匿名用户";
	const authorUrl = authorInfo.url || "";
	const authorBadge = articleElement.querySelector(".AuthorInfo-badgeText")?.textContent?.trim() || authorInfo.headline || "";

	const upvoteCount = articleData.voteupCount || 0;
	const commentCount = articleData.commentCount || 0;

	// Timestamps are in seconds, convert to milliseconds for JavaScript Date
	const createdTime = articleData.created ? new Date(articleData.created * 1000).toISOString() : "";
	const updatedTime = articleData.updated ? new Date(articleData.updated * 1000).toISOString() : "";

	// These are not available on article pages based on the analysis
	const isFollowedVoted = false;
	const isEditorRecommended = false;

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