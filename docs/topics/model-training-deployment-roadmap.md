# 模型训练与部署学习路线

这篇先画地图。

你提到的内容很多：

- 模型训练。
- 模型部署。
- 原生 Python 代码实现。
- 框架实现。
- Unsloth。
- LLaMA-Factory。
- llama.cpp。
- vLLM。
- SGLang。
- 各种参数调优。

这些不是一堆散点，而是一条工程链路：

```text
API 调用
  ↓
理解模型输入输出
  ↓
准备数据
  ↓
训练或微调
  ↓
评估
  ↓
导出和量化
  ↓
部署推理服务
  ↓
线上参数调优
```

如果你现在关心的是量化、买什么卡、多少显存、32B/671B 怎么部署，先读：[模型量化与推理压缩入门](model-quantization-and-compression.md) 和 [模型部署硬件选型](model-deployment-hardware-sizing.md)。

## 先分清几件事

### 训练

训练是在改模型参数。

例子：

```text
给模型一批问答数据，让它更擅长客服回复。
```

训练会改变模型本身。

### 推理

推理是在使用模型。

例子：

```text
用户问一个问题，模型生成回答。
```

推理通常不改变模型参数。

### 微调

微调是在已有模型基础上继续训练。

常见目标：

- 学会某种输出格式。
- 适应某个领域语料。
- 学会某类任务风格。
- 提升特定业务场景表现。

### 部署

部署是把模型变成可访问的服务。

例子：

```text
启动一个 HTTP 服务，应用通过 OpenAI-compatible API 调用本地模型。
```

## 原生 Python 代码实现学什么

原生 Python 不是为了替代成熟框架。

它的价值是：

> 让你知道训练循环内部到底发生了什么。

最小训练循环大概是：

```python
for batch in dataloader:
    outputs = model(**batch)
    loss = outputs.loss
    loss.backward()
    optimizer.step()
    optimizer.zero_grad()
```

这几行背后对应：

```text
取数据
  ↓
前向计算
  ↓
计算 loss
  ↓
反向传播
  ↓
更新参数
  ↓
清空梯度
```

第一遍不需要从零写出 GPT。

建议原生 Python 先实现这些小目标：

1. 用 tokenizer 把文本变成 token id。
2. 用 PyTorch 做一个小的语言模型。
3. 写一个训练循环。
4. 看懂 loss 为什么下降。
5. 写一个简单 generate 函数。
6. 再理解 LoRA 为什么只训练一小部分参数。

## 训练方法地图

常见训练方式可以这样看：

| 方法 | 改什么 | 适合什么场景 |
| --- | --- | --- |
| Pretraining | 从大量文本学基础能力 | 从头训练基础模型，成本极高 |
| Continued Pretraining | 在领域语料上继续预训练 | 医疗、法律、代码等领域适配 |
| SFT | 用指令数据监督微调 | 问答、客服、工具调用格式 |
| LoRA | 只训练低秩适配器 | 低成本微调 |
| QLoRA | 量化底座 + LoRA | 显存更紧张时微调 |
| DPO | 用偏好数据对齐 | 让模型更偏好某类回答 |
| PPO / RLHF | 强化学习对齐 | 更复杂的人类偏好优化 |
| RFT | 面向可验证任务强化微调 | 数学、代码、结构化任务 |

第一阶段建议重点学：

```text
SFT + LoRA + QLoRA
```

不要一上来就扎进 RLHF。

## 训练参数怎么理解

训练参数很多，但可以分组。

### 数据参数

| 参数 | 直觉 |
| --- | --- |
| `dataset` | 用哪批数据训练 |
| `max_seq_length` | 每条样本最多多少 token |
| `packing` | 是否把多条短样本拼成一条，提高利用率 |
| `train/validation split` | 训练集和验证集怎么切 |

例子：

```text
max_seq_length 太短：长答案被截断。
max_seq_length 太长：显存压力变大。
```

### 优化参数

| 参数 | 直觉 |
| --- | --- |
| `learning_rate` | 每次更新参数的步子多大 |
| `batch_size` | 每步看多少样本 |
| `gradient_accumulation_steps` | 累积多步梯度再更新，模拟更大 batch |
| `epochs` | 数据被完整看几轮 |
| `warmup_steps` | 训练初期慢慢升学习率 |
| `weight_decay` | 防止参数过度放飞 |
| `lr_scheduler` | 学习率怎么变化 |

一个常见问题：

```text
learning_rate 太大：loss 震荡甚至爆炸。
learning_rate 太小：训练很慢，效果上不去。
```

### LoRA 参数

| 参数 | 直觉 |
| --- | --- |
| `r` | LoRA 适配器的容量 |
| `lora_alpha` | LoRA 更新强度 |
| `lora_dropout` | 防止过拟合 |
| `target_modules` | LoRA 加到哪些层上 |

例子：

```text
r 太小：模型学不进去。
r 太大：更占显存，也更可能过拟合。
```

### 精度和显存参数

| 参数 | 直觉 |
| --- | --- |
| `fp16` / `bf16` | 用低精度加速训练 |
| `load_in_4bit` | 4bit 加载底座模型 |
| `gradient_checkpointing` | 用计算换显存 |
| `flash_attention` | 更高效地算 attention |

这些参数会影响：

- 显存占用。
- 速度。
- 稳定性。
- 可训练模型大小。

## 框架怎么选

### Unsloth

Unsloth 更适合：

- 快速做 LoRA / QLoRA 微调。
- 单机 GPU 资源有限。
- 想先跑通训练流程。
- 想少写底层训练代码。

它的核心价值是：

```text
把常见开源模型微调做得更省显存、更快、更容易上手。
```

学习时可以用它先跑通：

```text
准备数据 -> LoRA 微调 -> 保存 adapter -> 合并或导出
```

### LLaMA-Factory

LLaMA-Factory 更像一个统一训练平台。

适合：

- 想用配置文件管理训练。
- 想支持很多模型和数据集。
- 想比较 SFT、LoRA、DPO 等多种训练方式。
- 想用 Web UI 或命令行快速实验。

它的核心价值是：

```text
把大量微调方法和模型适配封装成统一工作流。
```

如果你要做系统化实验，LLaMA-Factory 很适合作为框架入口。

### 原生 Python、Unsloth、LLaMA-Factory 的关系

| 方式 | 学习价值 | 工程价值 |
| --- | --- | --- |
| 原生 Python | 理解训练本质 | 适合小实验和教学 |
| Unsloth | 快速掌握 LoRA 微调 | 适合省显存快速训练 |
| LLaMA-Factory | 理解完整训练流程 | 适合多模型、多方法实验 |

建议顺序：

```text
原生 Python 看懂训练循环
  ↓
Unsloth 跑通一次 LoRA
  ↓
LLaMA-Factory 做系统化实验
```

## 部署框架地图

训练完模型后，还要部署。

常见框架可以这样分：

| 框架 | 更适合什么 | 关键词 |
| --- | --- | --- |
| llama.cpp | 本地、CPU、Apple Silicon、GGUF、轻量部署 | 低门槛、本地运行 |
| llama-cpp-python | Python 调用 llama.cpp | Python binding、OpenAI-compatible server |
| vLLM | GPU 高吞吐服务 | PagedAttention、continuous batching、OpenAI-compatible |
| SGLang | Agent/RAG/结构化生成、高性能服务 | RadixAttention、prefix cache、structured generation |

## llama.cpp

llama.cpp 适合先体验本地模型。

它的特点：

- C/C++ 实现。
- 部署门槛低。
- 支持多种硬件后端。
- 常配合 GGUF 量化模型使用。
- 可以启动 HTTP server。

它适合：

```text
我想在自己电脑上跑一个本地模型。
```

不适合第一目标就是：

```text
高并发、多 GPU、大规模线上服务。
```

## vLLM

vLLM 更适合 GPU 服务化部署。

它的关键词：

- OpenAI-compatible API server。
- PagedAttention。
- continuous batching。
- 高吞吐。
- 支持 LoRA 服务。

它适合：

```text
我要把一个开源模型部署成服务，供应用调用。
```

典型启动方式类似：

```bash
vllm serve Qwen/Qwen2.5-7B-Instruct
```

然后应用可以像调用 OpenAI API 一样调用它。

## SGLang

SGLang 也用于高性能推理服务。

它尤其适合：

- 多轮生成。
- Agent 工作流。
- RAG。
- 结构化输出。
- 有共享前缀和复杂控制流的场景。

它的关键词：

- OpenAI-compatible API。
- RadixAttention。
- KV cache 复用。
- continuous batching。
- 结构化生成。

如果一个 Agent 工作流里有很多相似前缀、工具调用、分支生成，SGLang 的思路会很值得学。

## 部署参数怎么理解

部署参数也很多，但仍然可以分组。

### 模型加载参数

| 参数 | 直觉 |
| --- | --- |
| `model` | 加载哪个模型 |
| `dtype` | 权重和计算精度 |
| `quantization` | 是否使用量化 |
| `max_model_len` | 最大上下文长度 |
| `tensor_parallel_size` | 多 GPU 切模型 |

### 服务并发参数

| 参数 | 直觉 |
| --- | --- |
| `max_num_seqs` | 同时处理多少序列 |
| `max_num_batched_tokens` | 一个 batch 里最多多少 token |
| `gpu_memory_utilization` | 允许占用多少 GPU 显存 |
| `enable_prefix_caching` | 是否启用前缀缓存 |

### 生成采样参数

这些和 API 调用里看到的一样：

| 参数 | 直觉 |
| --- | --- |
| `temperature` | 随机性 |
| `top_p` | 候选 token 范围 |
| `top_k` | 只看概率最高的 k 个 token |
| `max_tokens` | 最多生成多少 token |
| `repetition_penalty` | 降低重复 |
| `stop` | 生成到哪些字符串就停止 |

注意：

```text
训练参数调的是模型学习过程。
部署参数调的是服务性能和资源。
采样参数调的是输出风格。
```

这三类不要混在一起。

## 一条推荐学习路线

### 第一阶段：会调用

目标：

```text
会用 API 和模型对话。
```

学习内容：

- Responses API。
- Chat Completions API。
- `temperature`、`top_p`、`max_output_tokens`。
- streaming。
- tools。
- structured output。

对应文档：

- [LLM API：从 HTTP 到 Transformer](openai-api-beginner.md)
- [参数调优手册](parameter-tuning-handbook.md)

### 第二阶段：懂训练

目标：

```text
知道模型参数是怎么被训练改变的。
```

学习内容：

- tokenizer。
- dataset。
- loss。
- optimizer。
- training loop。
- evaluation。

对应文档：

- [原生 Python 训练循环入门](python-training-loop.md)

### 第三阶段：会微调

目标：

```text
能用自己的数据微调一个开源模型。
```

学习内容：

- SFT。
- LoRA。
- QLoRA。
- Unsloth。
- LLaMA-Factory。
- 训练参数调优。

对应文档：

- [LoRA 与 QLoRA 微调入门](lora-qlora-finetuning.md)
- [参数调优手册](parameter-tuning-handbook.md)

### 第四阶段：会部署

目标：

```text
能把模型变成服务。
```

学习内容：

- GGUF。
- 量化。
- llama.cpp。
- vLLM。
- SGLang。
- OpenAI-compatible API。
- streaming。
- 并发和显存。

对应文档：

- [本地部署框架对比](local-deployment-frameworks.md)
- [LLM 推理与架构优化入门](llm-inference-architecture.md)

### 第五阶段：会优化

目标：

```text
知道慢在哪里、贵在哪里、怎么调。
```

学习内容：

- KV Cache。
- Prefix Cache。
- PagedAttention。
- continuous batching。
- speculative decoding。
- quantization。
- eval。
- 压测。

对应文档：

- [参数调优手册](parameter-tuning-handbook.md)
- [本地部署框架对比](local-deployment-frameworks.md)

## 一个端到端例子

假设你想做一个“公司内部客服模型”。

### 方案 A：不训练，只做 RAG

流程：

```text
整理文档
  ↓
切片入库
  ↓
用户提问
  ↓
检索相关文档
  ↓
把文档片段放进 prompt
  ↓
模型回答
```

优点：

- 上手快。
- 知识更新方便。
- 不需要改模型参数。

缺点：

- 对检索质量敏感。
- prompt 可能变长。
- 回答风格不一定稳定。

### 方案 B：SFT / LoRA 微调

流程：

```text
收集高质量问答
  ↓
整理成 instruction 数据
  ↓
用 Unsloth 或 LLaMA-Factory 做 LoRA 微调
  ↓
评估
  ↓
导出 adapter 或合并模型
  ↓
用 vLLM / SGLang / llama.cpp 部署
```

优点：

- 风格更稳定。
- 特定任务更顺手。
- 可以减少 prompt 里反复写规则。

缺点：

- 数据质量要求高。
- 需要评估。
- 更新知识没有 RAG 灵活。

### 方案 C：RAG + 微调

很多真实系统会两者结合：

```text
微调负责格式和行为习惯
RAG 负责最新知识和具体资料
```

## 常见误区

### 误区 1：想让模型知道新知识，就一定要微调

不一定。

如果知识经常变化，RAG 往往更合适。

微调更适合改变行为、格式、风格和稳定任务模式。

### 误区 2：训练 loss 降了，就代表线上效果好

不一定。

loss 只是训练指标。

线上还要看：

- 答案准确性。
- 格式稳定性。
- 幻觉率。
- 拒答是否合理。
- 延迟和成本。

### 误区 3：部署框架越强越适合自己

不一定。

本地小模型用 llama.cpp 可能最舒服。

GPU 服务化用 vLLM 可能更直接。

复杂 Agent 推理链路可以再研究 SGLang。

### 误区 4：参数越多越高级

不是。

参数调优的目标不是“都调一遍”，而是知道问题属于哪一类：

```text
效果问题：看数据、prompt、训练方法、eval
速度问题：看 batch、cache、量化、框架
显存问题：看量化、上下文长度、KV cache、并发
输出风格问题：看 temperature、top_p、prompt、SFT
```

## 已建立的实操专题

这篇是地图。具体实践可以继续读：

- [原生 Python 训练循环入门](python-training-loop.md)
- [LoRA 与 QLoRA 微调入门](lora-qlora-finetuning.md)
- [本地部署框架对比](local-deployment-frameworks.md)
- [参数调优手册](parameter-tuning-handbook.md)

## 参考资料

- [Unsloth Docs](https://unsloth.ai/docs)
- [LLaMA-Factory GitHub](https://github.com/hiyouga/LLaMA-Factory)
- [llama.cpp GitHub](https://github.com/ggml-org/llama.cpp)
- [vLLM Docs](https://docs.vllm.ai/)
- [SGLang Docs](https://docs.sglang.io/)
