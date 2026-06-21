# 核心概念索引

这篇是查词用的。

如果你在文档里看到一个词，一时不知道它属于哪一层，可以先来这里定位。

## 总览

```text
数据层：Corpus / Cleaning / Dedup / PII / Tokenizer Training
模型层：Tokenizer / Transformer / Attention / MoE
训练层：Pretraining / SFT / DPO / RFT / LoRA
推理能力层：Reasoning Models / Test-Time Compute / Reasoning Tokens
推理层：KV Cache / Prefix Cache / Batching / Quantization
API 层：HTTP API / Chat Template / Sampling / Streaming / Tool Choice
应用层：Chatbot / RAG / Tool Calling / Workflow
Agent 层：Loop / State / Memory / Skill / Evaluator
系统层：Harness / Guardrails / Orchestrator / Runtime / Trace / Multi-Agent
```

## 模型与训练

| 概念 | 一句话解释 | 继续读 |
| --- | --- | --- |
| Tokenizer | 把文本变成 token id | [LLM 生命周期](llm-lifecycle.md) |
| Token | 模型处理文本的最小片段 | [Transformer 入门](transformer-beginner.md) |
| Corpus | 用于训练或评测的一组文本数据 | [数据、Tokenizer 与预训练数据工程入门](data-tokenizer-pretraining-data.md) |
| Data Cleaning | 去掉乱码、模板、广告、低质量内容 | [数据、Tokenizer 与预训练数据工程入门](data-tokenizer-pretraining-data.md) |
| Dedup | 删除重复或近似重复内容 | [数据、Tokenizer 与预训练数据工程入门](data-tokenizer-pretraining-data.md) |
| PII Removal | 删除或脱敏个人身份信息 | [数据、Tokenizer 与预训练数据工程入门](data-tokenizer-pretraining-data.md) |
| Data Mixture | 控制网页、代码、书籍、数学等数据比例 | [数据、Tokenizer 与预训练数据工程入门](data-tokenizer-pretraining-data.md) |
| Tokenizer Training | 在代表性语料上训练 BPE / Unigram / WordPiece 词表 | [数据、Tokenizer 与预训练数据工程入门](data-tokenizer-pretraining-data.md) |
| Packing | 把 token 序列拼成固定长度训练 block | [数据、Tokenizer 与预训练数据工程入门](data-tokenizer-pretraining-data.md) |
| Embedding | 把 token id 变成向量 | [Transformer 入门](transformer-beginner.md) |
| Transformer | 当前 LLM 的主流模型结构 | [Transformer 入门](transformer-beginner.md) |
| Attention | 让 token 关注上下文中相关 token | [Transformer 入门](transformer-beginner.md) |
| MHA | 多头注意力 | [LLM 推理与架构优化入门](llm-inference-architecture.md) |
| MQA / GQA | 减少 K/V head，降低 KV Cache 成本 | [LLM 推理与架构优化入门](llm-inference-architecture.md) |
| MoE | 多专家模型，每 token 激活部分专家 | [LLM 推理与架构优化入门](llm-inference-architecture.md) |
| Pretraining | 用大量文本训练基础能力 | [LLM 生命周期](llm-lifecycle.md) |
| SFT | 用指令数据监督微调 | [后训练与对齐入门](post-training-alignment.md) |
| DPO / RLHF | 用偏好数据让回答更符合人类偏好 | [后训练与对齐入门](post-training-alignment.md) |
| RFT | 面向可验证任务做强化微调 | [后训练与对齐入门](post-training-alignment.md) |
| GRPO | 面向可验证任务的强化训练方法之一 | [后训练与对齐入门](post-training-alignment.md) |
| Reasoning Model | 推理阶段会投入额外计算来做复杂推理的模型 | [Reasoning Models 与 Test-Time Compute 入门](reasoning-models-test-time-compute.md) |
| Test-Time Compute | 不改权重，在推理时多花计算换质量 | [Reasoning Models 与 Test-Time Compute 入门](reasoning-models-test-time-compute.md) |
| Reasoning Effort / Thinking Budget | 控制模型这一轮内部推理预算 | [Reasoning Models 与 Test-Time Compute 入门](reasoning-models-test-time-compute.md) |
| Reasoning Tokens | 模型用于内部推理、摘要或状态保持的 token | [Reasoning Models 与 Test-Time Compute 入门](reasoning-models-test-time-compute.md) |
| LoRA | 只训练小型适配器 | [LoRA 与 QLoRA 微调入门](lora-qlora-finetuning.md) |
| QLoRA | 量化底座模型后再做 LoRA | [LoRA 与 QLoRA 微调入门](lora-qlora-finetuning.md) |

## 推理与部署

| 概念 | 一句话解释 | 继续读 |
| --- | --- | --- |
| Prefill | 一次性处理输入 prompt | [LLM 推理与架构优化入门](llm-inference-architecture.md) |
| Decode | 逐 token 生成输出 | [LLM 推理与架构优化入门](llm-inference-architecture.md) |
| Logits | 模型对下一个 token 的分数 | [Transformer 入门](transformer-beginner.md) |
| Sampling | 从 logits 中选择下一个 token | [LLM API：从 HTTP 到 Transformer](openai-api-beginner.md) |
| KV Cache | 缓存历史 token 的 K/V，避免重复计算 | [LLM 推理与架构优化入门](llm-inference-architecture.md) |
| Prefix Cache | 复用多个请求的相同前缀 | [LLM 推理与架构优化入门](llm-inference-architecture.md) |
| FlashAttention | 更高效计算 attention | [LLM 推理与架构优化入门](llm-inference-architecture.md) |
| PagedAttention | 更高效管理 KV Cache | [LLM 推理与架构优化入门](llm-inference-architecture.md) |
| Continuous Batching | 动态合并请求提高吞吐 | [LLM 推理与架构优化入门](llm-inference-architecture.md) |
| Max Model Length | 推理服务允许的最大上下文长度 | [参数调优手册](parameter-tuning-handbook.md) |
| Max Num Seqs | 推理调度中单轮最多处理的序列数 | [参数调优手册](parameter-tuning-handbook.md) |
| Max Num Batched Tokens | 推理调度中单轮最多处理的 token 数 | [参数调优手册](parameter-tuning-handbook.md) |
| Speculative Decoding | 小模型先猜，大模型验证 | [模型量化与推理压缩入门](model-quantization-and-compression.md) |
| Quantization | 用更低精度保存或计算模型 | [模型量化与推理压缩入门](model-quantization-and-compression.md) |
| GGUF | llama.cpp 常用模型格式 | [模型量化与推理压缩入门](model-quantization-and-compression.md) |
| AWQ / GPTQ | 常见权重量化方法 | [模型量化与推理压缩入门](model-quantization-and-compression.md) |
| Tensor Parallel | 把模型张量切到多张 GPU | [模型部署硬件选型](model-deployment-hardware-sizing.md) |
| Pipeline Parallel | 把模型层切到多张 GPU | [模型部署硬件选型](model-deployment-hardware-sizing.md) |
| Expert Parallel | MoE 专家并行 | [模型部署硬件选型](model-deployment-hardware-sizing.md) |

## API 与应用

| 概念 | 一句话解释 | 继续读 |
| --- | --- | --- |
| HTTP API | 应用调用模型的网络接口 | [LLM API：从 HTTP 到 Transformer](openai-api-beginner.md) |
| Responses API | 面向新式多模态和工具使用的响应接口 | [LLM API：从 HTTP 到 Transformer](openai-api-beginner.md) |
| Chat Completions | 经典 messages 风格聊天接口 | [LLM API：从 HTTP 到 Transformer](openai-api-beginner.md) |
| Chat Template | 把 messages 渲染成模型训练格式 | [LLM API：从 HTTP 到 Transformer](openai-api-beginner.md) |
| Streaming / SSE | 边生成边返回 | [LLM API：从 HTTP 到 Transformer](openai-api-beginner.md) |
| Temperature | 控制采样随机性 | [参数调优手册](parameter-tuning-handbook.md) |
| Top-p | 控制候选 token 范围 | [参数调优手册](parameter-tuning-handbook.md) |
| Max Output Tokens | 控制最多生成多少 token | [参数调优手册](parameter-tuning-handbook.md) |
| Stop | 指定生成停止序列 | [参数调优手册](parameter-tuning-handbook.md) |
| Tool Choice | 控制模型是否以及如何调用工具 | [参数调优手册](parameter-tuning-handbook.md) |
| Structured Output | 用 schema 约束模型输出结构 | [参数调优手册](parameter-tuning-handbook.md) |
| RAG | 检索资料后再生成回答 | [LLM 应用架构](llm-application-architecture.md) |
| Embedding | 用向量表示文本语义 | [LLM 应用架构](llm-application-architecture.md) |
| Reranker | 对检索结果重排 | [LLM 应用架构](llm-application-architecture.md) |
| Tool Calling | 模型请求应用执行工具 | [LLM 应用架构](llm-application-architecture.md) |
| Workflow | 程序定义的确定性流程 | [LLM 应用架构](llm-application-architecture.md) |

## Agent 与上下文

| 概念 | 一句话解释 | 继续读 |
| --- | --- | --- |
| Agent | 围绕目标循环调用模型和工具的系统 | [Agent 开发入门](agent-development-beginner.md) |
| Agent Loop | 思考、行动、观察、更新、继续或停止 | [Loop Engineering](loop-engineering.md) |
| Max Steps | 限制 Agent 最多行动轮数 | [参数调优手册](parameter-tuning-handbook.md) |
| Max Tool Calls | 限制 Agent 最多工具调用次数 | [参数调优手册](parameter-tuning-handbook.md) |
| State | 当前任务现场 | [Agent 开发入门](agent-development-beginner.md) |
| Memory | 跨任务保留的偏好、规则、经验 | [Multi-Agent 协作、自进化与记忆系统](multi-agent-collaboration-memory.md) |
| Skill | 可发现、可按需加载、可复用的能力包 | [Agent Skills 实现思路](agent-skills-implementation.md) |
| Context Engineering | 设计模型此刻应该看到什么 | [上下文工程入门](context-engineering-beginner.md) |
| Dynamic Prompt | 运行时根据状态注入的提示 | [什么是上下文工程](context-engineering.md) |
| Harness Engineering | 把模型包成可靠 Agent 产品的工程 | [Harness Engineering](harness-engineering.md) |
| Guardrails | 输入、上下文、工具、运行时、输出和记忆的安全检查 | [Agent 安全与 Guardrails](agent-security-guardrails.md) |
| Prompt Injection | 不可信内容试图覆盖系统或用户意图 | [Agent 安全与 Guardrails](agent-security-guardrails.md) |
| Policy Engine | 对工具调用做权限、风险、预算和审批判断 | [Agent 安全与 Guardrails](agent-security-guardrails.md) |
| Sandbox | 在执行层限制文件、网络、命令和资源 | [Agent 安全与 Guardrails](agent-security-guardrails.md) |
| Human Approval | 高风险动作执行前让用户结构化确认 | [Agent 安全与 Guardrails](agent-security-guardrails.md) |
| Loop Engineering | Agent 循环、停止、恢复和预算控制 | [Loop Engineering](loop-engineering.md) |
| Evaluator | 判断结果或过程是否合格 | [Agent 效果评测框架](agent-evaluation-framework.md) |
| Trace | Agent 执行过程记录 | [Agent 效果评测框架](agent-evaluation-framework.md) |

## Multi-Agent 与大型系统

| 概念 | 一句话解释 | 继续读 |
| --- | --- | --- |
| Router | 把请求分给合适 Agent 或流程 | [Agent 模式与实现](agent-patterns.md) |
| Handoff | 一个 Agent 把任务转交给另一个 Agent | [Agent 模式与实现](agent-patterns.md) |
| Supervisor | 管理多个 Worker Agent | [Multi-Agent 协作、自进化与记忆系统](multi-agent-collaboration-memory.md) |
| Worker Agent | 执行特定任务的专家 Agent | [Multi-Agent 协作、自进化与记忆系统](multi-agent-collaboration-memory.md) |
| Blackboard | 多 Agent 共享工作区 | [Multi-Agent 协作、自进化与记忆系统](multi-agent-collaboration-memory.md) |
| A2A | Agent 和 Agent 之间通信协作 | [Multi-Agent 协作、自进化与记忆系统](multi-agent-collaboration-memory.md) |
| MCP | Agent 连接外部工具、数据和资源的协议 | [大型 Agent 系统架构设计](large-agent-system-architecture.md) |
| Orchestrator | 调度任务、Agent、工具和状态机 | [大型 Agent 系统架构设计](large-agent-system-architecture.md) |
| Tool Runtime | 执行工具并做权限和沙箱控制 | [大型 Agent 系统架构设计](large-agent-system-architecture.md) |
| Memory Service | 平台化管理长期记忆 | [大型 Agent 系统架构设计](large-agent-system-architecture.md) |
| Evolution Pipeline | 从 trace 到 eval 到灰度发布的改进流水线 | [大型 Agent 系统架构设计](large-agent-system-architecture.md) |

## 常见混淆

| 容易混的词 | 区别 |
| --- | --- |
| Prompt Engineering vs Context Engineering | 前者偏写提示词，后者偏组织模型看到的完整信息 |
| RAG vs Fine-tuning | RAG 给模型外部资料，微调改变模型行为或参数 |
| Tool Calling vs Agent | 工具调用是一种动作能力，Agent 是带 loop 和状态的系统 |
| Workflow vs Agent | Workflow 控制流由程序定义，Agent 让模型参与下一步决策 |
| Memory vs KV Cache | Memory 是产品保存的长期信息，KV Cache 是推理计算缓存 |
| MCP vs A2A | MCP 连接工具和数据，A2A 连接 Agent 和 Agent |
| Harness vs Loop | Harness 是 Agent 运行壳，Loop 是其中的行动循环 |

## 下一步

回到主线：

- [从 LLM 出生到大型 Agent 系统](llm-to-agent-system-overview.md)
- [LLM 应用架构](llm-application-architecture.md)
- [大型 Agent 系统架构设计](large-agent-system-architecture.md)
