# 大模型与 Agent 工程学习路线

这里放已经整理成学习材料的内容。

这条路线不是资料堆放，而是从模型底层一路走到 Agent 产品设计：

```text
全局地图
  ↓
LLM 生命周期
  ↓
数据、Tokenizer 与预训练数据工程
  ↓
后训练与对齐
  ↓
Reasoning Models / Test-Time Compute
  ↓
Transformer
  ↓
LLM 推理优化
  ↓
LLM API：HTTP 请求如何变成 Transformer 输入
  ↓
LLM 应用架构：Chatbot / RAG / 工具调用 / Workflow / Agent
  ↓
模型训练、微调和部署
  ↓
Agent 开发与评测
  ↓
Harness Engineering / Agent 安全与 Guardrails / Loop Engineering
  ↓
Agent 上下文工程
  ↓
Multi-Agent 与大型 Agent 系统
  ↓
开源 Agent 提示词目录
```

## 建议阅读顺序

0. 遇到术语先查：[核心概念索引](topics/concept-index.md)
1. 先读：[从 LLM 出生到大型 Agent 系统](topics/llm-to-agent-system-overview.md)
2. 再读：[LLM 生命周期：从数据到线上模型](topics/llm-lifecycle.md)
3. 展开数据地基：[数据、Tokenizer 与预训练数据工程入门](topics/data-tokenizer-pretraining-data.md)
4. 继续读：[后训练与对齐入门：SFT、DPO、RLHF、RFT](topics/post-training-alignment.md)
5. 继续读：[Reasoning Models 与 Test-Time Compute 入门](topics/reasoning-models-test-time-compute.md)
6. 继续读：[Transformer 入门](topics/transformer-beginner.md)
7. 继续读：[LLM 推理与架构优化入门](topics/llm-inference-architecture.md)
8. 然后读：[LLM API：从 HTTP 到 Transformer](topics/openai-api-beginner.md)
9. 接着读：[LLM 应用架构：Chatbot、RAG、工具调用、工作流与 Agent](topics/llm-application-architecture.md)
10. 继续读：[模型训练与部署学习路线](topics/model-training-deployment-roadmap.md)
11. 选择实操方向：[原生 Python 训练循环入门](topics/python-training-loop.md)、[LoRA 与 QLoRA 微调入门](topics/lora-qlora-finetuning.md)、[本地部署框架对比](topics/local-deployment-frameworks.md)
12. 想理解显存为什么能降下来，读：[模型量化与推理压缩入门](topics/model-quantization-and-compression.md)
13. 需要买卡或上服务器时读：[模型部署硬件选型](topics/model-deployment-hardware-sizing.md)
14. 遇到参数再查：[参数调优手册](topics/parameter-tuning-handbook.md)
15. 开始做 Agent：[Agent 开发入门](topics/agent-development-beginner.md)
16. 选择模式：[Agent 模式与实现](topics/agent-patterns.md)
17. 读 Agent 产品化工程：[Harness Engineering](topics/harness-engineering.md)
18. 补上安全边界：[Agent 安全与 Guardrails](topics/agent-security-guardrails.md)
19. 读 Agent 循环控制：[Loop Engineering](topics/loop-engineering.md)
20. 进入多 Agent 架构：[Multi-Agent 协作、自进化与记忆系统](topics/multi-agent-collaboration-memory.md)
21. 继续看平台级设计：[大型 Agent 系统架构设计](topics/large-agent-system-architecture.md)
22. 设计可复用能力：[Agent Skills 实现思路](topics/agent-skills-implementation.md)
23. 做质量闭环：[Agent 效果评测框架](topics/agent-evaluation-framework.md)
24. 再读：[上下文工程入门](topics/context-engineering-beginner.md)
25. 继续读：[什么是上下文工程](topics/context-engineering.md)
26. 需要模板时查：[上下文工程提示词模板库](topics/context-engineering-prompt-templates.md)
27. 最后查：[开源 Agent 提示词目录](topics/open-source-agent-prompts.md)

建议先理解模型如何处理文本、推理为什么有成本，再理解 API 如何调用模型，然后进入训练、部署和 Agent 上下文工程。源码目录是进阶资料，不建议第一遍直接看。

## 你现在应该读哪篇

如果你遇到陌生词，先查 [核心概念索引](topics/concept-index.md)。如果你不知道整套文档怎么串起来，先读 [从 LLM 出生到大型 Agent 系统](topics/llm-to-agent-system-overview.md)。

如果你想理解 LLM 怎么从数据变成线上模型，读 [LLM 生命周期：从数据到线上模型](topics/llm-lifecycle.md)。

如果你想理解原始网页、代码、论文如何变成 token 序列和预训练样本，读 [数据、Tokenizer 与预训练数据工程入门](topics/data-tokenizer-pretraining-data.md)。

如果你想理解 base model 为什么会变成 chat model、tool-use model 或 reasoning model，读 [后训练与对齐入门：SFT、DPO、RLHF、RFT](topics/post-training-alignment.md)。

如果你想理解 reasoning effort、thinking budget、reasoning tokens 和 Agent loop 成本，读 [Reasoning Models 与 Test-Time Compute 入门](topics/reasoning-models-test-time-compute.md)。

如果你不知道模型内部怎么处理文字，读 [Transformer 入门](topics/transformer-beginner.md)。

如果你已经知道 attention，但不知道为什么推理服务要谈 KV Cache、batching、MoE，读 [LLM 推理与架构优化入门](topics/llm-inference-architecture.md)。

如果你想知道一次 HTTP 请求如何变成模型输入，读 [LLM API：从 HTTP 到 Transformer](topics/openai-api-beginner.md)。

如果你想知道有了 API 后应用怎么搭，读 [LLM 应用架构：Chatbot、RAG、工具调用、工作流与 Agent](topics/llm-application-architecture.md)。

如果你想训练或部署自己的模型，先读 [模型训练与部署学习路线](topics/model-training-deployment-roadmap.md)，再选择训练或部署专题。看不懂 INT4、AWQ、GPTQ、GGUF 时，读 [模型量化与推理压缩入门](topics/model-quantization-and-compression.md)。需要判断 32B、70B、671B 要什么机器时，读 [模型部署硬件选型](topics/model-deployment-hardware-sizing.md)。

如果你要开发 Agent，读 [Agent 开发入门](topics/agent-development-beginner.md)，再读 [Agent 模式与实现](topics/agent-patterns.md)。想理解同一个模型为什么放进不同 Agent 产品效果不同，读 [Harness Engineering](topics/harness-engineering.md)。只要 Agent 能调用工具、读文件、联网或写数据，就要读 [Agent 安全与 Guardrails](topics/agent-security-guardrails.md)。想解决循环、重试、停止和恢复，读 [Loop Engineering](topics/loop-engineering.md)。如果要做多 Agent、A2A、自进化和记忆系统，读 [Multi-Agent 协作、自进化与记忆系统](topics/multi-agent-collaboration-memory.md)。如果要做平台级架构，读 [大型 Agent 系统架构设计](topics/large-agent-system-architecture.md)。

如果你想做 Codex、Claude Code 这类 Agent 产品，读 [上下文工程入门](topics/context-engineering-beginner.md) 和 [什么是上下文工程](topics/context-engineering.md)。

## 机器学习基础

- [核心概念索引](topics/concept-index.md)
- [从 LLM 出生到大型 Agent 系统](topics/llm-to-agent-system-overview.md)
- [LLM 生命周期：从数据到线上模型](topics/llm-lifecycle.md)
- [数据、Tokenizer 与预训练数据工程入门](topics/data-tokenizer-pretraining-data.md)
- [后训练与对齐入门：SFT、DPO、RLHF、RFT](topics/post-training-alignment.md)
- [Reasoning Models 与 Test-Time Compute 入门](topics/reasoning-models-test-time-compute.md)
- [Transformer 入门](topics/transformer-beginner.md)
- [LLM 推理与架构优化入门](topics/llm-inference-architecture.md)

## API、训练与部署

- [LLM API：从 HTTP 到 Transformer](topics/openai-api-beginner.md)
- [LLM 应用架构：Chatbot、RAG、工具调用、工作流与 Agent](topics/llm-application-architecture.md)
- [模型训练与部署学习路线](topics/model-training-deployment-roadmap.md)
- [原生 Python 训练循环入门](topics/python-training-loop.md)
- [后训练与对齐入门：SFT、DPO、RLHF、RFT](topics/post-training-alignment.md)
- [LoRA 与 QLoRA 微调入门](topics/lora-qlora-finetuning.md)
- [本地部署框架对比](topics/local-deployment-frameworks.md)
- [模型量化与推理压缩入门](topics/model-quantization-and-compression.md)
- [模型部署硬件选型](topics/model-deployment-hardware-sizing.md)
- [参数调优手册](topics/parameter-tuning-handbook.md)

## Agent 与上下文工程

- [Agent 开发入门](topics/agent-development-beginner.md)
- [Agent 模式与实现](topics/agent-patterns.md)
- [Harness Engineering](topics/harness-engineering.md)
- [Agent 安全与 Guardrails](topics/agent-security-guardrails.md)
- [Loop Engineering](topics/loop-engineering.md)
- [Multi-Agent 协作、自进化与记忆系统](topics/multi-agent-collaboration-memory.md)
- [大型 Agent 系统架构设计](topics/large-agent-system-architecture.md)
- [Agent Skills 实现思路](topics/agent-skills-implementation.md)
- [Agent 效果评测框架](topics/agent-evaluation-framework.md)
- [上下文工程入门](topics/context-engineering-beginner.md)
- [什么是上下文工程](topics/context-engineering.md)
- [上下文工程提示词模板库](topics/context-engineering-prompt-templates.md)
- [开源 Agent 提示词目录](topics/open-source-agent-prompts.md)
