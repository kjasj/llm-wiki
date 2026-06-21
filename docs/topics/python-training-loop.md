# 原生 Python 训练循环入门

这篇不是要你从零训练一个大模型。

目标是看懂训练循环里发生了什么：

```text
文本
  ↓
tokenizer
  ↓
input_ids / labels
  ↓
model forward
  ↓
loss
  ↓
backward
  ↓
optimizer step
  ↓
generate
```

## 为什么要学原生训练循环

Unsloth、LLaMA-Factory、Transformers Trainer 都会把训练细节封装起来。

封装很好，但如果完全不知道底层在做什么，后面看到这些参数会很迷糊：

- `learning_rate`
- `batch_size`
- `gradient_accumulation_steps`
- `max_seq_length`
- `labels`
- `loss`
- `optimizer`

所以先看一个最小训练循环。

## 训练数据长什么样

语言模型训练的基本目标是：

> 给定前面的 token，预测下一个 token。

一句话：

```text
小明喜欢吃苹果。
```

会变成 token id：

```text
[101, 2051, 734, 8842, 102]
```

训练时可以理解成：

```text
输入：小明 喜欢 吃
答案：喜欢 吃 苹果
```

更准确地说，模型每个位置都在预测下一个 token。

## tokenizer

tokenizer 负责把文本变成数字。

伪代码：

```python
batch = tokenizer(
    texts,
    padding=True,
    truncation=True,
    max_length=512,
    return_tensors="pt",
)
```

得到：

```text
input_ids      token 编号
attention_mask 哪些位置是真 token，哪些是 padding
```

对于自回归语言模型，`labels` 常常就是 `input_ids` 的拷贝。

```python
batch["labels"] = batch["input_ids"].clone()
```

模型内部会处理“当前位置预测下一个 token”的偏移。

## dataset 和 dataloader

dataset 存样本。

dataloader 把样本组成 batch。

```python
for batch in dataloader:
    ...
```

batch 的意义是：

> 一次给模型看多条样本，让 GPU 并行计算。

如果 batch 太大，显存会爆。

如果 batch 太小，训练不稳定，GPU 利用率也可能低。

## forward 和 loss

训练循环核心：

```python
outputs = model(**batch)
loss = outputs.loss
```

`forward` 做的是：

```text
input_ids
  ↓
embedding
  ↓
Transformer blocks
  ↓
logits
  ↓
和 labels 对比
  ↓
loss
```

`logits` 是模型对每个候选 token 的分数。

`loss` 衡量模型猜得有多错。

loss 越低，说明模型在训练集上越会预测这些样本。

但注意：

> loss 低不等于线上效果一定好。

还要看验证集、真实任务和评估指标。

## backward

```python
loss.backward()
```

这一步计算梯度。

梯度告诉模型：

```text
哪些参数应该往哪个方向改，才能让 loss 下降。
```

## optimizer step

```python
optimizer.step()
optimizer.zero_grad()
```

`optimizer.step()` 更新参数。

`optimizer.zero_grad()` 清空梯度，为下一步训练做准备。

完整循环：

```python
for batch in dataloader:
    outputs = model(**batch)
    loss = outputs.loss

    loss.backward()
    optimizer.step()
    optimizer.zero_grad()
```

这就是训练循环的骨架。

## gradient accumulation

如果显存放不下大 batch，可以累积多步梯度。

```text
小 batch 跑 4 次
  ↓
梯度累积
  ↓
再更新一次参数
```

这就是：

```text
gradient_accumulation_steps = 4
```

它模拟更大的 batch，但训练时间会变长。

## evaluation

训练时要定期在验证集上评估。

```text
训练集 loss 下降
验证集 loss 也下降：通常是好事
训练集 loss 下降
验证集 loss 上升：可能过拟合
```

验证集要和训练集分开。

否则模型可能只是记住训练样本，而不是真的泛化。

## generate

训练后要试试模型会不会生成。

生成时不再 `backward`。

```python
with torch.no_grad():
    output_ids = model.generate(
        input_ids,
        max_new_tokens=100,
        temperature=0.7,
        top_p=0.9,
    )
```

训练阶段关注：

```text
loss 能不能下降
```

推理阶段关注：

```text
回答是否正确、稳定、符合格式、速度能不能接受
```

## 和 LoRA 的关系

全量微调会更新模型大量参数。

LoRA 的做法是：

> 冻结原模型，只训练很小的适配器参数。

所以训练循环还是类似：

```text
forward -> loss -> backward -> optimizer step
```

区别是：

```text
只有 LoRA adapter 参数会被更新。
```

## 最小检查清单

看一个训练脚本时，先找这些东西：

- 数据从哪里来。
- tokenizer 如何处理文本。
- `labels` 怎么构造。
- `max_seq_length` 是多少。
- 模型是否加载了量化。
- 训练哪些参数。
- optimizer 和 learning rate 是多少。
- 是否有验证集。
- 如何保存 checkpoint。
- 如何生成样例做人工检查。

## 下一步

学完这篇后，继续看：

- [数据、Tokenizer 与预训练数据工程入门](data-tokenizer-pretraining-data.md)
- [LoRA 与 QLoRA 微调入门](lora-qlora-finetuning.md)
- [参数调优手册](parameter-tuning-handbook.md)
