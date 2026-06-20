# LoRA 与 QLoRA 微调入门

这篇解释微调里最常见的两个词：

- LoRA
- QLoRA

先记住一句话：

> LoRA 是少训练一点参数，QLoRA 是把底座模型量化后再做 LoRA。

## 为什么不直接全量微调

全量微调会更新模型大部分参数。

这会带来问题：

- 显存占用高。
- 训练成本高。
- checkpoint 很大。
- 容易把底座模型原有能力改坏。

LoRA 的思路是：

```text
原模型参数冻结
  ↓
在部分线性层旁边加小 adapter
  ↓
只训练 adapter
```

这样训练更轻。

## LoRA 参数

常见参数：

| 参数 | 直觉 |
| --- | --- |
| `r` | adapter 的容量，越大越能学，也越占资源 |
| `lora_alpha` | LoRA 更新强度 |
| `lora_dropout` | 防止过拟合 |
| `target_modules` | 把 LoRA 加到哪些层上 |

入门可以先这样理解：

```text
r 太小：学不进去
r 太大：更慢、更占显存，也可能过拟合
```

## QLoRA

QLoRA 通常会把底座模型用 4bit 方式加载。

直觉：

```text
底座模型压小
  ↓
冻结底座参数
  ↓
训练 LoRA adapter
```

它适合显存有限的场景。

代价是训练和推理链路会更复杂，某些任务也可能对量化更敏感。

## SFT 数据格式

SFT 是 supervised fine-tuning，监督微调。

常见样本像这样：

```json
{
  "instruction": "解释什么是 KV Cache",
  "input": "",
  "output": "KV Cache 是在生成时缓存历史 token 的 Key 和 Value，避免重复计算。"
}
```

也可以是聊天格式：

```json
{
  "messages": [
    {"role": "system", "content": "你是一个机器学习老师。"},
    {"role": "user", "content": "解释什么是 KV Cache"},
    {"role": "assistant", "content": "KV Cache 是在生成时缓存历史 token 的 Key 和 Value，避免重复计算。"}
  ]
}
```

关键不是格式长什么样，而是：

> 训练框架最终会把它渲染成模型对应的 chat template。

如果 template 错了，模型会学错对话格式。

## 训练流程

一次 LoRA 微调大概是：

```text
选择底座模型
  ↓
准备 SFT 数据
  ↓
选择 chat template
  ↓
加载 tokenizer
  ↓
加载模型
  ↓
注入 LoRA adapter
  ↓
训练
  ↓
验证
  ↓
保存 adapter
  ↓
合并或部署 adapter
```

## Unsloth 适合什么

Unsloth 适合先跑通 LoRA / QLoRA。

它更偏：

- 快速上手。
- 单机 GPU。
- 更省显存。
- 少写训练样板代码。

适合第一轮实验：

```text
我有一批数据，想先看看微调有没有效果。
```

## LLaMA-Factory 适合什么

LLaMA-Factory 更像统一训练平台。

它适合：

- 配置化训练。
- 多模型实验。
- 多数据集实验。
- SFT、LoRA、DPO 等方法对比。
- Web UI 或 CLI 管理训练。

适合系统化实验：

```text
我要比较多个模型、多个数据集、多个训练配置。
```

## 训练后怎么用

训练完通常有两种选择。

### 只保存 adapter

```text
底座模型 + LoRA adapter
```

优点：

- 文件小。
- 可以切换多个 adapter。

缺点：

- 部署时要确保推理框架支持加载 adapter。

### 合并模型

```text
底座模型 + adapter -> 合并后的模型
```

优点：

- 部署更简单。

缺点：

- 文件更大。
- 多 adapter 切换不方便。

## 如何判断微调是否有效

不要只看训练 loss。

至少看：

- 验证集 loss。
- 固定测试问题的回答。
- 格式是否稳定。
- 有没有学会业务术语。
- 有没有变得更容易幻觉。
- 有没有破坏通用能力。

可以准备一个小 eval 集：

```text
20 个格式测试
20 个业务问答
20 个边界问题
20 个拒答或安全问题
```

## 常见误区

### 误区 1：有新知识就微调

不一定。

知识经常变化时，RAG 更适合。

微调更适合学格式、风格、流程和稳定任务模式。

### 误区 2：数据越多越好

不一定。

低质量数据会把模型带偏。

小而干净的数据集，常常比大而脏的数据集更好。

### 误区 3：LoRA 不会影响底座能力

也可能影响。

尤其是数据很偏、学习率太大、训练轮数太多时。

## 下一步

继续看：

- [原生 Python 训练循环入门](python-training-loop.md)
- [本地部署框架对比](local-deployment-frameworks.md)
- [参数调优手册](parameter-tuning-handbook.md)

