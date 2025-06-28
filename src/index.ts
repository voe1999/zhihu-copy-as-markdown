import { saveAs } from "file-saver";
import { MakeButton, getParent } from "./core/utils";
import NormalItem, { AnswerData } from "./situation/NormalItem";
import PinItem from "./situation/PinItem";

interface QuestionData {
	title: string;
	url: string;
	answers: AnswerData[];
}

const allAnswers: AnswerData[] = [];

const AddAnswer = (answer: AnswerData) => {
	// 避免重复添加相同的回答
	if (allAnswers.every((item) => item.id !== answer.id)) {
		allAnswers.push(answer);
	}
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

			// 获取赞同数
			const voteButton = answer.querySelector(".VoteButton--up");
			const voteText = voteButton?.textContent?.trim() || "";
			const voteCount = parseInt(voteText.replace(/[^0-9]/g, "")) || 0;

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
			const answerData = await NormalItem(richText);
			// 添加赞同数到回答数据中
			answerData.voteCount = voteCount;
			AddAnswer(answerData);

			// 复制为Markdown按钮
			const ButtonCopyMarkdown = MakeButton();
			ButtonCopyMarkdown.innerHTML = "复制为Markdown";
			ButtonCopyMarkdown.style.borderRadius = "1em 0 0 1em";
			ButtonCopyMarkdown.style.paddingLeft = ".4em";
			ButtonContainer.prepend(ButtonCopyMarkdown);

			ButtonCopyMarkdown.addEventListener("click", () => {
				try {
					navigator.clipboard.writeText(answerData.content);
					ButtonCopyMarkdown.innerHTML = "复制成功✅";
					setTimeout(() => {
						ButtonCopyMarkdown.innerHTML = "复制为Markdown";
					}, 1000);
				} catch {
					ButtonCopyMarkdown.innerHTML = "发生未知错误<br>请联系开发者";
					ButtonCopyMarkdown.style.height = "4em";
					setTimeout(() => {
						ButtonCopyMarkdown.style.height = "2em";
						ButtonCopyMarkdown.innerHTML = "复制为Markdown";
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
					saveAs(blob, `${answerData.title}-${answerData.author.name}.json`);
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
			const pinRaw = await PinItem(richText);
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
			const answerData = {
				id: pinRaw.itemId,
				title: pinRaw.title,
				content: pinRaw.markdown.join("\n\n"),
				author: {
					name: author,
					url: authorUrl
				},
				url: `https://www.zhihu.com/pin/${pinRaw.itemId}`,
				voteCount: 0,
				createdTime: "",
				updatedTime: ""
			};
			AddAnswer(answerData);

			// 复制为Markdown按钮
			const ButtonCopyMarkdown = MakeButton();
			ButtonCopyMarkdown.innerHTML = "复制为Markdown";
			ButtonCopyMarkdown.style.borderRadius = "1em 0 0 1em";
			ButtonCopyMarkdown.style.paddingLeft = ".4em";
			ButtonContainer.prepend(ButtonCopyMarkdown);

			ButtonCopyMarkdown.addEventListener("click", () => {
				try {
					navigator.clipboard.writeText(answerData.content);
					ButtonCopyMarkdown.innerHTML = "复制成功✅";
					setTimeout(() => {
						ButtonCopyMarkdown.innerHTML = "复制为Markdown";
					}, 1000);
				} catch {
					ButtonCopyMarkdown.innerHTML = "发生未知错误<br>请联系开发者";
					ButtonCopyMarkdown.style.height = "4em";
					setTimeout(() => {
						ButtonCopyMarkdown.style.height = "2em";
						ButtonCopyMarkdown.innerHTML = "复制为Markdown";
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
					saveAs(blob, `${answerData.title}-${answerData.author.name}.json`);
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

const main = async () => {
	console.log("Starting…");

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

		Button.addEventListener("click", async (e) => {
			e.stopPropagation();
			e.preventDefault();

			try {
				Button.disabled = true;
				Button.innerHTML = "开始抓取...";

				// 抓取所有回答
				let attempts = 0;
				const maxAttempts = 100; // 防止无限循环
				let prevAnswerCount = 0;

				while (attempts < maxAttempts) {
					// 处理当前可见的回答
					await processVisibleAnswers();

					// 获取当前回答数量
					const currentAnswerCount = allAnswers.length;
					if (currentAnswerCount > prevAnswerCount) {
						Button.innerHTML = `已抓取 ${currentAnswerCount} 个回答...`;
						prevAnswerCount = currentAnswerCount;
					}

					// 点击"显示更多"按钮
					const loadMoreButton = await waitForElement(".QuestionMainAction");
					if (!loadMoreButton || loadMoreButton.textContent?.includes("收起")) {
						if (!isBottomReached()) {
							// 如果没有到达底部，继续滚动
							scrollToBottom();
							await sleep(1000);
							continue;
						}
						break;
					}

					// 点击加载更多
					(loadMoreButton as HTMLElement).click();
					await sleep(1000);

					attempts++;
				}

				// 下载所有回答
				const questionData: QuestionData = {
					title: allAnswers[0]?.title || "未知问题",
					url: window.location.href,
					answers: allAnswers
				};

				let markdownContent = `# ${questionData.title}\n\n`;
				markdownContent += `源问题链接: ${questionData.url}\n\n`;

				const answerMarkdownParts = questionData.answers.map((answer) => {
					let part = "";
					// 想法 item 有自己的标题
					if (answer.title && answer.title !== questionData.title) {
						part += `### ${answer.title}\n\n`;
					}
					part += `**作者**: [${answer.author.name}](${answer.author.url})\n`;
					part += `**回答链接**: ${answer.url}\n`;
					part += `**赞同数**: ${answer.voteCount}\n`;
					if (answer.createdTime) {
						part += `**创建时间**: ${answer.createdTime}\n`;
					}
					if (answer.updatedTime) {
						part += `**更新时间**: ${answer.updatedTime}\n`;
					}
					part += "\n---\n\n";
					part += answer.content;
					return part;
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
};

// 运行主函数
setTimeout(main, 300);
setInterval(main, 1000);