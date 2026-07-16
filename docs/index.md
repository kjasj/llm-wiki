# 大模型与 Agent 工程学习路线

这套文档想解决一个问题：

> 从“我会调用一个 LLM API”到“我能设计、部署和评测一个 Agent 系统”，中间到底要补哪些知识？

文档按工程视角组织，而不是按论文或工具列表堆放。先建立全局地图，再进入模型、API、训练部署、Agent 产品和系统架构。

## 一张全局路线图

```text
总览
  ↓
数据、Tokenizer、预训练、后训练
  ↓
Reasoning Models、Transformer、推理架构
  ↓
API、RAG、模型路由、工具调用、Workflow、Agent
  ↓
训练、微调、量化、部署、硬件、参数、LLMOps
  ↓
Agent Runtime、Loop、Harness、Guardrails、Evaluation、Skills、MCP
  ↓
Context Engineering、Multi-Agent、大型 Agent 系统
```

## 先按你的目标选路线

| 目标 | 推荐入口 | 接下来读 |
| --- | --- | --- |
| 不知道术语属于哪一层 | [核心概念索引](topics/concept-index.md) | [大模型与推理优化术语表](topics/llm-inference-terms-glossary.md) |
| 正在读推理优化文章，缩写太多 | [大模型与推理优化术语表](topics/llm-inference-terms-glossary.md) | [LLM 推理与架构优化入门](topics/llm-inference-architecture.md) |
| 想建立完整知识地图 | [从 LLM 出生到大型 Agent 系统](topics/llm-to-agent-system-overview.md) | [LLM 生命周期](topics/llm-lifecycle.md) |
| 想理解模型怎么处理文本 | [数据、Tokenizer 与预训练数据工程入门](topics/data-tokenizer-pretraining-data.md) | [Transformer 入门](topics/transformer-beginner.md) |
| 想做 LLM 应用 | [LLM API：从 HTTP 到 Transformer](topics/openai-api-beginner.md) | [LLM 应用架构](topics/llm-application-architecture.md) |
| 想看懂一次 Chat 请求的内部执行 | [OpenAI-compatible Chat API 执行链路](topics/openai-chat-api-execution-pipeline.md) | [LLM 推理与架构优化入门](topics/llm-inference-architecture.md) |
| 想做企业知识库或文档问答 | [RAG 工程实践](topics/rag-engineering-practice.md) | [Agent 效果评测框架](topics/agent-evaluation-framework.md) |
| 想控制模型质量、延迟和成本 | [模型选择与路由](topics/model-selection-routing.md) | [参数调优手册](topics/parameter-tuning-handbook.md) |
| 想训练或微调模型 | [模型训练与部署学习路线](topics/model-training-deployment-roadmap.md) | [LoRA 与 QLoRA 微调入门](topics/lora-qlora-finetuning.md) |
| 想本地或线上部署模型 | [本地部署框架对比](topics/local-deployment-frameworks.md) | [模型量化与推理压缩入门](topics/model-quantization-and-compression.md) |
| 想把 LLM 应用上线运营 | [LLM 应用生产化](topics/llmops-production.md) | [模型选择与路由](topics/model-selection-routing.md) |
| 想开发 Agent | [Agent 开发入门](topics/agent-development-beginner.md) | [Agent 模式与实现](topics/agent-patterns.md) |
| 想实现 Agent runtime | [Agent 项目开发实战](topics/agent-runtime-project-development.md) | [Harness Engineering](topics/harness-engineering.md) |
| 想做可靠 Agent 产品 | [Harness Engineering](topics/harness-engineering.md) | [Loop Engineering](topics/loop-engineering.md)、[Agent 安全与 Guardrails](topics/agent-security-guardrails.md) |
| 想接入外部工具和数据源 | [MCP 工具协议](topics/mcp-tool-protocol.md) | [Agent Skills 实现思路](topics/agent-skills-implementation.md) |
| 想评测 Agent 效果 | [Agent 效果评测框架](topics/agent-evaluation-framework.md) | [参数调优手册](topics/parameter-tuning-handbook.md) |
| 想设计平台级系统 | [大型 Agent 系统架构设计](topics/large-agent-system-architecture.md) | [Multi-Agent 协作、自进化与记忆系统](topics/multi-agent-collaboration-memory.md) |

## 推荐阅读顺序

### 0. 先建立地图

1. [核心概念索引](topics/concept-index.md)
2. [大模型与推理优化术语表](topics/llm-inference-terms-glossary.md)
3. [从 LLM 出生到大型 Agent 系统](topics/llm-to-agent-system-overview.md)
4. [LLM 生命周期：从数据到线上模型](topics/llm-lifecycle.md)

这一组回答“这些词彼此是什么关系”。不要一开始就陷进某个框架或参数。

### 1. 模型原理

1. [数据、Tokenizer 与预训练数据工程入门](topics/data-tokenizer-pretraining-data.md)
2. [后训练与对齐入门：SFT、DPO、RLHF、RFT](topics/post-training-alignment.md)
3. [Reasoning Models 与 Test-Time Compute 入门](topics/reasoning-models-test-time-compute.md)
4. [Transformer 入门](topics/transformer-beginner.md)
5. [LLM 推理与架构优化入门](topics/llm-inference-architecture.md)
6. [Hy3 Preview 推理优化案例：从算子到系统](topics/hy3-preview-inference-optimization-case.md)

这一组回答“模型为什么能生成、为什么慢、为什么贵、为什么有上下文长度限制”。

### 2. 应用与部署

1. [LLM API：从 HTTP 到 Transformer](topics/openai-api-beginner.md)
2. [OpenAI-compatible Chat API 执行链路](topics/openai-chat-api-execution-pipeline.md)
3. [LLM 应用架构：Chatbot、RAG、工具调用、工作流与 Agent](topics/llm-application-architecture.md)
4. [RAG 工程实践](topics/rag-engineering-practice.md)
5. [模型选择与路由](topics/model-selection-routing.md)
6. [模型训练与部署学习路线](topics/model-training-deployment-roadmap.md)
7. [原生 Python 训练循环入门](topics/python-training-loop.md)
8. [LoRA 与 QLoRA 微调入门](topics/lora-qlora-finetuning.md)
9. [本地部署框架对比](topics/local-deployment-frameworks.md)
10. [模型量化与推理压缩入门](topics/model-quantization-and-compression.md)
11. [模型部署硬件选型](topics/model-deployment-hardware-sizing.md)
12. [参数调优手册](topics/parameter-tuning-handbook.md)
13. [LLM 应用生产化](topics/llmops-production.md)

这一组回答“怎么把模型接进业务、怎么训练一点自己的行为、怎么让它跑起来并调到可用”。

### 3. Agent 工程

1. [Agent 开发入门](topics/agent-development-beginner.md)
2. [Agent 项目开发实战：上下文、工具、权限和沙箱](topics/agent-runtime-project-development.md)
3. [Agent 模式与实现](topics/agent-patterns.md)
4. [Harness Engineering：把模型变成可用 Agent 的工程](topics/harness-engineering.md)
5. [Loop Engineering：Agent 循环、停止条件与恢复](topics/loop-engineering.md)
6. [Agent 安全与 Guardrails：权限、注入攻击与运行时边界](topics/agent-security-guardrails.md)
7. [Agent Skills 实现思路](topics/agent-skills-implementation.md)
8. [MCP 工具协议](topics/mcp-tool-protocol.md)
9. [Agent 效果评测框架](topics/agent-evaluation-framework.md)

这一组回答“为什么同一个模型放进不同产品里效果差很多，以及 Agent 什么时候会失控、卡住或越权”。

### 4. 系统设计

1. [上下文工程入门](topics/context-engineering-beginner.md)
2. [什么是上下文工程](topics/context-engineering.md)
3. [上下文工程提示词模板库](topics/context-engineering-prompt-templates.md)
4. [Multi-Agent 协作、自进化与记忆系统](topics/multi-agent-collaboration-memory.md)
5. [大型 Agent 系统架构设计](topics/large-agent-system-architecture.md)
6. [开源 Agent 提示词目录](topics/open-source-agent-prompts.md)

这一组回答“模型每一轮应该看到什么，多个 Agent 如何协作，平台如何管理任务、状态、记忆、权限和评测”。

## 常见阅读路径

### 我只想快速做一个 LLM 应用

读：

1. [LLM API：从 HTTP 到 Transformer](topics/openai-api-beginner.md)
2. [OpenAI-compatible Chat API 执行链路](topics/openai-chat-api-execution-pipeline.md)
3. [LLM 应用架构](topics/llm-application-architecture.md)
4. [模型选择与路由](topics/model-selection-routing.md)
5. [参数调优手册](topics/parameter-tuning-handbook.md)
6. [LLM 应用生产化](topics/llmops-production.md)

暂时跳过训练、量化和 Multi-Agent。先把 API、上下文、状态、日志和评测闭环做清楚。

### 我想做 RAG 或企业知识库

读：

1. [LLM 应用架构](topics/llm-application-architecture.md)
2. [RAG 工程实践](topics/rag-engineering-practice.md)
3. [数据、Tokenizer 与预训练数据工程入门](topics/data-tokenizer-pretraining-data.md)
4. [参数调优手册](topics/parameter-tuning-handbook.md)
5. [Agent 效果评测框架](topics/agent-evaluation-framework.md)

重点不是“接一个向量库”，而是数据清洗、chunk、召回、重排、引用、评测和失败归因。

### 我想微调开源模型

读：

1. [模型训练与部署学习路线](topics/model-training-deployment-roadmap.md)
2. [原生 Python 训练循环入门](topics/python-training-loop.md)
3. [后训练与对齐入门](topics/post-training-alignment.md)
4. [LoRA 与 QLoRA 微调入门](topics/lora-qlora-finetuning.md)
5. [参数调优手册](topics/parameter-tuning-handbook.md)

先确认问题是不是需要微调。新知识通常优先用 RAG，稳定格式和行为才更适合 SFT / LoRA。

### 我想本地部署模型

读：

1. [本地部署框架对比](topics/local-deployment-frameworks.md)
2. [模型量化与推理压缩入门](topics/model-quantization-and-compression.md)
3. [模型部署硬件选型](topics/model-deployment-hardware-sizing.md)
4. [LLM 推理与架构优化入门](topics/llm-inference-architecture.md)
5. [Hy3 Preview 推理优化案例](topics/hy3-preview-inference-optimization-case.md)

先分清本地实验、小型服务和生产服务。能跑起来不等于能稳定服务。

### 我想做 Codex / Claude Code 这类 Agent 产品

读：

1. [Agent 开发入门](topics/agent-development-beginner.md)
2. [Agent 项目开发实战](topics/agent-runtime-project-development.md)
3. [Harness Engineering](topics/harness-engineering.md)
4. [Loop Engineering](topics/loop-engineering.md)
5. [Agent 安全与 Guardrails](topics/agent-security-guardrails.md)
6. [Agent Skills 实现思路](topics/agent-skills-implementation.md)
7. [MCP 工具协议](topics/mcp-tool-protocol.md)
8. [上下文工程入门](topics/context-engineering-beginner.md)
9. [什么是上下文工程](topics/context-engineering.md)
10. [开源 Agent 提示词目录](topics/open-source-agent-prompts.md)

核心不是写一个更长的 system prompt，而是设计上下文、工具、权限、状态、恢复、评测和可观测性。

## 文档维护约定

- 首页只维护学习路线，不在这里展开所有概念细节。
- 概念定义优先放在 [核心概念索引](topics/concept-index.md)，专题文档只保留必要解释。
- 每篇专题尽量回答一个主问题，并在末尾给出“下一步”。
- 交叉引用用于承接上下游，不重复复制整段内容。
