# 大模型与 Agent 工程学习路线

这里用来整理 Agent、上下文工程、Transformer 和大模型推理相关的学习内容。

这不是资料堆放处，而是一条学习路线：

```text
Transformer
  ↓
LLM 推理优化
  ↓
LLM API：HTTP 请求如何变成 Transformer 输入
  ↓
模型训练、微调和部署
  ↓
Agent 开发与评测
  ↓
Agent 上下文工程
  ↓
开源 Agent 提示词目录
```

## 整理原则

- 先讲清楚直觉，再补充术语和细节。
- 新手入口放在前面，源码和工程细节放在后面。
- 每个主题尽量给例子，避免只堆概念。
- 未确定的内容先保留为问题，后续再逐步完善。

## 从哪里开始

如果你刚开始，先读：

- [Transformer 入门](docs/topics/transformer-beginner.md)
- [LLM 推理与架构优化入门](docs/topics/llm-inference-architecture.md)
- [LLM API：从 HTTP 到 Transformer](docs/topics/openai-api-beginner.md)

如果你想做工程落地，继续读：

- [模型训练与部署学习路线](docs/topics/model-training-deployment-roadmap.md)
- [本地部署框架对比](docs/topics/local-deployment-frameworks.md)
- [参数调优手册](docs/topics/parameter-tuning-handbook.md)

如果你想理解 Agent 产品设计，继续读：

- [Agent 开发入门](docs/topics/agent-development-beginner.md)
- [Agent 模式与实现](docs/topics/agent-patterns.md)
- [Agent Skills 实现思路](docs/topics/agent-skills-implementation.md)
- [Agent 效果评测框架](docs/topics/agent-evaluation-framework.md)
- [上下文工程入门](docs/topics/context-engineering-beginner.md)
- [什么是上下文工程](docs/topics/context-engineering.md)
- [上下文工程提示词模板库](docs/topics/context-engineering-prompt-templates.md)
- [开源 Agent 提示词目录](docs/topics/open-source-agent-prompts.md)

## 本地预览

```bash
pip install -r requirements.txt
mkdocs serve
```

然后打开 `http://127.0.0.1:8000`。
