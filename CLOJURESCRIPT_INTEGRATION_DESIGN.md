# 架构设计文档：TypeScript 项目中集成 ClojureScript 的模式与实践

## 1. 摘要 (Abstract)

本文档定义了一套标准的架构模式，用于在成熟的 TypeScript 项目中集成 ClojureScript 模块。其核心架构原则是：**将 TypeScript 作为共享数据结构的“单一事实来源”(Single Source of Truth)**，而 ClojureScript 则专注于执行高性能、纯函数式的数据处理与业务逻辑。

此模式旨在建立一个健壮、可维护、类型安全的混合语言（Polyglot）开发环境，通过发挥两种语言的独特优势，实现系统整体的工程卓越性。

## 2. 动机与目标 (Motivation & Goals)

- **动机**: 在大型 TypeScript 应用中，某些特定领域（如复杂数据转换、规则引擎、状态管理）的逻辑实现可能非常繁琐。引入 ClojureScript 是为了利用其在不变性 (Immutability)、数据处理流水线和函数式编程方面的强大能力来解决这些痛点。
- **架构目标**:
    1.  **无缝互操作 (Seamless Interoperability)**: 建立一个清晰的边界（Boundary）和契约（Contract），使得 TS 与 CLJS 模块可以无缝、高效地互相调用。
    2.  **维护类型保真度 (Preserve Type Fidelity)**: 完整保留并利用 TypeScript 的静态类型系统，确保在整个调用链中实现端到端的类型安全。
    3.  **提升开发者体验 (Enhance Developer Experience)**: 建立一个可预测、易于遵循的开发工作流，最大化两种语言环境下的 IDE 支持和工具链效率。
    4.  **技术栈解耦 (Decouple Technology Stacks)**: 确保 CLJS 模块是“可替换”的组件，其内部实现细节对 TS 调用方透明，反之亦然。

## 3. 核心架构方案 (Core Architectural Design)

### 3.1. 类型定义：TypeScript 作为单一事实来源

所有跨语言边界共享的数据结构、接口和类型，必须在 TypeScript (`.ts`/`.d.ts`) 文件中定义。

- **理由**:
    -   **权威契约**: TypeScript 类型定义构成了两个子系统之间交互的权威性契约。
    -   **静态分析与安全**: 使 TypeScript 编译器 (tsc) 能够对整个应用的类型流进行静态分析，在编译期捕获因数据结构不匹配而产生的潜在错误。
    -   **生态系统集成**: 这是与现有前端框架（React, Angular, Vue）、后端框架（Node.js）以及整个 JS/TS 生态系统集成的最直接、最自然的方式。

### 3.2. ClojureScript 模块设计原则

ClojureScript 模块应被设计为接收和返回普通 JavaScript 对象 (POJO) / 数组的纯函数 (Pure Functions)。

- **原则**:
    -   **输入/输出边界**: 模块的公共 API（导出的函数）是其与外部世界交互的唯一边界。在此边界上，数据格式为标准 JavaScript 对象。
    -   **内部转换**: 在函数内部，应立即使用 `js->clj` 将传入的 JS 对象转换为 CLJS 的持久化数据结构。这使得内部逻辑可以充分利用 ClojureScript 的核心优势。
    -   **返回前转换**: 在函数返回之前，必须使用 `clj->js` 将结果从 CLJS 数据结构转换回标准 JavaScript 对象。
    -   **无状态性 (Statelessness)**: 导出的 CLJS 函数应尽可能设计为无状态的，其输出仅依赖于其输入，从而实现可预测性和可测试性。

### 3.3. 互操作接口 (Interop Interface)

-   **导出 (Exporting from CLJS)**: 所有需要被 TS 调用的 CLJS 函数，都必须使用 `^:export` 元数据进行标记。构建工具（如 shadow-cljs）会将其编译为标准的 JavaScript `export`。
-   **导入 (Importing into TS)**: TypeScript 代码像导入任何其他标准 ES 模块一样导入 CLJS 的编译产物，并使用在 TS 中定义的类型来强类型化这些导入的函数。

### 3.4. (推荐) 使用 `cljs.spec` 进行运行时契约校验

虽然 TS 提供了编译时检查，但它无法防止在运行时传入不合法的数据（例如，来自 API 的错误响应）。`cljs.spec` 在此充当了运行时的数据“断言”或“契约校验”层。

- **作用**: 在 CLJS 函数的入口处，使用 `spec` 校验转换后的 CLJS 数据结构是否符合预期。这是一种防御性编程实践，可以在数据进入核心逻辑之前就快速失败 (Fail-fast)，从而极大地增强系统的健壮性。

### 3.5. 文件组织：按功能逻辑进行 co-location

为了提升模块内聚度，我们不按编程语言划分目录，而是采用“按功能切片”的原则，将实现同一业务逻辑的 TypeScript 和 ClojureScript 文件放置在同一个目录中。

- **原则**: 模块的内聚性应围绕业务功能，而非技术实现。
- **优势**:
    - **高内聚**: 一个功能的所有代码都在一个地方，便于理解、修改和维护。
    - **上下文切换成本低**: 开发者在处理一个功能时，无需在 `src-ts/` 和 `src-cljs/` 这样的目录间来回跳转。
- **示例目录结构**:
    ```
    src/
    └── features/
        ├── authentication/
        │   ├── auth.service.ts
        │   ├── auth.ui.tsx
        │   └── auth.validators.cljs  // CLJS 用于复杂的校验逻辑
        └── data-processing/
            ├── data-processing.service.ts
            ├── data-processing.logic.cljs  // CLJS 用于核心数据转换
            └── index.ts
    ```

## 4. 构建与集成策略 (Build & Integration Strategy)

此架构采用一个**两阶段构建流程**，首先是独立的语言转换（Transpilation），然后是统一的最终打包（Bundling）。

### 阶段一：语言转换 (Transpilation)

在此阶段，`.ts` 和 `.cljs` 文件被各自的编译器转换为标准的 JavaScript (ESM)。

1.  **ClojureScript 编译**:
    -   **工具**: `shadow-cljs`
    -   **输入**: 扫描整个 `src/` 目录树以查找 `.cljs` 文件。
    -   **输出**: 将编译后的 `.js` 文件输出到 `build/cljs/` 目录，并保持其原始的相对目录结构。

2.  **TypeScript 编译**:
    -   **工具**: `tsc` (或由主打包工具集成的 `esbuild`/`swc`)
    -   **输入**: 扫描整个 `src/` 目录树以查找 `.ts`/`.tsx` 文件。
    -   **输出**: 将编译后的 `.js` 文件输出到 `build/ts/` 目录，同样保持原始目录结构。

### 阶段二：最终打包 (Final Bundling)

在此阶段，一个主打包工具（如 Vite, Webpack, Parcel）将两个中间目录 (`build/cljs` 和 `build/ts`) 中的 JavaScript 模块整合成最终的应用产物。

-   **配置**:
    -   主打包工具需要被配置为能够从 `build/` 目录解析模块。
    -   它将负责处理模块间的依赖关系（例如，一个 `build/ts` 中的文件导入另一个 `build/cljs` 中的文件）、代码分割、Tree-Shaking 和最终的压缩优化。

这种分层构建的方法将语言特有的编译复杂性与通用的打包优化任务解耦，使整个流程更加清晰和可控。

## 5. 开发工作流标准示例 (Standard Workflow Example)

### 第 1 步: 在功能目录中定义共享类型

```typescript
// src/features/data-processing/types.ts

/**
 * Describes a user entity, serving as a data contract.
 */
export interface UserProfile {
    id: string;
    displayName: string;
    email: string;
    featureFlags: Record<string, boolean>;
}

/**
 * A complex data structure that will be processed by ClojureScript.
 */
export interface ComplexDataObject {
    correlationId: string;
    user: UserProfile;
    payload: unknown[];
    isActive: boolean;
}
```

### 第 2 步: 在同一目录中实现 ClojureScript 核心逻辑

```clojure
// src/features/data-processing/logic.cljs
(ns features.data-processing.logic ;; 命名空间应反映文件路径
  (:require [cljs.spec.alpha :as s]))

;; Runtime specs to validate the data contract at the boundary.
(s/def ::id string?)
(s/def ::displayName string?)
(s/def ::email string?)
(s/def ::featureFlags map?)
(s/def ::userProfile (s/keys :req-un [::id ::displayName ::email ::featureFlags]))
(s/def ::complexDataObject (s/keys :req-un [::userProfile]))

(defn ^:export process-data
  "Processes a JS data object, validates it, and returns a transformed object."
  [data-obj-js]
  (let [data-obj (js->clj data-obj-js :keywordize-keys true)]
    ;; Runtime data validation provides an extra layer of safety.
    (if-not (s/valid? ::complexDataObject data-obj)
      (throw (js/Error. (str "Invalid data structure: " (s/explain-str ::complexDataObject data-obj))))
      ;; Core transformation logic leverages ClojureScript's strengths.
      (let [transformed-data (-> data-obj
                                 (assoc-in [:user :displayName] "Processed Name")
                                 (assoc-in [:user :featureFlags :new-feature] true))]
        ;; Convert back to JS object before returning to the TypeScript world.
        (clj->js transformed-data)))))
```

### 第 3 步: 配置构建工具

#### `shadow-cljs.edn`

```edn
;; shadow-cljs.edn
{:source-paths ["src"] ; 让 shadow-cljs 扫描整个 src 目录

 :builds
 {:app ; 一个统一的构建目标
  {:target :esm
   :output-dir "build/cljs" ; 指定 CLJS 的中间编译产物目录
   :compiler-options {:output-feature-expressions true}
   ;; 无需 :modules 配置，让 shadow-cljs 对每个 cljs 文件生成对应的 js 文件
   ;; 主打包工具将负责最终的模块组合
   }}}
```

#### `tsconfig.json` (示例)

```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "Node",
    "target": "ES2022",
    "outDir": "build/ts", // 指定 TS 的中间编译产物目录
    "rootDir": "src",
    "strict": true
    // ... other options
  },
  "include": ["src/**/*"]
}
```

### 第 4 步: 在 TypeScript 中跨语言调用

```typescript
// src/features/data-processing/service.ts
// 导入同一个目录下的 cljs 编译产物，注意扩展名为 .js
import { processData } from './logic.js';
import type { ComplexDataObject } from './types';

/**
 * A service that utilizes ClojureScript for complex data processing.
 */
export class DataProcessingService {
    public processEntity(entity: ComplexDataObject): ComplexDataObject {
        console.log('Passing entity to ClojureScript:', entity);

        // 调用完全由 TypeScript 类型系统检查
        const processedEntity = processData(entity) as ComplexDataObject;

        console.log('Received processed entity from ClojureScript:', processedEntity);
        return processedEntity;
    }
}
```
*在此工作流中，开发者工具（如 `concurrently`）会同时运行 `shadow-cljs` 和 `tsc` (或 Vite) 的 watch 模式，实现修改任一语言文件后的自动重新编译。*

## 6. 结论 (Conclusion)

该架构模式通过明确的职责分离和清晰的边界定义，为 TypeScript 和 ClojureScript 的协同工作提供了一个强大而灵活的框架。**通过采用按功能 co-location 的文件组织策略和两阶段构建流程**，它进一步提升了代码的内聚性和可维护性，允许团队利用“最佳适用技术”，将 ClojureScript 的函数式威力精确地应用到最需要的场景中，同时维护整个系统的类型安全、可维护性和工程严谨性。 