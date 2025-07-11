import { saveAs } from "file-saver";
//@ts-ignore
import { makeButton as MakeButton, getParent, getQuestionTitle } from "@cljs/core/utils";
import answerProcessor from "./processors/answerProcessor";
import pinProcessor from "./processors/pinProcessor";
import articleProcessor from "./processors/articleProcessor";
import { extractAnswerData, ExtractedAnswerData } from "./core/answerExtractor";
import { extractArticleData } from "./core/articleExtractor";

interface QuestionData {
	title: string;
	url: string;
	answers: ExtractedAnswerData[];
}

const allAnswers: ExtractedAnswerData[] = [];

const AddAnswer = (answer: ExtractedAnswerData) => {
	// 避免重复添加相同的回答
	if (allAnswers.every((item) => item.id !== answer.id)) {
		allAnswers.push(answer);
	}
};

const generateSingleAnswerMarkdown = (answer: ExtractedAnswerData, questionTitle: string): string => {
	let markdown = "";
	// 想法 item 有自己的标题
	if (answer.title && answer.title !== questionTitle) {
		markdown += `### ${answer.title}\n\n`;
	}
	markdown += `**作者**: [${answer.authorName}](${answer.authorUrl})`;
	if (answer.authorBadge) {
		markdown += ` (${answer.authorBadge})`;
	}
	markdown += "\n";
	markdown += `**回答链接**: ${answer.url}\n`;
	markdown += `**赞同数**: ${answer.upvoteCount}`;
	if (answer.isFollowedVoted) {
		markdown += " (包含我关注的人)";
	}
	markdown += "\n";
	markdown += `**评论数**: ${answer.commentCount}\n`;
	if (answer.createdTime) {
		markdown += `**创建时间**: ${new Date(answer.createdTime).toLocaleString()}\n`;
	}
	if (answer.updatedTime) {
		markdown += `**更新时间**: ${new Date(answer.updatedTime).toLocaleString()}\n`;
	}
	if (answer.isEditorRecommended) {
		markdown += "**编辑推荐**\n";
	}
	markdown += "\n---\n\n";
	markdown += answer.content;
	return markdown;
};

// 等待元素出现
const waitForElement = (selector: string, timeout = 5000): Promise<Element | null> => {
	return new Promise((resolve) => {
		if (document.querySelector(selector)) {
			return resolve(document.querySelector(selector));
		}

		const observer = new MutationObserver(() => {
			if (document.querySelector(selector)) {
				observer.disconnect();
				resolve(document.querySelector(selector));
			}
		});

		observer.observe(document.body, {
			childList: true,
			subtree: true
		});

		setTimeout(() => {
			observer.disconnect();
			resolve(null);
		}, timeout);
	});
};

// 等待一段时间
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 滚动到底部
const scrollToBottom = () => {
	window.scrollTo({
		top: document.documentElement.scrollHeight,
		behavior: "smooth"
	});
};

// 检查是否到达页面底部
const isBottomReached = () => {
	return window.innerHeight + window.pageYOffset >= document.documentElement.scrollHeight - 100;
};

// 处理当前可见的回答
const processVisibleAnswers = async () => {
	// 先找到所有回答项
	const answers = document.querySelectorAll(".ContentItem.AnswerItem");

	for (const answer of Array.from(answers)) {
		try {
			// 展开回答
			const expandButton = answer.querySelector(".ContentItem-expandButton") as HTMLElement;
			if (expandButton) {
				expandButton.click();
				await sleep(500); // 等待内容展开
			}

			// 获取回答内容区域
			const richText = answer.querySelector(".RichText") as HTMLElement;
			if (!richText) continue;

			// 跳过不需要处理的元素
			if (richText.parentElement.classList.contains("Editable")) continue;
			if (richText.children[0]?.classList.contains("zhihucopier-button")) continue;
			if (richText.children[0]?.classList.contains("Image-Wrapper-Preview")) continue;

			if (getParent(richText, "PinItem")) {
				const richInner = getParent(richText, "RichContent-inner");
				if (richInner && richInner.querySelector(".ContentItem-more")) continue;
			}

			// 去掉重复的按钮
			let richTextChildren = Array.from(richText.children) as HTMLElement[];
			for (let i = 1; i < richTextChildren.length; i++) {
				const el = richTextChildren[i];
				if (el.classList.contains("zhihucopier-button")) el.remove();
				else break;
			}

			// 按钮组容器
			const ButtonContainer = document.createElement("div");
			ButtonContainer.classList.add("zhihucopier-button");
			richText.prepend(ButtonContainer);

			// 处理回答
			const markdownContent = await answerProcessor(richText);
			const answerElement = getParent(richText, "AnswerItem") as HTMLElement;
			const answerData = extractAnswerData(answerElement, markdownContent);
			AddAnswer(answerData);

			// 复制为Markdown按钮
			const ButtonDownloadMarkdown = MakeButton();
			ButtonDownloadMarkdown.innerHTML = "下载Markdown";
			ButtonDownloadMarkdown.style.borderRadius = "1em 0 0 1em";
			ButtonDownloadMarkdown.style.paddingLeft = ".4em";
			ButtonContainer.prepend(ButtonDownloadMarkdown);

			ButtonDownloadMarkdown.addEventListener("click", () => {
				try {
					const questionUrl = window.location.href;
					const questionTitle = answerData.title;

					const markdownHeader = `# ${questionTitle}\n\n源问题链接: ${questionUrl}\n\n`;
					const singleAnswerMarkdown = generateSingleAnswerMarkdown(answerData, questionTitle);
					const fullMarkdown = markdownHeader + singleAnswerMarkdown;

					const blob = new Blob([fullMarkdown], {
						type: "text/markdown;charset=utf-8"
					});
					saveAs(blob, `${questionTitle}-${answerData.authorName}.md`);

					ButtonDownloadMarkdown.innerHTML = "下载成功✅";
					setTimeout(() => {
						ButtonDownloadMarkdown.innerHTML = "下载Markdown";
					}, 1000);
				} catch {
					ButtonDownloadMarkdown.innerHTML = "发生未知错误<br>请联系开发者";
					ButtonDownloadMarkdown.style.height = "4em";
					setTimeout(() => {
						ButtonDownloadMarkdown.style.height = "2em";
						ButtonDownloadMarkdown.innerHTML = "下载Markdown";
					}, 1000);
				}
			});

			// 下载JSON按钮
			const ButtonDownloadJSON = MakeButton();
			ButtonDownloadJSON.innerHTML = "下载为JSON";
			ButtonDownloadJSON.style.borderRadius = "0 1em 1em 0";
			ButtonDownloadJSON.style.width = "100px";
			ButtonDownloadJSON.style.paddingRight = ".4em";
			ButtonContainer.appendChild(ButtonDownloadJSON);

			ButtonDownloadJSON.addEventListener("click", () => {
				try {
					const blob = new Blob([JSON.stringify(answerData, null, 2)], {
						type: "application/json;charset=utf-8"
					});
					saveAs(blob, `${answerData.title}-${answerData.authorName}.json`);
					ButtonDownloadJSON.innerHTML = "下载成功✅";
					setTimeout(() => {
						ButtonDownloadJSON.innerHTML = "下载为JSON";
					}, 1000);
				} catch {
					ButtonDownloadJSON.innerHTML = "发生未知错误<br>请联系开发者";
					ButtonDownloadJSON.style.height = "4em";
					setTimeout(() => {
						ButtonDownloadJSON.style.height = "2em";
						ButtonDownloadJSON.innerHTML = "下载为JSON";
					}, 1000);
				}
			});
		} catch (e) {
			console.error("处理回答时出错:", e);
		}
	}

	// 处理想法（PinItem）
	const pins = document.querySelectorAll(".PinItem");
	for (const pin of Array.from(pins)) {
		try {
			const richText = pin.querySelector(".RichText") as HTMLElement;
			if (!richText) continue;

			// 如果已经有按钮就跳过
			if (richText.querySelector(".zhihucopier-button")) continue;

			// 去掉所有旧按钮
			Array.from(richText.querySelectorAll(".zhihucopier-button")).forEach((btn) => btn.remove());

			// 按钮组容器
			const ButtonContainer = document.createElement("div");
			ButtonContainer.classList.add("zhihucopier-button");
			richText.prepend(ButtonContainer);

			// 处理想法内容
			const pinRaw = await pinProcessor(richText);
			const pinParent = getParent(richText, "PinItem");
			let author = "匿名用户";
			let authorUrl = "";
			if (pinParent && pinParent instanceof HTMLElement) {
				// 优先用 meta 标签
				const metaName = pinParent.querySelector("meta[itemprop=\"name\"]");
				const metaUrl = pinParent.querySelector("meta[itemprop=\"url\"]");
				if (metaName && metaUrl) {
					author = metaName.getAttribute("content") || "匿名用户";
					authorUrl = metaUrl.getAttribute("content") || "";
				} else {
					// 兜底用 a 标签
					const authorLink = pinParent.querySelector(".UserLink-link");
					if (authorLink && authorLink instanceof HTMLElement) {
						author = authorLink.innerText?.trim() || "匿名用户";
						authorUrl = authorLink.getAttribute("href") || "";
					}
				}
			}
			const pinContent = pinRaw.markdown.join("\n\n");
			const pinParentForTitle = getParent(richText, "PinItem");
			const pinTitle = (pinParentForTitle instanceof HTMLElement && pinParentForTitle.querySelector(".PinItem-content-title")?.textContent?.trim()) || "想法";

			const answerData: ExtractedAnswerData = {
				id: pinRaw.itemId,
				title: pinTitle,
				content: pinContent,
				authorName: author,
				authorUrl: authorUrl,
				url: `https://www.zhihu.com/pin/${pinRaw.itemId}`,
				upvoteCount: 0,
				commentCount: 0,
				createdTime: "",
				updatedTime: "",
				isFollowedVoted: false,
				isEditorRecommended: false
			};
			AddAnswer(answerData);

			// 复制为Markdown按钮
			const ButtonDownloadMarkdown = MakeButton();
			ButtonDownloadMarkdown.innerHTML = "下载Markdown";
			ButtonDownloadMarkdown.style.borderRadius = "1em 0 0 1em";
			ButtonDownloadMarkdown.style.paddingLeft = ".4em";
			ButtonContainer.prepend(ButtonDownloadMarkdown);

			ButtonDownloadMarkdown.addEventListener("click", () => {
				try {
					const questionTitle = getQuestionTitle();
					const questionUrl = window.location.href;

					const markdownHeader = `# ${questionTitle}\n\n源问题链接: ${questionUrl}\n\n`;
					const singleAnswerMarkdown = generateSingleAnswerMarkdown(answerData, questionTitle);
					const fullMarkdown = markdownHeader + singleAnswerMarkdown;

					const blob = new Blob([fullMarkdown], {
						type: "text/markdown;charset=utf-8"
					});
					saveAs(blob, `${answerData.title}-${answerData.authorName}.md`);
					ButtonDownloadMarkdown.innerHTML = "下载成功✅";
					setTimeout(() => {
						ButtonDownloadMarkdown.innerHTML = "下载Markdown";
					}, 1000);
				} catch {
					ButtonDownloadMarkdown.innerHTML = "发生未知错误<br>请联系开发者";
					ButtonDownloadMarkdown.style.height = "4em";
					setTimeout(() => {
						ButtonDownloadMarkdown.style.height = "2em";
						ButtonDownloadMarkdown.innerHTML = "下载Markdown";
					}, 1000);
				}
			});

			// 下载JSON按钮
			const ButtonDownloadJSON = MakeButton();
			ButtonDownloadJSON.innerHTML = "下载为JSON";
			ButtonDownloadJSON.style.borderRadius = "0 1em 1em 0";
			ButtonDownloadJSON.style.width = "100px";
			ButtonDownloadJSON.style.paddingRight = ".4em";
			ButtonContainer.appendChild(ButtonDownloadJSON);

			ButtonDownloadJSON.addEventListener("click", () => {
				try {
					const blob = new Blob([JSON.stringify(answerData, null, 2)], {
						type: "application/json;charset=utf-8"
					});
					saveAs(blob, `${answerData.title}-${answerData.authorName}.json`);
					ButtonDownloadJSON.innerHTML = "下载成功✅";
					setTimeout(() => {
						ButtonDownloadJSON.innerHTML = "下载为JSON";
					}, 1000);
				} catch {
					ButtonDownloadJSON.innerHTML = "发生未知错误<br>请联系开发者";
					ButtonDownloadJSON.style.height = "4em";
					setTimeout(() => {
						ButtonDownloadJSON.style.height = "2em";
						ButtonDownloadJSON.innerHTML = "下载为JSON";
					}, 1000);
				}
			});
		} catch (e) {
			console.error("处理想法时出错:", e);
		}
	}
};

/**
 * Handles the processing of a single Zhihu Article page.
 */
const processArticlePage = async () => {
	const richText = document.querySelector(".Post-RichText") as HTMLElement;
	if (!richText || richText.querySelector(".zhihucopier-button")) {
		return;
	}

	try {
		const ButtonContainer = document.createElement("div");
		ButtonContainer.classList.add("zhihucopier-button");
		richText.prepend(ButtonContainer);

		const articleContentElement = getParent(richText, "Post-Main") as HTMLElement;
		const markdownContent = await articleProcessor(richText);
		const articleData = extractArticleData(articleContentElement, markdownContent);

		// Download Markdown Button
		const ButtonDownloadMarkdown = MakeButton();
		ButtonDownloadMarkdown.innerHTML = "下载Markdown";
		ButtonDownloadMarkdown.style.borderRadius = "1em 0 0 1em";
		ButtonDownloadMarkdown.style.paddingLeft = ".4em";
		ButtonContainer.prepend(ButtonDownloadMarkdown);

		ButtonDownloadMarkdown.addEventListener("click", () => {
			try {
				const fullMarkdown = `# ${articleData.title}\n\n源文章链接: ${articleData.url}\n\n` + generateSingleAnswerMarkdown(articleData, articleData.title);
				const blob = new Blob([fullMarkdown], { type: "text/markdown;charset=utf-8" });
				saveAs(blob, `${articleData.title}-${articleData.authorName}.md`);
				ButtonDownloadMarkdown.innerHTML = "下载成功✅";
				setTimeout(() => {
					ButtonDownloadMarkdown.innerHTML = "下载Markdown";
				}, 1000);
			} catch (e) {
				console.error(e);
				ButtonDownloadMarkdown.innerHTML = "发生未知错误";
				setTimeout(() => {
					ButtonDownloadMarkdown.innerHTML = "下载Markdown";
				}, 1000);
			}
		});

		// Download JSON Button
		const ButtonDownloadJSON = MakeButton();
		ButtonDownloadJSON.innerHTML = "下载为JSON";
		ButtonDownloadJSON.style.borderRadius = "0 1em 1em 0";
		ButtonDownloadJSON.style.width = "100px";
		ButtonDownloadJSON.style.paddingRight = ".4em";
		ButtonContainer.appendChild(ButtonDownloadJSON);

		ButtonDownloadJSON.addEventListener("click", () => {
			try {
				const blob = new Blob([JSON.stringify(articleData, null, 2)], { type: "application/json;charset=utf-8" });
				saveAs(blob, `${articleData.title}-${articleData.authorName}.json`);
				ButtonDownloadJSON.innerHTML = "下载成功✅";
				setTimeout(() => {
					ButtonDownloadJSON.innerHTML = "下载为JSON";
				}, 1000);
			} catch (e) {
				console.error(e);
				ButtonDownloadJSON.innerHTML = "发生未知错误";
				setTimeout(() => {
					ButtonDownloadJSON.innerHTML = "下载为JSON";
				}, 1000);
			}
		});
	} catch (e) {
		console.error("处理文章时出错:", e);
	}
};

const processQuestionPage = async () => {
	// 添加抓取按钮
	const Titles = Array.from(document.getElementsByClassName("QuestionHeader-title")) as HTMLElement[];
	Titles.forEach((titleItem) => {
		if (titleItem.querySelector(".zhihucopier-button")) return;

		const Button = MakeButton();
		Button.style.width = "120px";
		Button.style.fontSize = "13px";
		Button.style.lineHeight = "13px";
		Button.style.margin = "0";
		Button.innerHTML = "抓取全部回答";
		Button.classList.add("zhihucopier-button");

		if (getParent(titleItem, "App-main")) {
			titleItem.append(Button);
		} else {
			Button.style.marginRight = ".4em";
			titleItem.prepend(Button);
		}

		Button.addEventListener("click", async (e: Event) => {
			e.stopPropagation();
			e.preventDefault();

			try {
				Button.disabled = true;
				Button.innerHTML = "开始抓取...";

				// 抓取所有回答
				let lastHeight = 0;
				let consecutiveNoChange = 0;
				const maxConsecutiveNoChange = 3; // 连续3次高度不变则认为到底

				while (true) {
					// 1. 处理当前可见的回答
					await processVisibleAnswers();
					Button.innerHTML = `已抓取 ${allAnswers.length} 个回答...`;

					// 2. 查看是否有"显示更多"按钮，有就点
					const loadMoreButton = document.querySelector(".QuestionMainAction");
					if (loadMoreButton && !(loadMoreButton as HTMLElement).innerText.includes("收起")) {
						(loadMoreButton as HTMLElement).click();
						await sleep(1500); // 点击后等待加载
					}

					// 3. 滚动到底部来触发懒加载
					window.scrollTo({ top: document.body.scrollHeight, behavior: "auto" });
					await sleep(2000); // 等待滚动和懒加载

					// 4. 模拟"jiggle"以触发一些棘手的懒加载
					window.scrollBy(0, -100);
					await sleep(200);
					window.scrollTo({ top: document.body.scrollHeight, behavior: "auto" });
					await sleep(2000);

					// 5. 检查是否加载了新内容
					const currentHeight = document.body.scrollHeight;
					if (currentHeight === lastHeight) {
						consecutiveNoChange++;
						if (consecutiveNoChange >= maxConsecutiveNoChange) {
							// 如果高度连续多次没有变化，我们认为已经到底了
							await processVisibleAnswers(); // 最后再处理一次，以防万一
							Button.innerHTML = `抓取完成 ${allAnswers.length} 个`;
							console.log("页面高度未变化，抓取结束。");
							break;
						}
					} else {
						consecutiveNoChange = 0; // 高度变了，重置计数器
					}
					lastHeight = currentHeight;

					// 6. 如果出现了"收起"按钮，也代表结束
					const finalLoadMoreButton = document.querySelector(".QuestionMainAction");
					if (finalLoadMoreButton && (finalLoadMoreButton as HTMLElement).innerText.includes("收起")) {
						await processVisibleAnswers(); // 最后再处理一次
						console.log("已找到\"收起\"按钮，抓取结束。");
						break;
					}

					// 7. 新增：如果出现了底部的"写回答"区域，也代表结束
					const bottomBar = document.querySelector("div[data-za-detail-view-path-module=\"BottomBar\"]");
					if (bottomBar) {
						await processVisibleAnswers(); // 最后再处理一次
						console.log("已找到底部写回答区域，抓取结束。");
						break;
					}
				}

				// 下载所有回答
				const questionTitle = getQuestionTitle();
				const questionData: QuestionData = {
					title: questionTitle,
					url: window.location.href,
					answers: allAnswers
				};

				let markdownContent = `# ${questionData.title}\n\n`;
				markdownContent += `源问题链接: ${questionData.url}\n\n`;

				const answerMarkdownParts = questionData.answers.map((answer) => {
					return generateSingleAnswerMarkdown(answer, questionData.title);
				});

				markdownContent += answerMarkdownParts.join("\n\n------\n\n");

				const blob = new Blob([markdownContent], {
					type: "text/markdown;charset=utf-8"
				});

				saveAs(blob, `${questionData.title}-${allAnswers.length}个回答.md`);

				Button.style.width = "90px";
				Button.innerHTML = "下载成功✅";
				setTimeout(() => {
					Button.innerHTML = "抓取全部回答";
					Button.style.width = "120px";
					Button.disabled = false;
				}, 1000);
			} catch {
				Button.style.width = "190px";
				Button.innerHTML = "发生未知错误，请联系开发者";
				setTimeout(() => {
					Button.innerHTML = "抓取全部回答";
					Button.style.width = "120px";
					Button.disabled = false;
				}, 1000);
			}
		});
	});

	await processVisibleAnswers();
}

const main = async () => {
	if (document.querySelector(".QuestionHeader-title")) {
		await processQuestionPage();
	} else if (document.querySelector(".Post-Main")) {
		await processArticlePage();
	}
};

// 运行主函数
setTimeout(main, 300);
setInterval(main, 1000);