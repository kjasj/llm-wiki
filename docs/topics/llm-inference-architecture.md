# LLM 推理与架构优化入门

这篇用新手能读下去的方式，解释几个经常一起出现的词：

- KV Cache
- Prefix Cache
- MHA / MQA / GQA
- MoE
- FlashAttention
- PagedAttention
- Speculative Decoding
- Quantization
- Batching

先记住一句话：

> 大模型优化的核心，不是让模型“少理解”，而是尽量少做重复计算、少搬数据、少占显存。

## 先从一次生成说起

假设你问模型：

```text
请解释 Transformer。
```

模型不是一次吐出完整答案。

它通常是一个 token 一个 token 地生成：

```text
第 1 步：生成 “Transformer”
第 2 步：生成 “是”
第 3 步：生成 “一种”
第 4 步：生成 “神经”
...
```

每生成一个新 token，模型都要看前面的上下文。

如果完全不优化，生成第 100 个 token 时，模型可能又把前 99 个 token 全部重新算一遍。

这会很浪费。

于是就有了各种 cache 和推理优化。

## 一次请求的生命周期

一个线上 LLM 请求大致会经过：

```text
HTTP 请求
  ↓
排队和 batching
  ↓
prompt / chat template 渲染
  ↓
tokenizer
  ↓
prefill：一次性读完整个输入
  ↓
建立 KV Cache
  ↓
decode：逐 token 生成
  ↓
sampler：temperature / top_p 生效
  ↓
HTTP JSON 或 stream 返回
```

这些优化发生的位置不同：

| 优化 | 主要发生位置 | 解决什么 |
| --- | --- | --- |
| Prefix Cache | prefill 前后 | 相同前缀少重复算 |
| KV Cache | prefill 后、decode 时 | 历史 K/V 不重复算 |
| Batching | 请求调度层 | 提高 GPU 利用率 |
| PagedAttention | KV Cache 管理层 | 降低显存碎片和浪费 |
| FlashAttention | attention 计算层 | 减少显存读写 |
| Speculative Decoding | decode 阶段 | 降低逐 token 等待 |

## 两条主线

这些概念可以分成两条主线。

第一条是模型结构：

```text
MHA / MQA / GQA / MoE
```

它们更像是在回答：

> 模型内部怎么设计，才能在能力和成本之间取平衡？

第二条是推理系统：

```text
KV Cache / Prefix Cache / FlashAttention / PagedAttention / Batching / Speculative Decoding / Quantization
```

它们更像是在回答：

> 模型已经训练好了，线上怎么让它跑得更快、更便宜、更稳定？

## 部署常用指标

看推理服务时，不要只说“快”或“慢”。

常见指标有：

| 指标 | 含义 | 主要受什么影响 |
| --- | --- | --- |
| TTFT | time to first token，首 token 延迟 | 输入长度、prefill、排队、prefix cache |
| TPOT | time per output token，每个输出 token 耗时 | decode、KV Cache、batch、模型大小 |
| Latency | 总延迟 | 输入长度、输出长度、排队、采样 |
| Throughput | 吞吐，单位时间处理多少 token 或请求 | batching、GPU 利用率、模型结构 |
| Concurrency | 并发能力 | 显存、KV Cache、调度策略 |

比如用户说“首字很慢”，优先看 TTFT 和 prefill。

用户说“已经开始输出了但很慢”，优先看 TPOT 和 decode。

## KV Cache

KV Cache 是大模型推理里最重要的优化之一。

先回忆 Attention 里的 Q、K、V：

```text
Q：当前 token 想找什么？
K：历史 token 能提供什么线索？
V：历史 token 能贡献什么内容？
```

生成文本时，新 token 会不断出现。

例子：

```text
输入：小明喜欢
生成：吃
再生成：苹果
```

当模型生成“苹果”时，前面的 token 已经有：

```text
小明 喜欢 吃
```

这些历史 token 的 K 和 V 其实已经算过了。

如果每一步都重新计算它们，就会浪费。

KV Cache 的做法是：

> 把历史 token 的 K 和 V 存起来，下次生成新 token 时直接复用。

可以理解成：

```text
第 1 步：算出 “小明” 的 K/V，存起来
第 2 步：算出 “喜欢” 的 K/V，存起来
第 3 步：算出 “吃” 的 K/V，存起来
第 4 步：生成 “苹果” 时，直接读取前面存好的 K/V
```

### KV Cache 解决什么问题

它主要解决：

- 重复计算太多。
- 生成越长越慢。
- 每个新 token 都要重新处理历史上下文。

有了 KV Cache 后，模型生成下一个 token 时，不需要把所有历史 token 的 K/V 再算一遍。

### KV Cache 的代价

KV Cache 会占显存。

上下文越长，缓存越大。

用户越多，缓存越多。

所以线上服务经常不是算力先不够，而是显存先紧张。

可以这样理解：

```text
KV Cache 用显存换速度。
```

## Prefix Cache

Prefix Cache 可以看成 KV Cache 的进一步复用。

KV Cache 通常复用同一次对话里的历史 token。

Prefix Cache 复用的是：

> 多个请求中相同开头部分的计算结果。

例子：

很多 Agent 请求都会带相同的系统提示词：

```text
你是一个代码助手。
你需要遵守工具调用规范。
你需要先阅读项目文件。
...
用户问题：请修改登录逻辑。
```

另一个请求可能是：

```text
你是一个代码助手。
你需要遵守工具调用规范。
你需要先阅读项目文件。
...
用户问题：请解释这个报错。
```

前面这一大段是一样的。

如果每个请求都重新计算这段系统提示词，就很浪费。

Prefix Cache 的做法是：

> 相同前缀只算一次，后续请求命中这个前缀时直接复用缓存。

### Prefix Cache 和上下文工程的关系

Agent 产品里经常有稳定前缀：

- system prompt
- developer prompt
- 工具说明
- 安全规则
- 输出格式要求
- 项目规范

如果这些内容每次顺序都变、文本都变，就很难命中 Prefix Cache。

所以从产品设计角度看：

> 稳定、分层、少改动的 prompt 结构，更容易利用 Prefix Cache。

例子：

不利于 Prefix Cache：

```text
每次动态拼一个大 prompt，工具说明顺序随机，系统规则也夹在中间。
```

更利于 Prefix Cache：

```text
固定系统规则
固定工具说明
固定项目规范
动态用户问题
动态检索结果
```

这也是上下文工程的一部分。

## MHA

MHA 是 Multi-Head Attention，多头注意力。

在入门篇里我们说过：

> 一个 head 像一个观察角度，多个 head 可以同时看不同关系。

例子：

```text
小明把苹果放进书包，因为它很甜。
```

不同 head 可能分别关注：

- 主语是谁。
- 动作是什么。
- “它”指代谁。
- “甜”修饰哪个名词。

MHA 的好处是表达能力强。

但它也有代价：

> 每个 attention head 都有自己的 K/V，推理时 KV Cache 会变大。

这就是为什么后来出现了 MQA 和 GQA。

## MQA

MQA 是 Multi-Query Attention。

它的思路是：

> Q 还是多个头，但多个头共享同一份 K/V。

对比一下。

MHA：

```text
Head 1：Q1 K1 V1
Head 2：Q2 K2 V2
Head 3：Q3 K3 V3
Head 4：Q4 K4 V4
```

MQA：

```text
Head 1：Q1 共享K 共享V
Head 2：Q2 共享K 共享V
Head 3：Q3 共享K 共享V
Head 4：Q4 共享K 共享V
```

这样 KV Cache 会小很多。

好处：

- 显存占用更低。
- 读取 K/V 的带宽压力更小。
- 长上下文生成更友好。

可能的代价：

- 表达能力可能不如完整 MHA。

## GQA

GQA 是 Grouped-Query Attention。

它可以理解成 MHA 和 MQA 的折中。

MHA 是每个 head 都有自己的 K/V。

MQA 是所有 head 共享一份 K/V。

GQA 是几个 head 一组，共享一份 K/V。

例子：

```text
Head 1、2 共享 K/V A
Head 3、4 共享 K/V B
Head 5、6 共享 K/V C
Head 7、8 共享 K/V D
```

这样既减少 KV Cache，又保留一定表达能力。

现在很多大模型会使用 GQA，因为它在能力和推理成本之间比较均衡。

## MHA、MQA、GQA 怎么选

可以先这样记：

| 结构 | K/V 设计 | 优点 | 代价 |
| --- | --- | --- | --- |
| MHA | 每个 head 独立 K/V | 表达能力强 | KV Cache 大 |
| MQA | 所有 head 共享 K/V | 最省显存和带宽 | 表达能力可能受影响 |
| GQA | 一组 head 共享 K/V | 折中方案 | 比 MQA 更占缓存 |

如果你做的是产品或 Agent 系统，不一定需要自己实现这些结构。

但你需要知道：

> 模型结构会直接影响上下文长度、并发能力、延迟和成本。

对部署来说，MHA/MQA/GQA 的关键差异是 K/V 有多少份。

K/V 越多：

- KV Cache 越大。
- 长上下文越占显存。
- 并发越容易受限。
- decode 阶段读取压力越大。

所以很多服务化模型会偏向 GQA 这类折中设计。

## MoE

MoE 是 Mixture of Experts，混合专家模型。

普通模型可以理解成：

```text
每个 token 都经过同一套参数。
```

MoE 模型可以理解成：

```text
模型里有很多专家，每个 token 只找其中几个专家处理。
```

例子：

一个模型里有 8 个专家：

```text
专家 1：擅长代码
专家 2：擅长数学
专家 3：擅长中文表达
专家 4：擅长英文表达
专家 5：擅长法律文本
专家 6：擅长医学文本
专家 7：擅长表格
专家 8：擅长闲聊
```

当输入是：

```text
请帮我解释这段 Java 代码。
```

路由器可能选择：

```text
专家 1 + 专家 3
```

当输入是：

```text
帮我解这个方程。
```

路由器可能选择：

```text
专家 2 + 专家 3
```

真实模型里的专家不一定像人类标签这样清晰，但这个类比有助于理解。

### MoE 解决什么问题

MoE 想解决：

> 如何让模型参数很多，但每次计算只激活一小部分。

比如一个模型总参数很大，但每个 token 只用其中一部分专家。

这样可以拥有更大的容量，同时控制每次推理的计算量。

### MoE 的代价

MoE 也会带来复杂度：

- 路由器要决定 token 进哪个专家。
- 专家负载可能不均衡。
- 分布式部署更复杂。
- 不同 token 走不同专家，工程调度更难。

一句话：

```text
MoE 用更复杂的调度，换更大的模型容量。
```

## Dense 模型和 MoE 模型

Dense 模型：

```text
所有 token 都经过同一套主要参数。
```

MoE 模型：

```text
每个 token 只激活部分专家参数。
```

对比：

| 类型 | 直觉 | 优点 | 难点 |
| --- | --- | --- | --- |
| Dense | 所有人走同一条流水线 | 简单稳定 | 参数大时计算重 |
| MoE | 不同 token 分配给不同专家 | 容量大、计算可控 | 路由和部署复杂 |

部署 MoE 时要额外关注：

- 专家是否分布在多张 GPU 上。
- 路由是否导致某些专家特别忙。
- batch 内 token 被分配到不同专家后的通信成本。
- 是否需要 expert parallelism 这类并行策略。

所以 MoE 不是“免费变强”，它把一部分计算压力变成了调度和通信压力。

## FlashAttention

Attention 计算不只是“算不算得动”的问题，还有“数据怎么搬”的问题。

GPU 很快，但显存读写也很贵。

FlashAttention 的核心思路可以简化成：

> 重新组织 attention 的计算方式，减少显存读写，让 GPU 更高效地完成同样的数学计算。

它不是改变模型能力的结构。

它更像是把同一道题用更高效的计算方式做出来。

可以理解成：

```text
普通 Attention：中间结果很多，频繁写显存、读显存。
FlashAttention：分块计算，尽量把中间结果留在更快的存储里。
```

## PagedAttention

KV Cache 会占大量显存。

如果很多用户同时请求，每个用户的上下文长度不同，就容易造成显存管理问题。

PagedAttention 的直觉类似操作系统里的分页：

> 把 KV Cache 分成一页一页的小块，需要时再管理和复用。

它主要解决：

- KV Cache 显存碎片。
- 多用户并发时的缓存管理。
- 长上下文请求对显存的压力。

如果 KV Cache 是“把历史 K/V 存起来”，PagedAttention 更关注：

> 这些缓存在线上服务里怎么高效管理。

## Batching

Batching 是把多个请求合在一起跑。

例子：

```text
用户 A：请解释错误日志。
用户 B：请写一个 SQL。
用户 C：请总结文章。
```

如果一个一个跑，GPU 可能吃不满。

把它们组成 batch 后，GPU 可以并行处理更多计算。

但是生成式模型有个麻烦：

> 每个用户生成长度不同。

用户 A 可能 20 个 token 就结束。

用户 B 可能要生成 500 个 token。

所以线上系统经常会用 continuous batching，也就是动态批处理。

它会不断把新请求加入，把完成的请求移出，让 GPU 尽量保持忙碌。

## Speculative Decoding

Speculative Decoding 可以翻译成推测解码。

它的直觉是：

> 让一个小模型先快速猜几个 token，再让大模型检查这些 token 能不能接受。

例子：

小模型先猜：

```text
Transformer 是 一种 神经 网络
```

大模型检查后发现：

```text
前 4 个 token 都可以接受
```

那就一次前进 4 步。

如果某个 token 不接受，再从那里重新生成。

这像是：

```text
小模型负责快猜，大模型负责把关。
```

它的目标是减少大模型逐 token 生成的等待时间。

## Quantization

Quantization 是量化。

模型参数原本可能用比较高精度的数字保存。

量化会把它们压到更低精度。

例子：

```text
FP16 -> INT8
FP16 -> INT4
```

直觉上类似：

```text
用更少的数字位数保存模型权重。
```

好处：

- 模型占用显存更少。
- 加载更快。
- 推理成本更低。

可能的代价：

- 精度下降。
- 某些任务效果变差。
- 对长上下文、复杂推理可能更敏感。

## RoPE 和长上下文

RoPE 是 Rotary Position Embedding，旋转位置编码。

它和“模型怎么知道 token 位置”有关。

很多大模型使用 RoPE 来表达位置信息。

当模型从短上下文扩展到长上下文时，位置编码会变得很重要。

你可以先这样理解：

> KV Cache 解决生成时复用历史计算，RoPE 解决模型如何理解 token 的位置关系。

长上下文优化经常会同时涉及：

- 位置编码扩展。
- Attention 计算优化。
- KV Cache 管理。
- 上下文压缩。

## 这些概念放在一张表里

| 概念 | 解决什么问题 | 更偏模型结构还是推理系统 | 一个直觉 |
| --- | --- | --- | --- |
| MHA | 多角度理解 token 关系 | 模型结构 | 多个观察角度 |
| MQA | 减少 K/V 缓存和读取 | 模型结构 | 多个 Q 共享 K/V |
| GQA | 在能力和缓存之间折中 | 模型结构 | 一组 head 共享 K/V |
| MoE | 参数容量大但每次少算 | 模型结构 | token 分配给专家 |
| KV Cache | 避免重复计算历史 K/V | 推理系统 | 历史笔记存起来 |
| Prefix Cache | 复用多个请求相同前缀 | 推理系统 | 固定开头只算一次 |
| FlashAttention | 降低 attention 显存读写 | 推理系统 | 更高效地搬数据 |
| PagedAttention | 管理大量 KV Cache | 推理系统 | 缓存分页管理 |
| Batching | 提高 GPU 利用率 | 推理系统 | 多个请求一起跑 |
| Speculative Decoding | 降低生成延迟 | 推理系统 | 小模型先猜，大模型检查 |
| Quantization | 降低模型显存和成本 | 推理系统 | 用更低精度存模型 |
| RoPE | 表达 token 位置关系 | 模型结构 | 给 token 顺序编码 |

## 在 Agent 产品里为什么重要

Agent 产品通常会有很长的上下文：

- 系统提示词。
- 工具说明。
- 项目文件。
- 历史对话。
- 检索结果。
- 任务计划。
- 工具返回结果。

这些内容会影响：

- 首 token 延迟。
- 生成速度。
- 并发能力。
- 服务成本。
- 是否容易命中 Prefix Cache。
- KV Cache 是否撑爆显存。

所以设计 Agent 上下文时，不只是“让模型看更多”。

更准确地说，是：

> 让模型看到必要的信息，并让这些信息以更容易缓存、更少干扰、更低成本的方式进入上下文。

## 一个 Agent 请求例子

假设一个代码 Agent 的 prompt 结构是：

```text
固定系统规则
固定工具说明
固定项目规范
动态用户问题
动态相关文件片段
动态工具结果
```

这会带来几个效果。

固定系统规则、工具说明、项目规范：

```text
适合 Prefix Cache
```

动态用户问题和文件片段：

```text
每次都可能不同，不容易复用
```

长对话历史：

```text
会增加 KV Cache 压力
```

工具结果太长：

```text
会增加首 token 延迟，也可能干扰模型注意力
```

所以工程设计上可以做：

- 把稳定 prompt 放前面，并保持顺序固定。
- 把动态检索结果放在后面。
- 对历史对话做摘要，而不是无限追加。
- 对工具结果做结构化裁剪。
- 大文件只放相关片段。
- 对常用仓库规则做稳定缓存。

## 常见误区

### 误区 1：KV Cache 会让模型理解更多

不会。

KV Cache 主要是推理加速。

它让模型少重复计算，不是增加模型能力。

### 误区 2：Prefix Cache 等于记忆

不是。

Prefix Cache 是计算缓存。

记忆是产品或系统保存的用户偏好、项目事实、任务状态。

### 误区 3：MoE 就一定更聪明

不一定。

MoE 增加了模型容量，但最终效果还取决于训练数据、路由、专家设计、后训练和推理系统。

### 误区 4：量化一定无损

不一定。

量化能降成本，但可能影响复杂任务表现。

### 误区 5：上下文越长越好

不是。

长上下文会增加 KV Cache、延迟、成本和干扰。

真正重要的是上下文质量。

## 建议学习顺序

第一遍建议这样学：

1. MHA：理解多头注意力为什么需要多个观察角度。
2. KV Cache：理解生成时为什么要缓存历史 K/V。
3. Prefix Cache：理解 Agent 产品为什么要稳定 prompt 前缀。
4. MQA / GQA：理解为什么要减少 K/V。
5. MoE：理解为什么大模型可以“参数多但每次少算”。
6. Batching：理解线上服务为什么要合并请求。
7. FlashAttention / PagedAttention：理解高性能推理如何管理计算和显存。
8. Speculative Decoding / Quantization：理解降低延迟和成本的常见办法。

第一遍只要抓住这条主线：

```text
MHA 让模型看得更丰富
KV Cache 让生成少重复算
Prefix Cache 让相同开头少重复算
MQA/GQA 让缓存更小
MoE 让大模型每次只激活一部分
推理系统优化让线上服务跑得更快更稳
```
