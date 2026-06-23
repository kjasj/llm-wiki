# AGENT.md

这是 `llm-wiki` 仓库的长期项目记忆，供后续 Agent 进入仓库时快速理解项目状态和维护约定。

## 项目定位

这是一个用 MkDocs Material 构建的中文学习文档库，主题是 LLM 与 Agent 工程。

目标不是资料链接集合，而是一条工程化学习路线：从模型原理、推理、API、训练部署，到 Agent Runtime、上下文工程、多 Agent 和大型 Agent 系统。

## 目录结构

- `README.md`：项目说明、本地运行方式、维护原则。不要在这里维护完整阅读路线。
- `mkdocs.yml`：站点配置和左侧菜单导航。新增专题必须挂进这里。
- `docs/index.md`：站点首页，负责主学习路线、目标分流和常见阅读路径。
- `docs/topics/`：专题文档目录。大部分内容都在这里。
- `docs/decisions/index.md`：结构性维护决策记录。新增重要专题或调整导航时同步记录。
- `docs/javascripts/mermaid-render.mjs`：Mermaid 渲染脚本。

## 当前导航分组

左侧菜单按学习阶段组织：

1. `0. 总览`
2. `1. 模型原理`
3. `2. 应用与部署`
4. `3. Agent 工程`
5. `4. 系统设计`

菜单标题应保持短、清晰、风格统一。正文页面标题可以更完整。

## 写作原则

- 每篇专题尽量回答一个清晰问题。
- 写新专题或大改专题前，必须先检索相关论文、官方文档、权威工程博客或知名从业者文章；先建立资料依据，再组织成本文档自己的工程化解释。
- 首页只维护路线和导航，不展开长篇概念解释。
- README 只维护项目说明和本地运行，不重复完整路线。
- 重复概念优先放到 `docs/topics/concept-index.md`。
- 专题文档末尾尽量提供“下一步”链接。
- 新增重要专题时，同步更新：
  - `mkdocs.yml`
  - `docs/index.md`
  - `docs/topics/concept-index.md`
  - `docs/decisions/index.md`

## 文档风格

- 用中文写作，术语可保留英文，如 Agent、Harness、Loop、RAG、MCP。
- 先讲直觉，再讲结构、流程、工程判断和常见误区。
- 尽量使用表格、流程图和最小示例。
- 文档要写得详细一些，不能只给结论；关键概念必须配示例、伪代码、配置片段或代码演示，方便读者理解和复现。
- 不要只堆概念，要说明适用场景、风险和落地顺序。
- 避免把同一段解释复制到多篇文章；用链接承接上下游。

## 当前重点主题

仓库已经覆盖：

- 模型基础：数据、Tokenizer、后训练、Reasoning、Transformer、推理架构。
- 应用与部署：API、应用架构、RAG、模型路由、训练部署、量化、硬件、参数、LLMOps。
- Agent 工程：Agent 入门、Agent Runtime、模式、Harness、Loop、安全、Skills、MCP、评测。
- 系统设计：上下文工程、Prompt 模板、Multi-Agent、记忆、大型 Agent 系统、开源提示词观察。

后续适合继续补：

- 端到端实战案例，例如企业知识库 RAG、代码修复 Agent、工单处理 Agent。
- 多模态 Agent。
- Prompt / Context 版本化与测试。
- 安全红队案例。
- 前端产品体验，例如 citation UI、human approval UI、trace viewer。

## 验证命令

优先使用本地虚拟环境：

```bash
.venv/bin/mkdocs build --strict
```

常用静态检查：

```bash
git diff --check
```

如果 `.venv` 不存在：

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

`site/` 和 `.venv/` 已在 `.gitignore` 中，不应提交。

## 当前工作区注意事项

当前仓库可能存在未提交的文档扩展改动，包括新增专题和导航更新。不要随意还原这些文件。

已经新增或正在完善的专题包括：

- `docs/topics/rag-engineering-practice.md`
- `docs/topics/model-selection-routing.md`
- `docs/topics/llmops-production.md`
- `docs/topics/mcp-tool-protocol.md`
- `docs/topics/agent-runtime-project-development.md`

这些改动是围绕“补齐文档库缺口”和“Agent 项目开发实战”展开的，后续提交时应一起检查导航、首页、索引和决策记录是否同步。

## Git 约定

- 提交前先检查 `git status --short`。
- 不要还原用户或其他 Agent 的未提交改动。
- 文档变更提交信息建议使用 `docs:` 前缀。
- 推送前运行 `mkdocs build --strict`。
