# 核心概念索引

这篇是查词和分流用的。

如果你在文档里看到一个词，一时不知道它属于哪一层，先来这里定位；如果你已经知道自己要解决的问题，可以直接跳到对应专题。

## 怎么使用这篇索引

建议按三步看：

1. 先看“总览”，确认这个概念属于数据、模型、推理、应用、Agent 还是系统层。
2. 再查下面的表，读“一句话解释”，建立最小直觉。
3. 最后点“继续读”，进入真正展开的专题。

不要把这里当成完整教程。索引只负责快速定位，细节放在专题文档里。

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

## 分层地图

| 层级 | 关心的问题 | 常见产物 | 优先阅读 |
| --- | --- | --- | --- |
| 数据层 | 模型从什么文本里学习 | corpus、清洗规则、去重管线、PII 过滤 | [数据、Tokenizer 与预训练数据工程入门](data-tokenizer-pretraining-data.md) |
| 模型层 | 文本如何进入 Transformer 并生成 token | tokenizer、embedding、attention、logits | [Transformer 入门](transformer-beginner.md) |
| 训练层 | 如何改变模型参数和行为 | pretraining、SFT、DPO、RFT、LoRA | [后训练与对齐入门](post-training-alignment.md) |
| 推理层 | 如何更快、更省地生成 | KV Cache、batching、量化、speculative decoding | [LLM 推理与架构优化入门](llm-inference-architecture.md) |
| API 层 | 应用如何调用模型 | HTTP API、messages、tools、streaming、sampling | [LLM API：从 HTTP 到 Transformer](openai-api-beginner.md) |
| 应用层 | 如何把模型接进业务流程 | chatbot、RAG、tool calling、workflow | [LLM 应用架构](llm-application-architecture.md) |
| Agent 层 | 如何让模型围绕目标连续行动 | loop、state、memory、tools、evaluator | [Agent 开发入门](agent-development-beginner.md) |
| 系统层 | 如何做成可靠平台 | harness、guardrails、orchestrator、trace、multi-agent | [大型 Agent 系统架构设计](large-agent-system-architecture.md) |

## 先分清几组边界

### 模型能力 vs 产品能力

模型能力来自数据、训练、结构和推理预算；产品能力来自上下文、工具、权限、状态、评测和运行时。

所以同一个模型接进不同产品，效果会很不一样。要理解这个差异，读 [Harness Engineering](harness-engineering.md) 和 [上下文工程入门](context-engineering-beginner.md)。

### 训练 vs 推理 vs 部署

训练改变权重，推理使用权重生成结果，部署把推理变成可调用服务。

如果你只是想让模型知道最新知识，通常先考虑 RAG；如果你要改变稳定格式、风格或工具行为，再考虑 SFT / LoRA。相关文档是 [模型训练与部署学习路线](model-training-deployment-roadmap.md)。

### RAG vs 微调 vs 上下文工程

RAG 是把外部资料检索进来，微调是改变模型参数，上下文工程是决定模型这一轮看到什么。

三者可以组合，但解决的问题不同：

| 问题 | 优先方案 |
| --- | --- |
| 需要引用最新或私有资料 | RAG |
| 需要稳定输出格式或任务风格 | SFT / LoRA |
| 需要按任务、权限、状态动态组织输入 | 上下文工程 |

### Workflow vs Agent

Workflow 的下一步主要由程序决定；Agent 的下一步会让模型参与决策。

生产系统通常先做 workflow，再在需要开放探索、工具选择或复杂恢复的地方引入 Agent。相关文档是 [LLM 应用架构](llm-application-architecture.md) 和 [Loop Engineering](loop-engineering.md)。

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

## 按问题查

| 你现在的问题 | 先读 |
| --- | --- |
| “为什么模型输出这么慢？” | [LLM 推理与架构优化入门](llm-inference-architecture.md) |
| “temperature、top_p、max_tokens 怎么调？” | [参数调优手册](parameter-tuning-handbook.md) |
| “我应该 RAG 还是微调？” | [模型训练与部署学习路线](model-training-deployment-roadmap.md) |
| “LoRA、QLoRA 到底在训练什么？” | [LoRA 与 QLoRA 微调入门](lora-qlora-finetuning.md) |
| “本地跑模型选 llama.cpp、vLLM 还是 SGLang？” | [本地部署框架对比](local-deployment-frameworks.md) |
| “Agent 为什么会停不下来？” | [Loop Engineering](loop-engineering.md) |
| “工具调用和 Agent 有什么区别？” | [LLM 应用架构](llm-application-architecture.md) |
| “怎么评测 Agent 不是只看最终回答？” | [Agent 效果评测框架](agent-evaluation-framework.md) |
| “prompt 注入怎么防？” | [Agent 安全与 Guardrails](agent-security-guardrails.md) |
| “上下文工程到底和 prompt 工程差在哪？” | [什么是上下文工程](context-engineering.md) |

## 下一步

回到主线：

- [从 LLM 出生到大型 Agent 系统](llm-to-agent-system-overview.md)
- [LLM 应用架构](llm-application-architecture.md)
- [大型 Agent 系统架构设计](large-agent-system-architecture.md)
