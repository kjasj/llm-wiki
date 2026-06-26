# 大模型与推理优化术语表

这篇是长期维护的术语表。

它服务两个场景：

- 读 [Hy3 Preview 推理优化案例](hy3-preview-inference-optimization-case.md) 时，快速查专业名词。
- 以后遇到大模型、推理优化、部署和系统工程里的新术语时，统一补到这里。

它和 [核心概念索引](concept-index.md) 的分工不同：

| 文档 | 作用 |
| --- | --- |
| 核心概念索引 | 帮你判断一个概念属于哪一层，应该继续读哪篇专题 |
| 本术语表 | 对专业名词做更细解释，尤其是推理优化和硬件相关词 |

## 维护规则

以后新增术语时，尽量按这个格式写：

```text
中文名 / English
  所属层：模型结构、推理流程、kernel、通信、缓存、量化、评测等
  一句话：先给直觉解释
  工程含义：它为什么影响质量、延迟、吞吐、显存或成本
  继续读：链接到展开的专题或案例
```

不要只堆缩写。一个缩写至少要说明它在哪个链路出现、解决什么问题、容易和什么词混淆。

## 快速分层

```text
模型结构：Transformer / Attention / GQA / MoE / Router / Expert
推理流程：Prefill / Decode / Sampling / KV Cache / Prefix Cache
Kernel 层：GEMM / Fused Kernel / Tile / CTA / Warp / HBM / Tensor Core
并行通信：TP / SP / DP / EP / AllReduce / ReduceScatter / NVLink / NCCL
缓存调度：PagedAttention / Multi-level KV Cache / MTP / Speculative Decoding
压缩优化：Quantization / GPTQ / Smooth / Hadamard / QAT / Sparse Attention
线上指标：TTFT / TPOT / Throughput / Concurrency / SLO
```

## 模型结构

| 术语 | 一句话解释 | 工程含义 |
| --- | --- | --- |
| Transformer | 当前大模型最常见的神经网络结构 | 后面的 Attention、FFN、MoE、KV Cache 都围绕它展开 |
| Encoder | Transformer 中偏“读入和理解”的部分 | BERT 类模型常用；聊天 LLM 多数不是 encoder-only |
| Decoder | Transformer 中偏“自回归生成”的部分 | GPT/Llama/Qwen 这类聊天模型主要按 decoder-only 方式生成 |
| Decoder-only | 只有自回归 decoder 主体的模型结构 | 把 prompt 当作前缀读入，再逐 token 预测后续输出 |
| Encoder-Decoder | Encoder 读输入、Decoder 生成输出的结构 | 翻译、摘要和 T5 类模型常见 |
| Attention | 让当前 token 从上下文 token 中取信息 | 长上下文下计算和显存压力大，是推理优化重点 |
| Q / K / V | Query、Key、Value，Attention 的三组向量 | KV 会被缓存，Q 用来查询历史 K/V |
| MHA | Multi-Head Attention，多头注意力 | 多个 head 从不同子空间看上下文，KV Cache 成本较高 |
| MQA | Multi-Query Attention，多个 Q head 共享 K/V | 降低 KV Cache 体积，但可能影响表达能力 |
| GQA | Grouped-Query Attention，按组共享 K/V | 在 MHA 和 MQA 之间折中，常用于降低长上下文成本 |
| MoE | Mixture of Experts，多专家模型 | 每个 token 只激活部分专家，计算更省，但路由和通信更复杂 |
| Expert | MoE 中的专家子网络 | 专家权重需要存储和调度，EP 会围绕专家分布展开 |
| Router | 决定 token 进入哪些专家的路由模块 | 对精度敏感，Router 算错会影响 MoE 整层输出 |
| Top-k Routing | 为每个 token 选择得分最高的 k 个专家 | k 越大计算和通信越重，k 太小可能影响模型质量 |
| Shared Expert | MoE 中所有 token 都会经过的共享专家 | 能稳定通用能力，但也带来额外计算与通信路径 |
| Gating | MoE 中计算专家权重或门控分数的过程 | 影响专家选择和 top-k 加权聚合 |

## 推理流程

| 术语 | 一句话解释 | 工程含义 |
| --- | --- | --- |
| Inference | 用训练好的模型生成结果 | 关注延迟、吞吐、显存、成本和稳定性 |
| Tokenizer | 把文本切成 token 并转成 token id | 发生在模型计算前，决定输入 token 数和上下文长度 |
| Token ID | token 在词表里的整数编号 | 模型实际接收的是 token id，不是原始字符串 |
| Embedding | 把 token id 查表变成向量 | 是 Transformer 计算前的第一步表示转换 |
| Hidden State | 模型内部每个 token 当前位置的向量表示 | Q/K/V、FFN、LM head 都基于 hidden states 继续计算 |
| LM Head | 把最后 hidden state 映射到词表 logits 的输出层 | 生成下一个 token 前必须经过它 |
| Prefill | 一次性处理完整输入 prompt | 长上下文时决定 TTFT，Attention 和通信成本很高 |
| Decode | 逐 token 生成输出 | 决定 TPOT，常受 KV Cache、显存带宽、采样和调度影响 |
| KV Cache | 缓存历史 token 的 K/V | 用显存换速度，长上下文和高并发时会成为显存大户 |
| Prefix Cache | 复用多个请求的相同前缀 KV | Agent、Coding、系统提示词稳定时收益明显 |
| Sampling | 从 logits 中选下一个 token | temperature、top-k、top-p、重复惩罚都发生在这里 |
| Logits | 模型对下一个 token 的原始分数 | 采样前会经过温度缩放、过滤或惩罚 |
| Softmax | 把 logits 转成概率分布 | 采样链路里的常见算子，融合后可减少访存 |
| Temperature | 控制采样随机性的参数 | 值越高越随机，值越低越稳定 |
| Top-k | 只保留概率最高的 k 个候选 token | 可减少采样候选范围 |
| Top-p | 只保留累计概率达到 p 的候选集合 | 也叫 nucleus sampling |
| Repetition Penalty | 降低已出现 token 再次出现的概率 | 常用于减少重复输出，但会增加采样后处理逻辑 |
| Vocab Size | 词表大小 | 采样常要扫描词表，词表越大后处理越重 |
| Batch | 一批一起执行的请求或 token | 提高 GPU 利用率，但会影响排队延迟和显存 |
| Continuous Batching | 动态把不同阶段请求合并执行 | 是线上推理服务提高吞吐的关键调度能力 |

## Kernel 与硬件

| 术语 | 一句话解释 | 工程含义 |
| --- | --- | --- |
| Kernel | GPU 上执行的一段计算程序 | 小 kernel 太多会带来启动开销和同步开销 |
| Fused Kernel | 把多个算子合成一个 kernel | 减少 kernel launch、HBM 读写和中间 tensor |
| Operator Fusion | 算子融合 | Rope、Norm、Quant、Store KV、Sampler 都适合做融合 |
| GEMM | General Matrix Multiply，通用矩阵乘 | 大模型 FFN、Attention projection、MoE 专家计算的核心 |
| Grouped GEMM | 把多个小 GEMM 分组一起执行 | MoE 专家计算常用，shape 太碎会降低效率 |
| Gate-Up GEMM | MoE FFN 中 gate/up projection 相关 GEMM | FusedMoE 会尝试把路由读取、计算和量化串起来 |
| Down GEMM | MoE / FFN 中 down projection 相关 GEMM | 常接在激活之后，是专家计算后半段 |
| Tensor Core | NVIDIA GPU 上专门加速矩阵计算的单元 | BF16、FP8、INT8 等路径是否能用 Tensor Core 会显著影响速度 |
| CUDA Core | 通用 CUDA 计算核心 | 某些 FP32/TF32 或 element-wise 路径可能走这里 |
| HBM | High Bandwidth Memory，GPU 高带宽显存 | 推理优化经常是减少 HBM 往返，而不是减少数学公式 |
| Register | GPU 线程私有寄存器 | 融合 kernel 会尽量把中间结果留在寄存器里 |
| Shared Memory | GPU block 内共享的片上内存 | 常用于分块统计、tile 缓存和减少全局访存 |
| SM | Streaming Multiprocessor | GPU 的主要执行单元，优化目标是提高 SM 利用率 |
| CTA | Cooperative Thread Array，线程块 | Attention 动态调度里常按 CTA 分配任务 |
| Warp | GPU 中一组并行执行的线程 | Load Warp、MMA Warp、Epilogue Warp 是流水线里的角色划分 |
| Warp Group | 多个 warp 组成的执行组 | 高性能 GEMM kernel 常按 warp group 组织搬运和计算 |
| Tile | 矩阵或序列计算的分块 | 长序列 Attention 和 GEMM 通算融合都常按 tile 调度 |
| Epilogue | GEMM 主计算后的收尾阶段 | 常做 scale、quant、activation、写回或通知通信 |
| FFMA | Fused Floating-point Multiply-Add | Router 双 BF16 重构 FP32 时用于修正结果 |
| PDL | Programmatic Dependent Launch | 用于减少 kernel 串联气泡，让后续 kernel 更早启动或重叠 |

## Attention 与 MoE 优化

| 术语 | 一句话解释 | 工程含义 |
| --- | --- | --- |
| Split-KV | 把 KV 维度或序列块拆开并行计算 | 长序列需要更多拆分，短序列拆太多反而浪费 |
| Combine Kernel | 合并 split-kv 中间结果的 kernel | 拆分越多，合并阶段也越需要优化 |
| Task Assign | 为每轮 attention 生成任务映射 | 动态调度用它把 tile 均匀分给 CTA |
| Dynamic Scheduling | 按当前 batch 形状动态分配任务 | 解决长短请求混合导致的负载不均衡 |
| Load Balancing | 负载均衡 | 对 MoE 专家和长序列 Attention 都很关键 |
| FusedMoE | 把 MoE 的路由、索引、GEMM、聚合等阶段融合 | 减少 gather/scatter、HBM 往返和 kernel 启动 |
| Gather / Scatter | 按索引收集或分发 token 数据 | MoE 路由后常见，处理不好会成为瓶颈 |
| Top-k Aggregation | 对多个专家输出做加权聚合 | MoE 输出的最后一步，适合和前面链路融合 |
| Arithmetic Intensity | 算力强度，计算量和访存量的比例 | 判断算子是 compute-bound 还是 memory-bound 的关键 |
| Compute-bound | 主要瓶颈在计算能力 | 增加 Tensor Core 利用率会更有效 |
| Memory-bound | 主要瓶颈在访存带宽 | 减少 HBM 读写和提升数据复用更有效 |

## 并行与通信

| 术语 | 一句话解释 | 工程含义 |
| --- | --- | --- |
| TP | Tensor Parallel，把张量切到多张 GPU | 降低单卡权重压力，但会增加 AllReduce 等通信 |
| SP | Sequence Parallel，沿序列维切分 | 长 prefill 中可减少 token-wise 冗余计算 |
| TPSP | Tensor Parallel + Sequence Parallel 组合 | Hy3 案例里用于优化长上下文 Prefill TTFT |
| DP | Data Parallel，不同 GPU 处理不同请求或 batch | Decode 阶段可提高并发，但要处理负载均衡 |
| EP | Expert Parallel，把 MoE 专家分布到多卡或多机 | 释放单卡显存，提升 MoE batch 聚合效率，但通信复杂 |
| DPTP | Data Parallel + Tensor Parallel 混合 | 长序列 Attention 中用于降低 DP 负载不均衡影响 |
| AllReduce | 多卡归约并把结果广播给所有卡 | TP 中常见，通信量大时影响延迟 |
| ReduceScatter | 先归约再把分片分发到不同卡 | 可和 GEMM 做通算融合，隐藏部分通信时间 |
| AllGather | 收集各卡分片并让所有卡获得完整结果 | 多卡并行常见通信原语之一 |
| NCCL | NVIDIA Collective Communications Library | GPU 集群里常用的通信库 |
| NVLink | NVIDIA GPU 间高速互联 | 多卡通信性能会影响 TP、EP 和 KV 传输 |
| NVSwitch | 多 GPU 高带宽交换互联 | 多播、AllReduce 等路径可利用它提升吞吐 |
| P2P | GPU 之间点对点通信 | Decode 小 batch 低延迟路径常会精细优化 P2P |
| Multicast | 一次发送给多个接收方 | AllReduce + Norm 融合里可用来降低通信开销 |
| Communication-Compute Overlap | 通信和计算重叠 | 目标是把通信藏进计算时间里 |
| Async EPLB | 异步专家负载均衡 | 用异步权重重排降低 MoE 专家负载不均 |

## 缓存与调度

| 术语 | 一句话解释 | 工程含义 |
| --- | --- | --- |
| PagedAttention | 用分页方式管理 KV Cache | 降低显存碎片，提升高并发下的 KV 管理效率 |
| Multi-level KV Cache | GPU、CPU、KVStore 分层保存 KV / Prefix Cache | 让长前缀跨请求、跨实例复用，减少重复 Prefill |
| KVStore | 外部 KV 缓存存储服务 | 使缓存不局限于单个 GPU 实例 |
| Cache Hit Rate | 缓存命中率 | 直接影响长上下文 TTFT 和成本 |
| Cache Eviction | 缓存淘汰 | 长上下文 KV 体积大，容易挤掉已有缓存 |
| MTP | Multi-Token Prediction，多 token 预测 | 类似投机生成思路，能提高 decode 吞吐，但调度更复杂 |
| Speculative Decoding | 先猜多个 token，再由主模型验证 | 接受率和调度开销共同决定收益 |
| Acceptance Length | 投机或 MTP 中真实被接受的 token 数 | 下一轮输入长度依赖它，可能导致 CPU-GPU 同步 |
| CPU Bubble | GPU 等 CPU 准备输入或调度的空泡 | Hy3 案例通过按最大接收长度提前准备来减少 |
| Launch | 启动 GPU kernel | 小 kernel 或同步点太多会让 launch 开销变明显 |
| Scheduler | 推理调度器 | 决定 batch、缓存命中、并行策略和资源分配 |

## 量化与压缩

| 术语 | 一句话解释 | 工程含义 |
| --- | --- | --- |
| Quantization | 用低精度表示权重、激活或 KV Cache | 降低显存和带宽压力，但要评测精度损失 |
| W8A8 | 权重 8bit、激活 8bit | 服务部署常见量化目标 |
| W4A8 | 权重 4bit、激活 8bit | 更省权重显存，但更容易有精度风险 |
| W8A8C8 | 权重、激活、Cache 都使用 8bit 量化 | 长上下文场景里可同时压缩权重、激活和 KV |
| FP32 | 32bit 浮点 | 精度高，但推理部署通常太慢太占带宽 |
| BF16 | Brain Floating Point 16bit | 大模型训练和推理常用，数值范围较稳 |
| TF32 | NVIDIA TensorFloat-32 | 在 NVIDIA GPU 上用于加速部分 FP32 计算 |
| FP8 | 8bit 浮点 | Hopper 等硬件上常用于高性能推理 |
| INT8 / INT4 | 8bit / 4bit 整数量化 | INT4 更省显存，但误差更难控制 |
| Scale / Zero Point | 量化映射参数 | 用来把低精度整数映射回近似真实值 |
| GPTQ | 一种基于误差补偿的权重量化方法 | 用逐层重建降低低 bit 权重量化损失 |
| Hessian | 描述参数变化对损失影响的二阶信息 | GPTQ 类方法用它近似判断权重量化误差 |
| Smooth | 激活平滑 | 通过缩放通道减少 activation outlier |
| Activation Outlier | 激活值里的异常大值 | 会拉大量化动态范围，导致主体信息精度下降 |
| Hadamard Transform | Hadamard 正交旋转变换 | 可把 Q/K 离群值打散到更多通道，降低量化误差 |
| QAT | Quantization-Aware Training，量化感知训练 | 训练中模拟量化噪声，让模型适应低精度 |
| Calibration | 用样本估计量化参数 | 数据代表性会影响量化后质量 |
| AngelSlim | 腾讯混元文章中提到的量化压缩框架 | Hy3 案例中组合 GPTQ、Smooth、Hadamard 和 QAT |

## 稀疏注意力与长上下文

| 术语 | 一句话解释 | 工程含义 |
| --- | --- | --- |
| Sparse Attention | 只计算部分 attention 连接 | 长上下文下减少二次复杂度成本 |
| Block Sparse Attention | 按块稀疏计算 attention | 更适合 GPU kernel 高效执行 |
| HPC-BSA | Hy3 案例中提到的 Block Sparse Attention 算子 | 配合 Stem 稀疏注意力降低 128K Prefill 成本 |
| Stem | Hy3 案例中的稀疏注意力算法 | 用位置衰减和输出感知度量选择更关键 token |
| Token Position-Decay | 按 token 位置分配不同 top-k 预算 | 头部 token 影响后续更多，给更大保留预算 |
| OAM | Output-Aware Metric，输出感知度量 | 同时看 QK 分数和 Value 模长，估计实际信息贡献 |
| Causal Attention | 因果注意力，只能看当前位置之前的 token | 自回归模型生成时的基本约束 |
| Long Context | 长上下文 | 会放大 Prefill、KV Cache、Attention 和检索干扰问题 |
| LongBench v2 | 长上下文能力评测集之一 | 用于观察稀疏化或压缩后长上下文质量 |
| CL-bench | 长上下文相关评测集之一 | Hy3 案例中用于比较稀疏注意力质量 |
| SWA | 原文中提到的评测集或任务缩写 | 读到具体论文或项目时应再补充完整来源和定义 |

## 线上指标

| 术语 | 一句话解释 | 工程含义 |
| --- | --- | --- |
| SLO | Service Level Objective，服务目标 | 比如 4s TTFT、50ms TPOT 这类线上约束 |
| TTFT | Time To First Token，首 token 延迟 | 主要受排队、prefill、缓存命中和输入长度影响 |
| TPOT | Time Per Output Token，每输出一个 token 的耗时 | 主要受 decode、KV Cache、采样和显存带宽影响 |
| TPOP | 原文写法，通常可按 TPOT 理解 | 阅读资料时要结合上下文确认是不是同一个指标 |
| ITL | Inter-Token Latency，token 间延迟 | 和 TPOT 接近，更关注流式输出间隔 |
| Throughput | 吞吐 | 常用 tokens/s、requests/s 或 output tokens/s 衡量 |
| Concurrency | 并发 | 同时服务多少请求，受 KV Cache 和调度策略影响 |
| Latency | 总延迟 | 包括排队、prefill、decode、采样和网络返回 |
| Tail Latency | 长尾延迟 | P95/P99 变差通常说明负载不均或资源争用 |
| GPU Utilization | GPU 利用率 | 高不一定好，要结合吞吐、延迟和显存看 |
| Memory Footprint | 显存占用 | 权重、KV Cache、临时 buffer、通信 buffer 都要算 |

## 继续读

- [LLM 推理与架构优化入门](llm-inference-architecture.md)
- [Hy3 Preview 推理优化案例：从算子到系统](hy3-preview-inference-optimization-case.md)
- [模型量化与推理压缩入门](model-quantization-and-compression.md)
- [模型部署硬件选型](model-deployment-hardware-sizing.md)
- [参数调优手册](parameter-tuning-handbook.md)
