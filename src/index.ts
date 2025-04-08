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
	const answers = document.querySelectorAll(".List-item .ContentItem.AnswerItem");
	for (const answer of Array.from(answers)) {
		// 检查是否已经处理过
		if (answer.querySelector(".zhihucopier-button")) continue;

		// 展开回答
		const expandButton = answer.querySelector(".ContentItem-expandButton") as HTMLElement;
		if (expandButton) {
			expandButton.click();
			await sleep(200);
		}

		// 处理回答内容
		const richText = answer.querySelector(".RichText") as HTMLElement;
		if (richText) {
			try {
				// 处理回答
				const answerData = await NormalItem(richText);
				AddAnswer(answerData);

				// 添加标记，表示已处理
				const marker = document.createElement("div");
				marker.classList.add("zhihucopier-button");
				richText.prepend(marker);
			} catch (e) {
				console.error("处理回答时出错:", e);
			}
		}
	}
};

// 抓取所有回答
const fetchAllAnswers = async (progressCallback?: (status: string) => void) => {
	let attempts = 0;
	const maxAttempts = 100; // 防止无限循环
	let prevAnswerCount = 0;

	while (attempts < maxAttempts) {
		// 处理当前可见的回答
		await processVisibleAnswers();

		// 获取当前回答数量
		const currentAnswerCount = allAnswers.length;
		if (currentAnswerCount > prevAnswerCount) {
			progressCallback?.(`已抓取 ${currentAnswerCount} 个回答...`);
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

	const blob = new Blob([JSON.stringify(questionData, null, 2)], {
		type: "application/json;charset=utf-8"
	});

	saveAs(blob, `${questionData.title}-${allAnswers.length}个回答.json`);
	progressCallback?.(`完成，已下载 ${allAnswers.length} 个回答`);
};

const main = async () => {
	console.log("Starting…");

	// 添加抓取按钮
	const Titles = Array.from(document.getElementsByClassName("QuestionHeader-title")) as HTMLElement[];
	Titles.forEach((titleItem) => {
		if (titleItem.querySelector(".zhihucopier-button")) return;

		const ButtonContainer = document.createElement("div");
		ButtonContainer.style.position = "absolute";
		ButtonContainer.style.right = "1em";
		titleItem.style.position = "relative";
		titleItem.appendChild(ButtonContainer);

		// 抓取按钮
		const FetchButton = MakeButton();
		FetchButton.style.width = "160px";
		FetchButton.innerHTML = "抓取所有回答";
		FetchButton.addEventListener("click", async () => {
			try {
				FetchButton.disabled = true;
				await fetchAllAnswers((status) => {
					FetchButton.innerHTML = status;
				});
				setTimeout(() => {
					FetchButton.innerHTML = "抓取所有回答";
					FetchButton.disabled = false;
				}, 1000);
			} catch (e) {
				console.error(e);
				FetchButton.innerHTML = "抓取失败";
				setTimeout(() => {
					FetchButton.innerHTML = "抓取所有回答";
					FetchButton.disabled = false;
				}, 1000);
			}
		});
		ButtonContainer.appendChild(FetchButton);
	});
};

// 运行主函数
main();