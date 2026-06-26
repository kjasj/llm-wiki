# 模型部署硬件选型：显卡、显存、多卡和服务器

这篇回答一组非常现实的问题：

```text
32B 模型需要什么显卡？
671B 模型需要多少显卡？
多卡怎么部署？
服务器 CPU、内存、硬盘、网络有什么要求？
```

先给结论：

> 部署模型时，第一指标是显存，不是显卡名字。

但显存够只是能跑。

想跑得好，还要看：

- 显存容量。
- 显存带宽。
- 支持什么精度：BF16、FP8、INT8、INT4。
- 多卡互联：NVLink、NVSwitch、PCIe、InfiniBand。
- CPU 核心数。
- 系统内存。
- NVMe 硬盘。
- 散热和电源。
- 推理框架是否支持这个模型和量化格式。

如果你还不熟悉 INT4、INT8、FP8、AWQ、GPTQ、GGUF、KV Cache 量化这些词，建议先读：[模型量化与推理压缩入门](model-quantization-and-compression.md)。

## 先分清：训练和部署不是一回事

训练要保存：

```text
模型权重
梯度
优化器状态
激活值
```

部署推理主要保存：

```text
模型权重
KV Cache
运行时临时 buffer
```

所以同一个模型：

- 训练需要的显存远大于推理。
- 推理时上下文越长、并发越高，KV Cache 越大。
- 模型越大，权重显存越大。

这篇只讲部署推理。

## 部署时显存主要花在哪

可以先记住这个公式：

```text
总显存 ≈ 模型权重 + KV Cache + 运行时开销
```

### 模型权重

权重显存大致这样算：

```text
权重显存 GB ≈ 参数量 × 每个参数字节数
```

常见精度：

| 精度 | 每参数约多少字节 | 直觉 |
| --- | --- | --- |
| FP32 | 4 bytes | 基本不用来部署大模型 |
| FP16 / BF16 | 2 bytes | 常见高质量推理 |
| FP8 / INT8 | 1 byte | 权重显存约减半 |
| INT4 / GPTQ / AWQ / GGUF Q4 | 0.5 byte | 显存更省，质量和速度看实现 |

例子：

```text
32B FP16 权重 ≈ 32B × 2 bytes ≈ 64GB
32B INT8 权重 ≈ 32B × 1 byte ≈ 32GB
32B INT4 权重 ≈ 32B × 0.5 byte ≈ 16GB
```

实际部署要再留一些空间。

因为还有：

- KV Cache。
- CUDA graph / runtime buffer。
- tokenizer、调度器、通信 buffer。
- 框架预留显存。
- 量化 scale / metadata。

所以不要按刚好装满来买卡。

### KV Cache

KV Cache 是推理时保存历史 token 的注意力缓存。

它跟这些因素有关：

```text
KV Cache ≈ 层数 × KV heads × head_dim × 上下文长度 × 并发数 × 精度
```

直觉上：

```text
上下文越长，KV Cache 越大
并发越高，KV Cache 越大
KV Cache 精度越高，占用越大
```

这就是为什么：

```text
同一个 32B 模型
8K context 低并发能跑
128K context 高并发可能直接 OOM
```

部署框架里这些参数都在控制 KV Cache 压力：

| 参数 | 影响 |
| --- | --- |
| `max_model_len` | 单个请求最大上下文 |
| `max_num_seqs` | 同时跑多少序列 |
| `max_num_batched_tokens` | 一个 batch 里最多多少 token |
| `gpu_memory_utilization` | vLLM 允许用多少显存 |
| `mem_fraction_static` | SGLang 静态内存池比例 |
| `kv_cache_dtype` | KV Cache 精度 |

## 选卡先看哪些指标

### 1. 显存容量

这是第一门槛。

常见卡：

| 显卡 | 显存 | 适合 |
| --- | --- | --- |
| RTX 4090 | 24GB | 本地实验、4bit 小中模型 |
| RTX 6000 Ada | 48GB | 单机实验、32B 量化、部分 70B 量化 |
| L40S | 48GB | 推理服务、成本相对低，但多卡互联弱 |
| A100 | 40GB / 80GB | 稳定推理，BF16 好，FP8 不如 Hopper |
| H100 | 80GB | 高性能推理，支持 FP8 |
| H200 | 141GB | 大模型推理更舒服，特别是 405B、671B |
| B200 / B300 | 更大显存 | 超大模型和高吞吐生产集群 |

如果你只是本地玩：

```text
24GB 卡 + 4bit 量化
```

已经能跑不少模型。

如果你要生产部署：

```text
80GB 或 141GB 数据中心卡
```

会省很多调参和 OOM 的痛苦。

### 2. 显存带宽

LLM decode 阶段经常是 memory-bound。

也就是说：

```text
不是算力不够，而是从显存读权重和 KV Cache 不够快。
```

所以 HBM 显存带宽很重要。

同样显存容量下，数据中心 GPU 往往比消费级 GPU 更适合高吞吐推理。

### 3. 精度支持

看模型和框架支持什么：

| 精度 | 硬件关注点 |
| --- | --- |
| BF16 | A100 / H100 / H200 等支持较好 |
| FP8 | Hopper 之后更重要，如 H100 / H200 |
| INT8 / INT4 | 看框架和量化格式支持 |
| GGUF | llama.cpp 生态常用 |

FP8 很适合大模型部署。

但不是所有 GPU 都有高效 FP8 Tensor Core。

### 4. 多卡互联

多卡部署时，不只是把显存加起来。

卡之间要通信。

互联大致分层：

```text
NVSwitch / NVLink
  >
PCIe
  >
跨机器普通以太网
```

如果是单机 8 卡 HGX，NVLink / NVSwitch 很重要。

如果跨机器部署，最好有：

- InfiniBand。
- RoCE。
- GPUDirect RDMA。
- 足够高的网络带宽。

否则模型虽然能分布式跑，但 token 生成很慢。

## 32B 模型需要什么显卡

这里的 32B 指 320 亿参数级别的 dense 模型。

先看权重：

| 精度 | 权重显存粗估 | 现实建议 |
| --- | --- | --- |
| BF16 / FP16 | 约 64GB | 1×80GB 勉强可跑；2×48GB 或 2×80GB 更舒服 |
| FP8 / INT8 | 约 32GB | 1×48GB 可考虑；1×80GB 更稳 |
| INT4 / AWQ / GPTQ / GGUF Q4 | 约 16GB | 1×24GB 可跑低并发；1×48GB 更舒服 |

### 32B 本地实验

如果你只是自己用：

```text
1×RTX 4090 24GB
32B 4bit
上下文 4K-16K
低并发
```

可以作为入门方案。

但要注意：

- 上下文不要开太长。
- 并发基本不要指望太高。
- 量化质量取决于模型和格式。
- vLLM、SGLang、llama.cpp 对不同量化格式支持不同。

### 32B 小型服务

更稳的方案：

```text
1×L40S 48GB
或 1×RTX 6000 Ada 48GB
32B INT8 / FP8 / 4bit
```

适合：

- 内部工具。
- 低到中等并发。
- 8K-32K 上下文。

如果要 BF16：

```text
1×A100/H100 80GB
```

可以跑，但显存余量不大。

如果你还想要更长上下文和更多并发，建议：

```text
2×80GB
```

### 32B 生产服务

建议优先：

```text
2×H100 80GB
或 2×H200 141GB
```

原因不是 32B 一定需要这么多权重显存，而是生产服务还要留给：

- KV Cache。
- 并发。
- 长上下文。
- prefix cache。
- CUDA graph。
- 峰值流量。

典型 vLLM 启动：

```bash
vllm serve /models/qwen-32b-instruct \
  --tensor-parallel-size 2 \
  --dtype bfloat16 \
  --max-model-len 32768 \
  --gpu-memory-utilization 0.9
```

如果是量化模型：

```bash
vllm serve /models/qwen-32b-awq \
  --quantization awq \
  --max-model-len 32768 \
  --gpu-memory-utilization 0.85
```

## 671B 模型需要什么显卡

671B 最常见的讨论对象是 DeepSeek-V3 / DeepSeek-R1 这类 MoE 模型。

DeepSeek-V3 官方说明是：

```text
总参数：671B
每个 token 激活参数：37B
最大上下文：扩展到 128K
```

这里最容易误解：

> 37B activated 不代表只需要部署 37B 权重。

MoE 模型每个 token 只激活部分专家，所以计算量更像几十 B。

但部署时通常仍然要让所有专家权重可访问。

所以显存规划要按：

```text
671B 总权重
```

来估。

### 671B 权重显存粗估

| 精度 | 权重显存粗估 | 现实含义 |
| --- | --- | --- |
| FP16 / BF16 | 约 1.34TB | 单机 8×80GB 不够；16×H100 也偏紧 |
| FP8 / INT8 | 约 671GB | 8×H100 80GB 只有 640GB，通常不够；8×H200 更合理 |
| INT4 | 约 335GB | 8×80GB 比较舒服；4×H200 可以低并发尝试 |

再加上：

- KV Cache。
- expert parallel 通信 buffer。
- CUDA graph / runtime buffer。
- 长上下文。
- 框架开销。

实际需要比表里的权重显存更高。

### 671B FP8 / INT8 推荐

更现实的生产起点：

```text
8×H200 141GB
```

总显存约：

```text
8 × 141GB = 1128GB
```

这能给 FP8 权重、KV Cache 和运行时开销留下比较健康的空间。

如果是 H100 80GB：

```text
8×H100 = 640GB
```

对 671B FP8 权重本身就很紧，通常不建议作为完整 671B FP8 的稳妥方案。

更合理的是：

```text
2 台 × 每台 8×H100 80GB
```

也就是：

```text
16×H100 80GB = 1280GB
```

这时可以用多节点部署。

### 671B FP16 / BF16 推荐

FP16 / BF16 权重约 1.34TB。

稳妥方案通常要：

```text
16×H200
或更多 80GB 卡
```

单机 8×H200 有 1128GB，仍然低于 FP16 权重粗估。

所以 671B 这种规模，生产推理一般不会优先用 FP16 全权重部署。

更常见选择是：

- FP8。
- INT8。
- INT4。
- 专门优化过的 MoE serving。

### 671B INT4 / GGUF 量化

如果是 4bit 量化：

```text
671B × 0.5 byte ≈ 335GB
```

理论上：

```text
8×48GB = 384GB
```

看起来能装下。

但现实要考虑：

- 量化元数据。
- KV Cache。
- 运行时 buffer。
- 跨卡通信。
- 上下文长度。
- llama.cpp / vLLM / SGLang 对该量化格式和模型结构的支持。

所以更稳的是：

```text
8×80GB
或 4×H200
或 8×H200
```

如果用 CPU offload / GGUF，也许能在更便宜机器上跑起来。

但要接受：

```text
能跑 ≠ 跑得快
```

671B 一旦大量权重落到系统内存，速度会明显下降。

## 多显卡部署怎么理解

多卡不是只有一种方式。

### Tensor Parallelism

Tensor Parallelism 把每一层里的矩阵切到多张 GPU 上。

适合：

```text
模型单卡放不下，但单机多卡总显存够
```

vLLM 例子：

```bash
vllm serve /models/llm \
  --tensor-parallel-size 4
```

SGLang 例子：

```bash
python -m sglang.launch_server \
  --model-path /models/llm \
  --tp 4
```

要求：

- 卡间通信要快。
- NVLink / NVSwitch 更好。
- PCIe 也能跑，但吞吐可能受限。

### Pipeline Parallelism

Pipeline Parallelism 把不同层放到不同 GPU 上。

适合：

```text
模型太大，需要按层切
或者 GPU 之间互联没有那么强
```

vLLM 例子：

```bash
vllm serve /models/llm \
  --tensor-parallel-size 4 \
  --pipeline-parallel-size 2
```

含义：

```text
总 GPU 数 = TP × PP = 8
```

### Data Parallelism

Data Parallelism 是复制多份模型，分摊请求。

适合：

```text
单份模型已经能放下
但请求量很大，需要扩吞吐
```

它不是为了解决模型放不下。

它是为了解决并发和吞吐。

### Expert Parallelism

Expert Parallelism 常用于 MoE 模型。

比如 DeepSeek-V3 / R1 这类模型有很多 experts。

可以把不同专家分到不同 GPU 上。

SGLang 多节点 MoE 示例里会出现：

```bash
python3 -m sglang.launch_server \
  --model-path deepseek-ai/DeepSeek-V3 \
  --tp 16 \
  --ep 16 \
  --nnodes 2 \
  --node-rank 0 \
  --moe-a2a-backend deepep
```

这里的关键是：

- `--tp`：总 tensor parallel size。
- `--ep`：expert parallel size。
- `--nnodes`：节点数量。
- `--node-rank`：当前节点编号。
- `--moe-a2a-backend`：MoE expert 间 all-to-all 通信后端。

MoE 大模型非常吃通信。

单纯显存够还不够。

## 服务器 CPU 要多少核心

GPU 推理不是完全不吃 CPU。

CPU 负责：

- HTTP 请求。
- tokenizer。
- chat template 渲染。
- 调度。
- detokenization。
- streaming 输出。
- 多模态预处理。
- 日志和监控。

vLLM 官方给了一个最低规则：

```text
N 张 GPU 至少需要 2 + N 个物理 CPU 核心
```

因为至少会有：

```text
1 个 API server process
1 个 engine core process
N 个 GPU worker process
```

但这是最低线，不是推荐线。

更实用的经验：

| GPU 数 | 最低物理核心 | 建议物理核心 |
| --- | --- | --- |
| 1 GPU | 3 cores | 8-16 cores |
| 2 GPU | 4 cores | 16-32 cores |
| 4 GPU | 6 cores | 32-48 cores |
| 8 GPU | 10 cores | 48-96 cores |

如果是多模态、长上下文、大量 streaming、高 QPS：

```text
CPU 核心数和主频都要加
```

否则你会看到：

```text
GPU 没吃满
但请求还是慢
```

原因可能是 CPU 在 tokenizer、调度、网络输出上卡住了。

## 系统内存要多少

系统内存不是显存替代品。

但它很重要。

它用于：

- 加载 checkpoint。
- tokenizer 和服务进程。
- CPU offload。
- 文件缓存。
- 多进程通信。
- 容器和监控。

建议：

| 场景 | 系统内存建议 |
| --- | --- |
| 7B-14B 单卡实验 | 32GB-64GB |
| 32B 单机部署 | 128GB 起步，256GB 更舒服 |
| 70B-110B 多卡部署 | 256GB-512GB |
| 405B / 671B 大模型 | 512GB-1TB 起步，多节点每节点至少 256GB-512GB |
| CPU offload / GGUF 超大模型 | 系统内存至少覆盖未放入 GPU 的权重，越大越好 |

如果你要部署 671B，并且模型文件本身几百 GB：

```text
不要只买 128GB 内存
```

加载、缓存、转换、offload 都可能直接卡住。

## 硬盘和模型文件

模型文件很大。

粗略看：

| 模型 | FP16 文件 | FP8/INT8 文件 | INT4 文件 |
| --- | --- | --- | --- |
| 32B | 约 64GB | 约 32GB | 约 16GB |
| 70B | 约 140GB | 约 70GB | 约 35GB |
| 671B | 约 1.34TB | 约 671GB | 约 335GB |

建议：

- 用 NVMe SSD。
- 32B 部署至少准备 500GB-1TB。
- 671B 部署至少准备数 TB。
- 多节点部署要保证每个节点都能访问模型文件。
- 不要把模型放在很慢的网络盘上启动服务。

## 网络和多节点要求

如果模型单机放不下，就要跨节点。

跨节点部署要关注：

- 节点之间网络带宽。
- 网络延迟。
- NCCL 是否正常。
- InfiniBand / RoCE。
- GPUDirect RDMA。
- 每个节点环境是否一致。
- 模型路径是否一致。
- 容器镜像是否一致。

vLLM 多节点常见方式：

```bash
vllm serve /models/llm \
  --tensor-parallel-size 8 \
  --pipeline-parallel-size 2 \
  --distributed-executor-backend ray
```

含义：

```text
每节点 8 GPU
2 个节点
总计 16 GPU
```

SGLang 多节点常见方式：

```bash
python -m sglang.launch_server \
  --model-path /models/llm \
  --tp 16 \
  --dist-init-addr 10.0.0.1:20000 \
  --nnodes 2 \
  --node-rank 0
```

另一个节点：

```bash
python -m sglang.launch_server \
  --model-path /models/llm \
  --tp 16 \
  --dist-init-addr 10.0.0.1:20000 \
  --nnodes 2 \
  --node-rank 1
```

## 选型决策流程

你可以按这条线判断：

```text
1. 模型多少参数？
  ↓
2. dense 还是 MoE？
  ↓
3. 用 BF16、FP8、INT8 还是 INT4？
  ↓
4. 最大上下文多长？
  ↓
5. 并发多少？
  ↓
6. 需要低延迟还是高吞吐？
  ↓
7. 单机能不能放下？
  ↓
8. 多卡用 TP、PP、DP 还是 EP？
  ↓
9. CPU、内存、NVMe、网络是否跟得上？
```

一个简单估算公式：

```text
需要总显存
≈ 权重显存 × 1.1 到 1.3
  + KV Cache 显存
```

然后再除以单卡可用显存：

```text
需要 GPU 数
≈ 需要总显存 / 单卡可用显存
```

注意：

```text
单卡可用显存 ≠ 标称显存
```

比如 80GB 卡，实际服务里你可能只让框架用 85%-90%：

```text
80GB × 0.9 = 72GB
```

这样系统才不容易 OOM。

## 常见配置速查

| 目标 | 可行配置 | 说明 |
| --- | --- | --- |
| 32B 本地玩 | 1×24GB + 4bit | 低并发，短到中等上下文 |
| 32B 小服务 | 1×48GB + INT8/FP8/4bit | 内部服务较合适 |
| 32B BF16 | 1×80GB | 能跑，但长上下文和高并发有限 |
| 32B 生产 | 2×80GB 或 2×H200 | 给 KV Cache 和并发留空间 |
| 70B 4bit | 1×48GB 或 2×24GB | 看格式和上下文 |
| 70B BF16 | 2×80GB | 常见多卡部署 |
| 405B FP8 | 8×H100/H200 起 | 更建议 H200 |
| 671B INT4 | 8×80GB 或 4×H200 起 | 低并发可尝试，生产看吞吐 |
| 671B FP8 | 8×H200 或 16×H100 起 | 8×H100 80GB 通常偏紧 |
| 671B BF16 | 16×H200 或更多 | 成本很高，不是常规选择 |

这个表是估算入口，不是保证书。

最终仍要用真实框架启动并压测。

## 压测时看什么

硬件选型最后要回到指标：

| 指标 | 看什么 |
| --- | --- |
| TTFT | 首 token 延迟，主要受 prefill、排队、输入长度影响 |
| TPOT / ITL | 每个输出 token 延迟，主要受 decode 和显存带宽影响 |
| Throughput | 总 tokens/s |
| Concurrency | 并发请求数 |
| GPU memory | 显存占用和碎片 |
| KV cache usage | KV Cache 是否频繁不够 |
| Preemption | vLLM 是否频繁重算 |
| OOM | 启动 OOM 还是运行中 OOM |
| CPU utilization | tokenizer、调度、streaming 是否卡 CPU |
| NCCL / network | 多卡、多节点通信是否卡住 |

如果 vLLM 日志里看到 KV Cache 不够、频繁 preemption，可以优先：

- 降低 `max_model_len`。
- 降低 `max_num_seqs`。
- 降低 `max_num_batched_tokens`。
- 提高可用显存比例，但不要太激进。
- 增加 GPU 数。
- 使用更低精度 KV Cache。

如果 SGLang OOM，可以优先：

- 降低 `--mem-fraction-static`。
- 降低 `--max-running-requests`。
- 降低 `--chunked-prefill-size`。
- 使用 `--kv-cache-dtype fp8_e4m3` 或类似 KV 量化。

## 最后记住

32B 的问题通常是：

```text
我用 24GB、48GB、80GB 怎么平衡质量、上下文和并发？
```

671B 的问题通常是：

```text
我有没有足够的总显存、足够快的多卡通信，以及框架是否真的支持这个 MoE 模型？
```

所以选型不要只问：

```text
几张卡能跑？
```

还要问：

```text
什么精度？
多长上下文？
多少并发？
单机还是多机？
目标 TTFT / TPOT 是多少？
是否接受量化质量损失？
```

这些答案决定你需要的是一张 24GB 卡，还是一整个 8×H200 / 16×H100 集群。

## 下一步

继续看：

- [模型量化与推理压缩入门](model-quantization-and-compression.md)
- [本地部署框架对比](local-deployment-frameworks.md)
- [LLM 推理与架构优化入门](llm-inference-architecture.md)
- [参数调优手册](parameter-tuning-handbook.md)
- [Hy3 Preview 推理优化案例：从算子到系统](hy3-preview-inference-optimization-case.md)

## 参考资料

- [vLLM Optimization and Tuning](https://docs.vllm.ai/en/stable/configuration/optimization/)
- [vLLM Parallelism and Scaling](https://docs.vllm.ai/en/v0.20.1/serving/parallelism_scaling/)
- [SGLang Server Arguments](https://github.com/sgl-project/sglang/blob/main/docs/advanced_features/server_arguments.md)
- [SGLang Multi-Node Deployment](https://sgl-project-sglang-93.mintlify.app/deployment/multi-node)
- [llama.cpp multi-GPU](https://github.com/ggml-org/llama.cpp/blob/master/docs/multi-gpu.md)
- [DeepSeek-V3 Hugging Face model card](https://huggingface.co/deepseek-ai/DeepSeek-V3)
- [DeepSeek-V3 Technical Report](https://arxiv.org/html/2412.19437v1)
