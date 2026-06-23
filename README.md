# 大模型与 Agent 工程学习路线

这是一个面向工程实践的中文学习笔记库，目标是把大模型从数据、训练、推理、API、部署一路串到 Agent、上下文工程和大型 Agent 系统设计。

它不是资料链接集合，而是一条可按顺序阅读、也可按问题查阅的路线。

## 文档入口

- 站点首页：[docs/index.md](docs/index.md)
- 核心概念索引：[docs/topics/concept-index.md](docs/topics/concept-index.md)
- 全局地图：[docs/topics/llm-to-agent-system-overview.md](docs/topics/llm-to-agent-system-overview.md)

## 内容结构

当前文档按五组组织：

1. 总览：核心概念、全局路线、LLM 生命周期。
2. 模型原理：数据、Tokenizer、预训练、后训练、Reasoning、Transformer、推理架构。
3. 应用与部署：API、应用架构、训练微调、部署框架、量化、硬件选型、参数调优。
4. Agent 工程：Agent 入门、模式、Harness、Loop、安全、评测、Skills。
5. 系统设计：上下文工程、Multi-Agent、大型 Agent 系统、开源 Agent 提示词观察。

## 适合怎么读

- 完全新手：先读核心概念索引，再读全局地图和 LLM 生命周期。
- 想做应用：读 API、应用架构、RAG、工具调用、Workflow 和 Agent。
- 想训练或部署：读训练部署路线、LoRA / QLoRA、部署框架、量化和硬件选型。
- 想做 Agent 产品：读 Agent 开发、Harness Engineering、Loop Engineering、Guardrails、评测和上下文工程。

完整阅读顺序以 [站点首页](docs/index.md) 为准，README 只保留项目说明和本地运行方式，避免两处重复维护。

## 本地预览

```bash
pip install -r requirements.txt
mkdocs serve
```

打开 `http://127.0.0.1:8000`。

## 维护原则

- 首页只做路线和导航，不展开长篇解释。
- 专题文档尽量回答一个清晰问题，避免把多个主题混在一篇里。
- 重复概念优先放在核心概念索引，专题里只保留必要解释和继续阅读链接。
- 每篇专题尽量包含：适用场景、核心概念、工程判断、常见误区和下一步。
