(ns core.utils
  (:require [clojure.string :as str])
  (:require-macros [cljs.spec.alpha :as s])
  (:require [cljs.spec.alpha :as s]))

(defn ^:export zhihuLinkToNormalLink
  "Converts a Zhihu link to a normal link. 支持 link.zhihu.com 与 zhida.zhihu.com 两种跳转链接。"
  [link]
  (try
    (let [url    (js/URL. link)
          host   (.-hostname url)
          params (js/URLSearchParams. (.-search url))]
      (cond
        ;; link.zhihu.com 重定向
        (= host "link.zhihu.com")
        (some-> params (.get "target") js/decodeURIComponent)

        ;; zhida.zhihu.com 搜索实体
        (= host "zhida.zhihu.com")
        (let [q (.get params "q")]
          (if q
            (str "https://www.zhihu.com/search?q=" (js/decodeURIComponent q))
            link))

        :else link))
    (catch :default _ link)))

(defn ^:export getParent
  "Recursively get the parent dom with the class name."
  [dom className]
  (when dom
    (if (-> dom .-classList (.contains className))
      dom
      (recur (.-parentElement dom) className))))

(defn- query-selector-text [dom selector]
  (some-> (.querySelector dom selector) .-innerText str/trim))

(defn- query-selector-content [dom selector]
  (some-> (.querySelector dom selector) .-content))

(defn ^:export getTitle
  "Get the title from a given DOM element by trying different page structures."
  [dom]
  (or
   ;; 主页回答
   (some-> (getParent dom "AnswerItem") (query-selector-text ".ContentItem-title > div > a"))
   ;; 问题
   (some-> (getParent dom "QuestionPage") (query-selector-content "meta[itemprop=name]"))
   ;; 主页文章
   (some-> (getParent dom "ArticleItem") (query-selector-text "h2.ContentItem-title a"))
   ;; 文章
   (some-> (getParent dom "Post-NormalMain") (query-selector-text "header > h1.Post-Title"))
   "无标题"))

(defn ^:export getAuthor
  "Get the author info from a given DOM element."
  [dom]
  (let [author-dom (or (getParent dom "AnswerItem")
                       (some-> (getParent dom "ArticleItem") (.querySelector ".AuthorInfo-content"))
                       (some-> (getParent dom "Post-Main") (.querySelector ".Post-Author"))
                       (some-> (getParent dom "PinItem") (.querySelector ".PinItem-author")))]
    (when author-dom
      (let [name-dom  (some-> author-dom (.querySelector ".AuthorInfo-name .UserLink-link"))
            badge-dom (some-> author-dom (.querySelector ".AuthorInfo-badgeText"))]
        (when name-dom
          #js {:name (or (.-innerText name-dom) (-> name-dom .-children (aget 0) (.getAttribute "alt")))
               :url (.-href name-dom)
               :badge (if badge-dom (.-innerText badge-dom) "")})))))

(defn ^:export getUrl
  "Get the canonical URL for the content."
  [dom]
  (let [current-url (str (-> js/window .-location .-origin) (-> js/window .-location .-pathname))]
    (try
      (if (= (-> js/window .-location .-pathname) "/")
        (let [content-dom (or (getParent dom "AnswerItem") (getParent dom "ArticleItem"))]
          (if content-dom
            (-> content-dom (.querySelector "a[data-za-detail-view-id]") .-href)
            (str current-url "#WARNING_Failed_to_get_URL")))
        current-url)
      (catch :default _ current-url))))

(defn ^:export makeButton
  "Create and style a button element."
  []
  (let [btn (js/document.createElement "button")
        styles {"right" "0"
                 "top" "-2em"
                 "zIndex" "999"
                 "width" "120px"
                 "height" "2em"
                 "backgroundColor" "rgba(85, 85, 85, 0.9)"
                 "color" "white"
                 "outline" "none"
                 "cursor" "pointer"
                 "borderRadius" "1em"
                 "margin" "0 .2em 1em .2em"
                 "fontSize" ".8em"}]
    (.setAttribute btn "type" "button")
    (-> btn .-classList (.add "zhihucopier-button"))
    (set! (.-innerText btn) "")
    ;; 依次写入 style 属性，避免直接用对象覆盖导致样式失效
    (doseq [[k v] styles]
      (aset (.-style btn) k v))
    btn))

(defn ^:export getQuestionTitle
  "Get the title of the question page."
  []
  (if-let [title-el (.querySelector js/document ".QuestionHeader-title")]
    (let [clone (.cloneNode title-el true)]
      (some-> (.querySelector clone ".zhihucopier-button") (.remove))
      (or (some-> (.-textContent clone) (str/trim)) "未知问题"))
    "未知问题")) 