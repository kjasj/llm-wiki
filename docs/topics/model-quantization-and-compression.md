# 模型量化与推理压缩入门

这篇补一个部署里非常关键的概念：

> 为什么同一个模型，有人说需要 80GB 显存，有人说 24GB 也能跑？

答案通常是：

```text
精度不同
量化不同
上下文长度不同
并发不同
框架不同
```

量化是其中最常见的一环。

## 先说结论

量化不是让模型“变小一点”这么简单。

它本质上是在做取舍：

```text
用更低精度保存或计算模型中的数字
  ↓
减少显存、内存和带宽压力
  ↓
换来可能的精度损失、兼容性问题或 kernel 限制
```

入门可以先记这张表：

| 方案 | 每参数约占 | 32B 权重粗估 | 适合 |
| --- | --- | --- | --- |
| FP16 / BF16 | 2 bytes | 约 64GB | 质量优先、数据中心 GPU |
| FP8 / INT8 | 1 byte | 约 32GB | 服务部署、显存减半 |
| INT4 / 4bit | 0.5 byte | 约 16GB | 本地部署、低成本部署 |

但这只是模型权重。

完整部署还要加上：

- KV Cache。
- 运行时 buffer。
- 量化 scale / zero point。
- batch 和并发。
- 框架预留显存。

所以：

```text
权重能放下 ≠ 服务一定能稳定跑
```

## 精度是什么

模型里到处都是数字。

比如一个权重可能是：

```text
0.13748291
```

高精度会更细，低精度会更粗。

可以粗略理解成：

```text
高精度：0.13748291
低精度：0.14
更低精度：0.125
```

常见精度：

| 名称 | 类型 | 说明 |
| --- | --- | --- |
| FP32 | 浮点 | 训练早期常见，现在大模型部署基本不用 |
| FP16 | 浮点 | 常见推理精度 |
| BF16 | 浮点 | 范围更稳，训练和推理常用 |
| FP8 | 浮点 | Hopper 等新卡上更重要 |
| INT8 | 整数 | 8bit 量化 |
| INT4 | 整数 | 4bit 量化 |

注意：

```text
FP8 和 INT8 都是 8bit
但表示方式不同
```

FP8 更像缩小版浮点数。

INT8 更像把数字映射到整数格子上。

## 量化到底做了什么

假设原始权重范围是：

```text
-1.0 到 1.0
```

如果用 INT8，可以把它映射到：

```text
-128 到 127
```

模型保存时不再保存原始浮点数，而是保存整数和映射关系。

这个映射关系通常包含：

```text
scale
zero point
```

直觉：

```text
真实值 ≈ scale × (量化整数 - zero_point)
```

例子：

```text
真实值：0.137
scale：0.01
量化整数：14
反量化后：0.14
```

你会发现：

```text
0.137 变成 0.14
```

这就是误差。

误差小，模型表现变化不大。

误差大，模型能力会下降。

## 量化会量化哪些东西

不是只有一种量化。

### Weight-only quantization

只量化模型权重。

推理时可能会：

```text
低 bit 权重
  ↓
反量化到高精度
  ↓
和 activation 做矩阵乘法
```

常见：

- GPTQ。
- AWQ。
- GGUF 里的很多 Q4/Q5/Q8。
- bitsandbytes 4bit / 8bit 加载。

它最直接的收益是：

```text
模型权重显存变小
```

### Weight + activation quantization

权重和中间激活都量化。

常见写法：

```text
W8A8
```

意思是：

```text
Weight 8bit
Activation 8bit
```

这种方式对 kernel 和硬件要求更高。

做得好时，不只是省显存，还可能提高吞吐。

### KV Cache quantization

KV Cache 是推理过程中保存历史 token 的 K/V。

长上下文和高并发下，KV Cache 会非常大。

所以有些框架支持：

```text
FP16 KV Cache -> FP8 KV Cache
```

这和权重量化是两件事。

你可以：

```text
权重用 AWQ / GPTQ
KV Cache 仍然用 FP16
```

也可以：

```text
权重量化
  +
KV Cache FP8
```

它们解决的问题不同：

| 类型 | 主要省什么 |
| --- | --- |
| 权重量化 | 模型权重显存 |
| KV Cache 量化 | 长上下文和并发显存 |

## 常见量化方法

### FP8

FP8 是 8bit 浮点。

它适合：

- H100 / H200 等支持 FP8 的 GPU。
- 大模型服务化部署。
- 想在质量和性能之间取平衡。

优点：

- 通常比 INT4 质量更稳。
- 比 FP16 / BF16 省一半权重显存。
- 新数据中心 GPU 上性能好。

限制：

- 需要硬件和框架支持。
- 不同 FP8 格式、scale 策略会影响效果。

### INT8

INT8 是 8bit 整数量化。

优点：

- 显存约减半。
- 质量通常比 4bit 更稳。
- 对很多模型是不错的折中。

适合：

```text
我想省显存，但不想冒太大质量风险。
```

### INT4 / 4bit

4bit 更激进。

它把权重压得更小：

```text
FP16 -> INT4
显存大约变成 1/4
```

优点：

- 本地部署友好。
- 能让 24GB、48GB 显卡跑更大模型。
- 32B、70B 本地体验经常依赖 4bit。

风险：

- 复杂推理、数学、代码、长上下文可能更敏感。
- 不同量化算法差异明显。
- 有些 4bit 格式不一定在你的推理框架里最快。

### GPTQ

GPTQ 是一种常见的后训练量化方法。

它会用少量校准数据估计权重量化误差，并尽量减少误差。

特点：

- 常见于 GPU 推理。
- 很多 Hugging Face 模型会发布 GPTQ 版本。
- 通常是离线量化，部署时加载已量化权重。

适合：

```text
我想用现成的 4bit GPU 量化模型部署。
```

### AWQ

AWQ 是 Activation-aware Weight Quantization。

它的直觉是：

> 不同权重对最终输出的重要程度不同，重要的权重要更小心处理。

特点：

- 常用于 4bit 权重量化。
- 很多服务框架支持。
- 质量和速度通常比较实用。

适合：

```text
我想在服务部署里用比较成熟的 4bit 权重量化。
```

### bitsandbytes

bitsandbytes 常用于：

- 8bit 加载。
- 4bit 加载。
- QLoRA 微调。

它很适合学习和实验。

例子：

```python
from transformers import AutoModelForCausalLM, BitsAndBytesConfig

quant_config = BitsAndBytesConfig(load_in_4bit=True)

model = AutoModelForCausalLM.from_pretrained(
    "Qwen/Qwen2.5-7B-Instruct",
    quantization_config=quant_config,
    device_map="auto",
)
```

注意：

```text
bitsandbytes 方便
但生产服务是否选它，还要看 vLLM / SGLang / TGI 等框架支持和性能
```

### GGUF

GGUF 是 llama.cpp 生态常见模型文件格式。

它通常用于：

- 本地运行。
- CPU / GPU 混合运行。
- Apple Silicon。
- 低门槛量化部署。

常见名字：

```text
Q8_0
Q6_K
Q5_K_M
Q4_K_M
Q3_K_M
```

非常粗略地理解：

| 格式 | 直觉 |
| --- | --- |
| Q8_0 | 质量更稳，占用更大 |
| Q5_K_M | 折中 |
| Q4_K_M | 常见低成本选择 |
| Q3 / Q2 | 更省，但质量风险更高 |

不要只背格式名。

不同模型、不同任务、不同硬件下，结果会变。

## PTQ 和 QAT

### PTQ

PTQ 是 Post-Training Quantization。

意思是：

```text
模型训练完后，再做量化
```

大多数部署量化都属于 PTQ。

优点：

- 不需要重新训练完整模型。
- 成本低。
- 可以快速把 FP16 模型转成低 bit 模型。

缺点：

- 极低 bit 时可能掉效果。
- 依赖校准数据和算法。

### QAT

QAT 是 Quantization-Aware Training。

意思是：

```text
训练时就模拟量化误差，让模型适应低精度
```

优点：

- 低 bit 下可能质量更好。

缺点：

- 训练成本更高。
- 工程链路更复杂。

入门阶段先理解 PTQ 就够了。

## Calibration 是什么

校准数据是一小批代表性样本。

量化算法会用它观察：

- 权重范围。
- activation 范围。
- 哪些通道更敏感。
- 量化误差会怎样影响输出。

如果校准数据和真实任务差太远，量化后效果可能变差。

例子：

```text
你要部署代码模型
但校准数据全是闲聊
```

这可能导致代码任务掉得更多。

## group size、scale、zero point

量化不是整个模型共用一个 scale。

常见做法是分组量化。

例如：

```text
每 128 个权重一组
每组有自己的 scale
```

这就是常说的：

```text
group_size = 128
```

一般来说：

- group 越小，量化更精细，质量可能更好。
- group 越小，scale 元数据更多，开销也更多。
- group 越大，压缩更粗，质量可能下降。

`zero_point` 用来支持非对称量化。

入门不用急着推公式，只要知道：

```text
scale / zero_point / group_size 会影响量化质量和性能
```

## 量化一定更快吗

不一定。

量化至少可能带来三种结果：

```text
更省显存
更快
更慢
```

为什么可能更快？

- 权重更小，显存带宽压力下降。
- 可以放更大 batch。
- 可以减少跨卡通信量。
- 特定硬件有低 bit kernel 加速。

为什么可能更慢？

- 需要反量化。
- kernel 不够成熟。
- 格式和硬件不匹配。
- batch 太小，启动和调度开销占比高。
- llama.cpp CPU/GPU offload 比全 GPU 慢。

所以评估量化不要只看显存。

至少看：

- 质量。
- TTFT。
- TPOT。
- tokens/s。
- 最大并发。
- OOM 率。
- 成本。

## 量化对效果有什么影响

通常风险从低到高：

```text
BF16 / FP16
  ↓
FP8 / INT8
  ↓
INT4
  ↓
INT3 / INT2
```

更容易受影响的任务：

- 数学推理。
- 代码生成。
- 长上下文问答。
- 多轮工具调用。
- 严格 JSON / 结构化输出。
- 小模型。

相对更稳的任务：

- 简单问答。
- 摘要。
- 分类。
- 改写。
- 低风险内部工具。

但这只是经验。

最终要靠 eval。

## 32B 模型怎么选量化

假设是 32B dense 模型。

| 目标 | 建议 |
| --- | --- |
| 质量优先 | BF16 / FP16，最好 80GB 或多卡 |
| 单卡 48GB 服务 | FP8 / INT8 / AWQ |
| 单卡 24GB 本地体验 | 4bit，比如 AWQ/GPTQ/GGUF Q4 |
| 长上下文 | 权重量化之外，还要关注 KV Cache |
| 高并发 | 不要只压权重，要给 KV Cache 留显存 |

一个常见误区：

```text
32B 4bit 权重只有约 16GB
所以 24GB 肯定够
```

不一定。

因为还要放：

- KV Cache。
- runtime buffer。
- CUDA graph。
- batch。
- tokenizer / server 进程。

如果上下文开到 32K、64K，再加并发，很容易不够。

## 671B 模型怎么选量化

671B 这类模型常见于 DeepSeek-V3 / R1 这类 MoE。

先记住：

```text
MoE 每 token 激活少量参数
不代表只需要加载这些激活参数
```

部署时通常要让全部专家权重可访问。

所以权重显存还是按总参数估：

| 精度 | 671B 权重粗估 |
| --- | --- |
| FP16 / BF16 | 约 1.34TB |
| FP8 / INT8 | 约 671GB |
| INT4 | 约 335GB |

这还没算 KV Cache 和运行时开销。

所以：

- 671B BF16 通常不是普通部署选择。
- 671B FP8 更常见，但需要 H100/H200 等硬件和多卡框架支持。
- 671B INT4 可以降低门槛，但要重点评估质量、速度和框架兼容。

如果你看到：

```text
671B 只需 4 张消费卡
```

要问清楚：

- 是不是 4bit？
- 有没有 CPU offload？
- 上下文多长？
- tokens/s 多少？
- 是本地试玩还是生产服务？
- MoE expert 是否全部在 GPU？

## 部署框架里怎么用

### vLLM

vLLM 常见写法：

```bash
vllm serve /models/qwen-32b-awq \
  --quantization awq \
  --max-model-len 32768 \
  --gpu-memory-utilization 0.85
```

如果使用 FP8 KV Cache，思路类似：

```bash
vllm serve /models/model \
  --kv-cache-dtype fp8 \
  --max-model-len 32768
```

实际参数名和支持情况要看你安装的 vLLM 版本。

### SGLang

SGLang 可以指定量化：

```bash
python -m sglang.launch_server \
  --model-path /models/model \
  --quantization fp8
```

也可以指定 KV Cache 精度：

```bash
python -m sglang.launch_server \
  --model-path /models/model \
  --kv-cache-dtype fp8_e4m3
```

如果 OOM，还会配合：

```bash
--mem-fraction-static 0.7
--max-running-requests 8
--chunked-prefill-size 4096
```

### llama.cpp

llama.cpp 常见流程是：

```text
Hugging Face 模型
  ↓
转换成 GGUF
  ↓
量化成 Q4_K_M / Q5_K_M / Q8_0
  ↓
用 llama-server 或 llama-cli 运行
```

示意：

```bash
./llama-quantize model-f16.gguf model-q4_k_m.gguf Q4_K_M
```

运行时：

```bash
./llama-server \
  -m model-q4_k_m.gguf \
  -c 8192 \
  -ngl 99
```

`-ngl` 控制尽量把多少层放到 GPU。

如果显存不够，就会更多落到 CPU / 系统内存上，速度会变慢。

## 其他相关概念

量化之外，部署里还会遇到一些“压缩或加速”概念。

### Offload

Offload 是把一部分东西放到别处。

常见：

```text
GPU 显存放不下
  ↓
部分权重放到 CPU 内存
```

优点：

- 能跑更大的模型。

缺点：

- 慢很多。
- PCIe / 内存带宽会成为瓶颈。

适合：

```text
本地能跑起来，速度不是第一目标
```

不太适合：

```text
生产高吞吐服务
```

### Pruning

Pruning 是剪枝。

它会移除一些不重要的权重、通道、层或结构。

直觉：

```text
把模型里不太重要的部分剪掉
```

优点：

- 模型可能更小。
- 理论上计算更少。

难点：

- 容易掉效果。
- 需要稀疏 kernel 或结构化剪枝，才容易真的变快。
- 大模型生态里不如量化常用。

### Sparsity

Sparsity 是稀疏化。

意思是很多权重变成 0，或者只保留一部分连接。

但要注意：

```text
权重里有很多 0
不代表推理一定快
```

必须有硬件和 kernel 能跳过这些 0，才能真正加速。

MoE 也可以看成一种结构化稀疏：

```text
总专家很多
每个 token 只走一部分专家
```

### Distillation

Distillation 是蒸馏。

它不是部署时把模型压缩，而是训练一个更小模型。

直觉：

```text
大模型当老师
小模型学老师的输出和风格
```

适合：

- 想降低线上成本。
- 任务范围比较明确。
- 能接受小模型只覆盖部分能力。

例子：

```text
用 70B 模型生成高质量客服数据
再训练 7B / 14B 模型服务客服场景
```

### Speculative Decoding

Speculative Decoding 是推测解码。

它不是压缩模型权重，而是用小模型帮大模型加速生成。

流程：

```text
小模型先猜多个 token
  ↓
大模型批量验证
  ↓
接受就一次前进多步
```

它解决的是：

```text
decode 逐 token 太慢
```

和量化可以叠加。

### FlashAttention / PagedAttention / Prefix Cache

这些也不是量化。

它们分别解决：

| 概念 | 解决什么 |
| --- | --- |
| FlashAttention | attention 计算时减少显存读写 |
| PagedAttention | 更高效管理 KV Cache |
| Prefix Cache | 相同 prompt 前缀少重复算 |

它们和量化可以一起用。

真实部署优化通常是组合拳：

```text
量化权重
  +
KV Cache 管理
  +
batching
  +
prefix cache
  +
多卡并行
```

## 怎么选

### 本地学习

建议：

```text
GGUF Q4_K_M / Q5_K_M
llama.cpp
```

原因：

- 上手简单。
- 硬件要求低。
- 容易理解显存、上下文和速度的关系。

### 单卡 GPU 服务

建议优先看：

```text
AWQ / GPTQ / FP8 / INT8
vLLM 或 SGLang
```

如果是 24GB 卡：

```text
优先 4bit
降低 max_model_len
低并发
```

如果是 48GB / 80GB 卡：

```text
可以考虑 INT8 / FP8 / 4bit
按质量和吞吐压测选择
```

### 生产服务

建议：

```text
先用 BF16 / FP16 或 FP8 做质量基线
再比较 INT8 / INT4
必须跑 eval
```

不要只看模型是否能启动。

要看：

- 真实任务成功率。
- JSON / tool call 稳定性。
- 长上下文表现。
- TTFT。
- TPOT。
- tokens/s。
- OOM 率。
- 并发上限。

## 常见误区

### 误区 1：4bit 一定比 8bit 快

不一定。

要看 kernel、硬件、batch、模型结构和框架。

有时 4bit 更省显存，但反量化开销让速度不理想。

### 误区 2：权重量化后 KV Cache 也变小

不一定。

AWQ / GPTQ 主要量化权重。

KV Cache 是否变小，要看是否启用了 KV Cache 量化。

### 误区 3：量化只影响显存，不影响效果

不对。

量化会引入数值误差。

模型越小、bit 越低、任务越复杂，越可能受影响。

### 误区 4：能跑就是能部署

本地能输出几个 token，不等于能生产部署。

生产还要看：

- 并发。
- 延迟。
- 稳定性。
- 监控。
- 回滚。
- 评测。

### 误区 5：MoE 只按激活参数估显存

不对。

MoE 每个 token 只激活部分专家，但部署时通常仍然要让全部专家权重可访问。

所以显存估算要看总参数。

## 一句话总结

量化回答的是：

```text
能不能用更少的显存和带宽运行模型？
```

但真正部署时还要一起看：

```text
质量
上下文长度
并发
KV Cache
框架支持
硬件 kernel
评测结果
```

如果你只记一条：

> 量化先帮你把模型放进机器里，评测才能告诉你它是否真的可用。

## 下一步

继续看：

- [模型部署硬件选型](model-deployment-hardware-sizing.md)
- [本地部署框架对比](local-deployment-frameworks.md)
- [LLM 推理与架构优化入门](llm-inference-architecture.md)
- [参数调优手册](parameter-tuning-handbook.md)

## 参考资料

- [vLLM Quantization](https://docs.vllm.ai/en/latest/features/quantization/)
- [SGLang Quantization](https://sgl-project.github.io/advanced_features/quantization.html)
- [SGLang Server Arguments](https://github.com/sgl-project/sglang/blob/main/docs/advanced_features/server_arguments.md)
- [llama.cpp quantize README](https://github.com/ggml-org/llama.cpp/blob/master/tools/quantize/README.md)
- [Hugging Face Transformers quantization](https://huggingface.co/docs/transformers/en/main_classes/quantization)
- [Hugging Face bitsandbytes quantization](https://huggingface.co/docs/transformers/v4.46.0/quantization/bitsandbytes)
- [Hugging Face GGUF](https://huggingface.co/docs/hub/en/gguf)
