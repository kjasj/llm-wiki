# 本地部署框架对比

这篇回答一个工程问题：

> 我训练或下载了一个开源模型，应该用什么框架把它部署成服务？

先看整体定位。

| 框架 | 适合场景 | 核心关键词 |
| --- | --- | --- |
| llama.cpp | 本地运行、CPU、Apple Silicon、轻量部署 | GGUF、量化、低门槛 |
| llama-cpp-python | Python 调用 llama.cpp | Python binding、OpenAI-compatible server |
| vLLM | GPU 高吞吐服务 | PagedAttention、continuous batching、OpenAI-compatible |
| SGLang | Agent、RAG、结构化生成和复杂推理链 | RadixAttention、prefix cache、structured generation |

## 先给结论

第一轮选型可以按这个判断：

| 你的情况 | 优先选择 | 原因 |
| --- | --- | --- |
| 只是想在 Mac / 笔记本上体验模型 | llama.cpp | 门槛低，GGUF 模型多，对 CPU 和 Apple Silicon 友好 |
| Python 项目里嵌一个本地小模型 | llama-cpp-python | 直接在 Python 里调用，也能起 OpenAI-compatible server |
| 单卡或多卡 GPU 对外提供 HTTP 服务 | vLLM | 吞吐、batch、OpenAI-compatible API 和生态更成熟 |
| Agent / RAG 请求有大量重复前缀和结构化生成 | SGLang | 更强调 prefix 复用、复杂推理链和结构化输出 |
| 你还不知道并发量和延迟要求 | 先 llama.cpp 或 vLLM 单机验证 | 不要过早引入复杂集群和多框架组合 |

这不是永久选择。真实项目经常是：

```text
本地验证：llama.cpp
开发测试：vLLM 单卡
复杂 Agent/RAG：SGLang 或 vLLM + 应用层编排
生产服务：vLLM / SGLang 多卡 + 网关 + 监控 + 评测
```

## 先理解部署要做什么

部署不是训练。

部署要解决：

```text
加载模型
  ↓
接收 HTTP 请求
  ↓
渲染 chat template
  ↓
tokenizer 编码
  ↓
prefill / decode
  ↓
stream 或 JSON 返回
```

所以部署框架的价值是：

- 管理模型加载。
- 管理显存。
- 管理 KV Cache。
- 管理 batch。
- 提供 HTTP API。
- 提供 streaming。
- 提供监控和日志。

## llama.cpp

llama.cpp 更适合本地和轻量场景。

典型特点：

- C/C++ 实现。
- 常用 GGUF 模型文件。
- 支持多种量化格式。
- 可以在 CPU、Apple Silicon、GPU 后端上运行。
- 可以启动本地 server。

适合：

```text
我想在笔记本或单机上跑一个模型。
```

不太适合：

```text
我要做高并发、多租户、大规模 GPU 服务。
```

常见命令形态：

```bash
llama-server -m model.gguf --host 0.0.0.0 --port 8080
```

你需要重点关注：

- 模型文件是不是 GGUF。
- 量化等级是否适合你的内存和质量要求。
- 上下文长度开大后内存是否够。
- CPU / Metal / CUDA 后端是否正确启用。

## llama-cpp-python

llama-cpp-python 可以理解成 llama.cpp 的 Python binding。

适合：

```text
我想在 Python 应用里直接加载 GGUF 模型，或者快速起一个本地 OpenAI-compatible 服务。
```

典型价值：

- 不需要单独管理一个复杂推理服务。
- 本地实验和小工具集成很方便。
- 可以复用 llama.cpp 的 GGUF 和量化生态。

限制也很明确：

- 高并发能力不是它的重点。
- 生产服务仍然要考虑进程管理、监控、资源隔离和失败恢复。
- 和官方 OpenAI API 的字段兼容度需要实际测试。

## vLLM

vLLM 更适合 GPU 服务化部署。

典型特点：

- OpenAI-compatible API server。
- PagedAttention。
- continuous batching。
- 高吞吐。
- 支持很多 Hugging Face 模型。
- 支持 LoRA 服务能力。

典型使用方式：

```bash
vllm serve Qwen/Qwen2.5-7B-Instruct
```

应用侧可以按 OpenAI-compatible 方式请求：

```text
POST http://localhost:8000/v1/chat/completions
```

适合：

```text
我要把开源模型部署成稳定 HTTP 服务，供业务系统调用。
```

你需要重点关注：

- `dtype`：通常在 fp16 / bf16 / fp8 之间选择。
- `max_model_len`：上下文越大，KV Cache 成本越高。
- `gpu_memory_utilization`：显存利用率开太高容易 OOM。
- `max_num_seqs` 和 `max_num_batched_tokens`：决定并发和 batch 调度上限。
- `tensor_parallel_size`：多卡切分模型时必须和硬件匹配。

vLLM 的优势主要出现在服务化场景：

```text
多个请求同时进来
  ↓
调度器把它们合成 batch
  ↓
PagedAttention 管理 KV Cache
  ↓
在吞吐和延迟之间做平衡
```

如果只有一个用户在本地聊天，vLLM 的优势不一定明显。

## SGLang

SGLang 更偏复杂推理程序和高性能服务。

典型特点：

- OpenAI-compatible API。
- RadixAttention。
- 自动复用共享前缀和 KV Cache。
- continuous batching。
- 结构化生成。
- 适合 agent、RAG、多轮和分支生成。

适合：

```text
我的请求不是单次问答，而是有多轮、工具、检索、结构化输出和重复前缀。
```

如果你做 Agent 产品，SGLang 这类框架的思路值得重点看。

SGLang 更值得关注的点是“程序化推理”：

- 多轮提示和分支生成。
- RAG / Agent 中大量共享前缀的复用。
- JSON、正则、schema 等结构化生成。
- 复杂调用链里的吞吐和缓存复用。

简单说，vLLM 更像通用高吞吐模型服务器；SGLang 更强调把复杂 LLM 程序跑得更高效。

## OpenAI-compatible API

很多部署框架会提供：

```text
POST /v1/chat/completions
POST /v1/completions
```

这意味着应用侧可以复用类似 OpenAI 的 HTTP 请求格式。

例子：

```bash
curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "local-model",
    "messages": [
      {"role": "user", "content": "解释一下 KV Cache"}
    ],
    "temperature": 0.3
  }'
```

注意：

> OpenAI-compatible 不等于完全支持 OpenAI 的所有参数和行为。

不同框架、不同模型、不同版本支持的字段可能不一样。

## 部署参数

常见部署参数分三类。

### 模型加载

| 参数 | 直觉 |
| --- | --- |
| `model` | 模型路径或模型 ID |
| `dtype` | 计算精度，如 fp16、bf16 |
| `quantization` | 量化方式 |
| `max_model_len` | 最大上下文长度 |
| `tensor_parallel_size` | 多 GPU 切分模型 |

### 服务性能

| 参数 | 直觉 |
| --- | --- |
| `max_num_seqs` | 同时处理多少序列 |
| `max_num_batched_tokens` | 一个 batch 里最多多少 token |
| `gpu_memory_utilization` | 允许使用多少 GPU 显存 |
| `enable_prefix_caching` | 是否启用前缀缓存 |

### 生成行为

| 参数 | 直觉 |
| --- | --- |
| `temperature` | 随机性 |
| `top_p` | 候选 token 范围 |
| `max_tokens` | 输出长度 |
| `stop` | 停止条件 |

## 怎么选

第一轮可以这样选：

```text
本地试模型：llama.cpp
Python 本地集成：llama-cpp-python
GPU 服务化：vLLM
复杂 Agent/RAG 推理链：SGLang
```

真实项目里也可以组合：

```text
开发机：llama.cpp
测试环境：vLLM 单卡
生产环境：vLLM 或 SGLang 多卡
```

## 选型决策流程

可以按这条链路判断：

```text
1. 只是本地体验？
   是：llama.cpp
   否：继续

2. 是否需要 GPU 服务化和并发？
   是：vLLM 或 SGLang
   否：llama-cpp-python 或简单本地 server

3. 请求是否有大量重复前缀、复杂推理链、结构化生成？
   是：重点评估 SGLang
   否：优先 vLLM

4. 是否需要生产多租户、鉴权、限流、审计？
   是：部署框架外面还要加网关和平台层
   否：单机 server 足够开始
```

## 生产服务还缺什么

部署框架只解决“模型如何生成”，不是完整生产系统。

线上通常还需要：

- API Gateway：鉴权、限流、租户隔离、路由。
- Model Router：按模型、成本、延迟和能力选择后端。
- Queue / Scheduler：削峰、排队、取消和超时。
- Observability：请求日志、trace、TTFT、TPOT、吞吐、错误率。
- Eval Pipeline：升级模型或参数前做回归评测。
- Cache：prompt cache、prefix cache、业务层结果缓存。
- Safety：内容过滤、工具权限、敏感数据处理。

如果你做 Agent，还要额外处理：

- 工具执行沙箱。
- 多轮状态存储。
- loop 停止条件。
- 人工审批。
- trace 回放和失败归因。

这些内容分别在 [大型 Agent 系统架构设计](large-agent-system-architecture.md)、[Loop Engineering](loop-engineering.md) 和 [Agent 安全与 Guardrails](agent-security-guardrails.md) 展开。

## 压测时看什么

不要只看“能不能跑”。

至少看：

- TTFT：首 token 延迟。
- TPOT：每个输出 token 平均耗时。
- Throughput：单位时间输出 token 数。
- Concurrency：并发请求数。
- GPU memory：显存占用。
- Error rate：错误率。
- OOM：是否容易显存溢出。

压测时至少记录这几组条件：

| 条件 | 为什么重要 |
| --- | --- |
| 输入 token 长度 | 决定 prefill 成本和 KV Cache 大小 |
| 输出 token 长度 | 决定 decode 时间和总吞吐 |
| 并发请求数 | 决定调度压力 |
| 是否 streaming | 影响用户感知延迟和连接占用 |
| 是否启用 prefix cache | 对 RAG / Agent 前缀复用影响很大 |
| 模型精度和量化方式 | 影响显存、速度和效果 |

不要只测一个“你好”。部署框架在真实业务里的表现，通常被长上下文、并发、流式输出和失败恢复决定。

## 下一步

继续看：

- [模型量化与推理压缩入门](model-quantization-and-compression.md)
- [模型部署硬件选型](model-deployment-hardware-sizing.md)
- [LLM API：从 HTTP 到 Transformer](openai-api-beginner.md)
- [LLM 推理与架构优化入门](llm-inference-architecture.md)
- [参数调优手册](parameter-tuning-handbook.md)

## 参考资料

- [llama.cpp GitHub](https://github.com/ggml-org/llama.cpp)
- [vLLM OpenAI-compatible server](https://docs.vllm.ai/en/stable/serving/openai_compatible_server/)
- [SGLang Docs](https://docs.sglang.io/)
