# 参数调优手册

参数很多，先不要背。

先分清它属于哪一类：

```text
API 采样参数：控制模型怎么生成
训练参数：控制模型怎么学习
部署参数：控制服务怎么跑
性能指标：衡量服务跑得怎么样
```

## API 采样参数

这些参数通常出现在 HTTP 请求里。

| 参数 | 影响 | 调大通常会怎样 |
| --- | --- | --- |
| `temperature` | 随机性 | 输出更多样，也更不稳定 |
| `top_p` | 候选 token 范围 | 候选更多，输出更开放 |
| `top_k` | 只保留概率最高的 k 个 token | 候选更多 |
| `max_tokens` / `max_output_tokens` | 输出长度上限 | 回答能更长，成本更高 |
| `stop` | 停止生成条件 | 更容易控制边界 |
| `frequency_penalty` | 降低重复词 | 更少重复 |
| `presence_penalty` | 鼓励引入新内容 | 更容易展开新话题 |

入门默认：

```text
严肃任务：temperature 0-0.3
教学解释：temperature 0.4-0.7
创意任务：temperature 0.8+
```

一般先调 `temperature`，不要一开始同时大幅调 `temperature` 和 `top_p`。

## 训练参数

训练参数控制模型怎么学习。

| 参数 | 直觉 | 常见问题 |
| --- | --- | --- |
| `learning_rate` | 参数更新步子 | 太大震荡，太小学不动 |
| `batch_size` | 每步样本数 | 太大爆显存，太小不稳定 |
| `gradient_accumulation_steps` | 累积梯度 | 省显存但变慢 |
| `epochs` | 数据看几轮 | 太多容易过拟合 |
| `warmup_steps` | 初期慢慢升学习率 | 太少可能不稳 |
| `weight_decay` | 正则约束 | 太大可能欠拟合 |
| `max_seq_length` | 样本最大长度 | 太短截断，太长费显存 |

调参顺序建议：

```text
先固定数据质量
  ↓
调 max_seq_length
  ↓
调 batch / accumulation
  ↓
调 learning_rate
  ↓
调 epochs
```

## LoRA 参数

| 参数 | 直觉 |
| --- | --- |
| `r` | adapter 容量 |
| `lora_alpha` | 更新强度 |
| `lora_dropout` | 防过拟合 |
| `target_modules` | 注入哪些层 |

经验判断：

```text
学不进去：可能 r 太小、学习率太低、数据太差
过拟合：可能 epochs 太多、数据太少、dropout 太低
显存紧张：降低 r、降低 max_seq_length、开 QLoRA
```

## 部署参数

部署参数控制服务怎么跑。

| 参数 | 直觉 | 风险 |
| --- | --- | --- |
| `dtype` | 计算精度 | 精度和兼容性 |
| `quantization` | 压缩模型 | 质量可能下降 |
| `kv_cache_dtype` | KV Cache 精度 | 影响长上下文和并发显存 |
| `max_model_len` | 最大上下文 | KV Cache 变大 |
| `tensor_parallel_size` | 多 GPU 切分 | 通信成本增加 |
| `gpu_memory_utilization` | 显存使用比例 | 太高容易 OOM |
| `max_num_seqs` | 最大并发序列 | 太高容易延迟变大 |
| `max_num_batched_tokens` | batch token 上限 | 影响吞吐和延迟 |
| `enable_prefix_caching` | 前缀缓存 | 需要稳定前缀才有效 |

## 性能指标

不要只说“慢”。

要拆成指标：

| 指标 | 含义 | 常见原因 |
| --- | --- | --- |
| TTFT | time to first token，首 token 延迟 | prompt 太长、prefill 慢 |
| TPOT | time per output token，每 token 耗时 | decode 慢、batch 太大 |
| Latency | 总延迟 | 输入长、输出长、排队 |
| Throughput | 吞吐 | batch、并发、GPU 利用率 |
| Concurrency | 并发能力 | KV Cache、显存、调度 |
| OOM | 显存溢出 | 上下文太长、并发太高 |

## 问题到参数的映射

| 问题 | 优先看 |
| --- | --- |
| 输出太随机 | 降低 `temperature` |
| 输出太短 | 增大 `max_tokens`，检查 stop |
| 输出重复 | 调 repetition / frequency penalty，检查 prompt |
| 首 token 很慢 | 缩短输入、检查 prefix cache、看 prefill |
| 生成过程慢 | 看 TPOT、batch、KV Cache、模型大小 |
| 并发一高就 OOM | 降低上下文、并发、KV Cache 压力 |
| 微调后格式不稳 | 检查数据格式、chat template、SFT 样本 |
| 微调后幻觉变多 | 检查数据质量、epochs、eval |

## 一个调参原则

一次只改一类参数。

不要同时改：

```text
prompt + temperature + top_p + 模型版本 + 部署 batch
```

否则你不知道效果变化来自哪里。

更好的方式：

```text
固定模型和 prompt
  ↓
只调采样参数
  ↓
记录结果
  ↓
再调部署参数
```

## 下一步

继续看：

- [模型量化与推理压缩入门](model-quantization-and-compression.md)
- [LLM API：从 HTTP 到 Transformer](openai-api-beginner.md)
- [LLM 推理与架构优化入门](llm-inference-architecture.md)
- [LoRA 与 QLoRA 微调入门](lora-qlora-finetuning.md)
