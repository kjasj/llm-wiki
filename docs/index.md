# 大模型与 Agent 工程学习路线

这里放已经整理成学习材料的内容。

这条路线不是资料堆放，而是从模型底层一路走到 Agent 产品设计：

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

## 建议阅读顺序

1. 先读：[Transformer 入门](topics/transformer-beginner.md)
2. 再读：[LLM 推理与架构优化入门](topics/llm-inference-architecture.md)
3. 然后读：[LLM API：从 HTTP 到 Transformer](topics/openai-api-beginner.md)
4. 继续读：[模型训练与部署学习路线](topics/model-training-deployment-roadmap.md)
5. 选择实操方向：[原生 Python 训练循环入门](topics/python-training-loop.md)、[LoRA 与 QLoRA 微调入门](topics/lora-qlora-finetuning.md)、[本地部署框架对比](topics/local-deployment-frameworks.md)
6. 想理解显存为什么能降下来，读：[模型量化与推理压缩入门](topics/model-quantization-and-compression.md)
7. 需要买卡或上服务器时读：[模型部署硬件选型](topics/model-deployment-hardware-sizing.md)
8. 遇到参数再查：[参数调优手册](topics/parameter-tuning-handbook.md)
9. 开始做 Agent：[Agent 开发入门](topics/agent-development-beginner.md)
10. 选择模式：[Agent 模式与实现](topics/agent-patterns.md)
11. 设计可复用能力：[Agent Skills 实现思路](topics/agent-skills-implementation.md)
12. 做质量闭环：[Agent 效果评测框架](topics/agent-evaluation-framework.md)
13. 再读：[上下文工程入门](topics/context-engineering-beginner.md)
14. 继续读：[什么是上下文工程](topics/context-engineering.md)
15. 需要模板时查：[上下文工程提示词模板库](topics/context-engineering-prompt-templates.md)
16. 最后查：[开源 Agent 提示词目录](topics/open-source-agent-prompts.md)

建议先理解模型如何处理文本、推理为什么有成本，再理解 API 如何调用模型，然后进入训练、部署和 Agent 上下文工程。源码目录是进阶资料，不建议第一遍直接看。

## 你现在应该读哪篇

如果你不知道模型内部怎么处理文字，读 [Transformer 入门](topics/transformer-beginner.md)。

如果你已经知道 attention，但不知道为什么推理服务要谈 KV Cache、batching、MoE，读 [LLM 推理与架构优化入门](topics/llm-inference-architecture.md)。

如果你想知道一次 HTTP 请求如何变成模型输入，读 [LLM API：从 HTTP 到 Transformer](topics/openai-api-beginner.md)。

如果你想训练或部署自己的模型，先读 [模型训练与部署学习路线](topics/model-training-deployment-roadmap.md)，再选择训练或部署专题。看不懂 INT4、AWQ、GPTQ、GGUF 时，读 [模型量化与推理压缩入门](topics/model-quantization-and-compression.md)。需要判断 32B、70B、671B 要什么机器时，读 [模型部署硬件选型](topics/model-deployment-hardware-sizing.md)。

如果你要开发 Agent，读 [Agent 开发入门](topics/agent-development-beginner.md)，再读 [Agent 模式与实现](topics/agent-patterns.md) 和 [Agent Skills 实现思路](topics/agent-skills-implementation.md)，然后用 [Agent 效果评测框架](topics/agent-evaluation-framework.md) 建质量闭环。

如果你想做 Codex、Claude Code 这类 Agent 产品，读 [上下文工程入门](topics/context-engineering-beginner.md) 和 [什么是上下文工程](topics/context-engineering.md)。

## 机器学习基础

- [Transformer 入门](topics/transformer-beginner.md)
- [LLM 推理与架构优化入门](topics/llm-inference-architecture.md)

## API、训练与部署

- [LLM API：从 HTTP 到 Transformer](topics/openai-api-beginner.md)
- [模型训练与部署学习路线](topics/model-training-deployment-roadmap.md)
- [原生 Python 训练循环入门](topics/python-training-loop.md)
- [LoRA 与 QLoRA 微调入门](topics/lora-qlora-finetuning.md)
- [本地部署框架对比](topics/local-deployment-frameworks.md)
- [模型量化与推理压缩入门](topics/model-quantization-and-compression.md)
- [模型部署硬件选型](topics/model-deployment-hardware-sizing.md)
- [参数调优手册](topics/parameter-tuning-handbook.md)

## Agent 与上下文工程

- [Agent 开发入门](topics/agent-development-beginner.md)
- [Agent 模式与实现](topics/agent-patterns.md)
- [Agent Skills 实现思路](topics/agent-skills-implementation.md)
- [Agent 效果评测框架](topics/agent-evaluation-framework.md)
- [上下文工程入门](topics/context-engineering-beginner.md)
- [什么是上下文工程](topics/context-engineering.md)
- [上下文工程提示词模板库](topics/context-engineering-prompt-templates.md)
- [开源 Agent 提示词目录](topics/open-source-agent-prompts.md)
