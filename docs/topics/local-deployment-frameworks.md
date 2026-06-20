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

## 下一步

继续看：

- [LLM API：从 HTTP 到 Transformer](openai-api-beginner.md)
- [LLM 推理与架构优化入门](llm-inference-architecture.md)
- [参数调优手册](parameter-tuning-handbook.md)

## 参考资料

- [llama.cpp GitHub](https://github.com/ggml-org/llama.cpp)
- [vLLM OpenAI-compatible server](https://docs.vllm.ai/en/stable/serving/openai_compatible_server/)
- [SGLang Docs](https://docs.sglang.io/)

