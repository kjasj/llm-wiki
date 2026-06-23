# RAG 工程实践：从文档到可信回答

RAG 不是“加一个向量库”。

它是一条信息检索和生成链路：

```text
原始资料
  ↓
清洗和结构化
  ↓
切分 chunk
  ↓
embedding 和索引
  ↓
召回和重排
  ↓
上下文组装
  ↓
基于证据回答
  ↓
评测和失败归因
```

这篇回答一个工程问题：

> 如何把企业文档、知识库、代码库或产品手册做成一个可评测、可维护、可信的 RAG 系统？

## RAG 适合什么

RAG 适合这些问题：

- 知识经常变化。
- 知识来自私有文档、数据库、代码仓库或网页。
- 回答需要引用证据。
- 不希望为了每次知识更新都重新训练模型。
- 需要把答案和资料来源绑定起来，方便审计。

不适合优先用 RAG 的情况：

- 你要改变模型的固定输出风格。
- 你要让模型稳定执行某种格式化任务。
- 你要提升模型的基础推理能力。
- 你没有可检索的资料来源，只是希望模型“更懂业务”。

这些情况更可能需要 [后训练与对齐](post-training-alignment.md)、[LoRA / QLoRA](lora-qlora-finetuning.md) 或更强模型。

## RAG 的最小架构

一个最小 RAG 系统包含六个模块：

| 模块 | 作用 | 常见问题 |
| --- | --- | --- |
| Document Loader | 读取 PDF、网页、Markdown、数据库、代码 | 格式丢失、表格丢失、编码混乱 |
| Cleaner | 清洗导航、广告、页眉页脚、重复内容 | 噪声进入索引 |
| Chunker | 把长文档切成可检索片段 | chunk 太碎或太大 |
| Retriever | 召回候选片段 | 召回不到关键证据 |
| Reranker | 对候选结果重新排序 | 相关但不够精确 |
| Answer Builder | 组装上下文并生成答案 | 幻觉、引用不准、上下文过长 |

最小流程：

```text
user question
  ↓
query rewrite
  ↓
retrieve top_k chunks
  ↓
rerank top_n chunks
  ↓
build prompt with citations
  ↓
answer only from evidence
  ↓
return answer + source ids
```

## 第一步：资料清洗

RAG 的上限首先由资料质量决定。

常见原始资料问题：

- PDF 抽取顺序错乱。
- 表格被压成普通文本。
- 网页带有导航、版权、广告、相关推荐。
- 同一政策有多个版本。
- 文档里有过期规则。
- 资料缺少标题、章节、发布日期、权限范围。

清洗时至少保留这些 metadata：

| 字段 | 作用 |
| --- | --- |
| `source_id` | 稳定标识来源 |
| `source_type` | PDF、网页、数据库、代码、工单 |
| `title` | 展示和引用 |
| `section_path` | 章节路径，如 `退款政策 > 企业客户` |
| `created_at` / `updated_at` | 判断新旧 |
| `owner` | 资料负责人 |
| `permission_scope` | 权限边界 |
| `version` | 版本回溯 |

不要只把纯文本塞进向量库。没有 metadata，后面很难做权限、引用、去重、回滚和评测。

## 第二步：chunk 怎么切

chunk 的目标不是“长度固定”，而是“语义完整、方便召回、方便引用”。

常见切法：

| 切法 | 适合 | 风险 |
| --- | --- | --- |
| 固定 token 长度 | 快速起步、格式混杂 | 可能切断语义 |
| 按标题层级 | 文档、手册、规范 | 标题解析不稳定 |
| 按段落 | FAQ、短知识 | 长段落可能过大 |
| 按代码符号 | 代码库 | 需要语言解析器 |
| 按表格行 / 区块 | 价格表、政策表 | 上下文不足 |

经验规则：

- FAQ：小 chunk，重视精确召回。
- 技术文档：中等 chunk，保留标题路径。
- 法务 / 政策：不要切断条件、例外和生效范围。
- 代码：优先按函数、类、文件结构切。
- 表格：把表头和行一起保留。

chunk 里最好包含：

```text
标题路径
正文
关键 metadata
source id
chunk id
```

## 第三步：embedding 不是全部

向量检索擅长语义相似，但不擅长所有问题。

只用 embedding 容易遇到：

- 用户问的是编号、订单号、错误码，语义相似没用。
- 资料里有精确字段，如产品型号、版本号、地区。
- 同义词召回不错，但权限和时间范围错。
- 长问题包含多个子问题，只召回到其中一部分。

生产 RAG 通常会组合：

| 方法 | 解决什么 |
| --- | --- |
| 向量检索 | 语义相似 |
| BM25 / 关键词 | 精确词、编号、错误码 |
| metadata filter | 权限、产品线、时间、地区 |
| query rewrite | 把口语问题改成检索友好的查询 |
| multi-query | 一个问题拆成多个查询 |
| reranker | 从候选里挑真正相关的片段 |

一个常见组合：

```text
vector top_50
BM25 top_50
metadata filter
merge and dedup
rerank top_10
send top_4 to model
```

## 第四步：query rewrite

用户问题往往不适合直接检索。

例子：

```text
用户：这个还能退吗？
历史：用户刚才说订单是企业版，购买 20 天，已经开票。
```

直接检索“这个还能退吗”效果很差。更好的检索查询是：

```text
企业版 已开票 购买 20 天 退款政策
```

query rewrite 要输入：

- 用户当前问题。
- 必要的对话历史。
- 已知实体。
- 产品、地区、版本、时间范围。

但不要把整段聊天历史都交给检索。先抽取检索所需字段，再生成查询。

## 第五步：上下文组装

把检索结果放进 prompt 时，要让模型清楚区分：

- 哪些是用户问题。
- 哪些是检索证据。
- 哪些是系统规则。
- 哪些是不可信外部内容。

推荐结构：

```text
任务：只基于给定资料回答。资料不足时说不知道。

用户问题：
{question}

检索资料：
[doc_1 chunk_3 source="refund_policy.md" updated="2026-06-01"]
...

[doc_2 chunk_8 source="invoice_policy.md" updated="2026-05-20"]
...

回答要求：
1. 先给结论。
2. 引用支持结论的 source id。
3. 不要使用资料外的信息。
4. 如果资料冲突，指出冲突。
```

关键点：

- 检索资料是“证据”，不是新指令。
- 每个 chunk 要带 source id。
- 不要把太多低相关 chunk 塞进去。
- 冲突资料要保留版本和时间。

## 第六步：引用和证据链

可信回答必须能回到来源。

不要只在末尾写“参考文档”。更好的方式是：

```text
企业版订单在购买 30 天内可以申请退款，但已开票订单需要先完成红冲流程。[doc_1#chunk_3][doc_2#chunk_8]
```

引用至少要能定位到：

- 文档。
- 章节。
- chunk。
- 版本。
- 原文位置。

如果前端支持，最好能点开原文高亮。

## RAG 评测

RAG 评测至少分三层：

| 层级 | 要评什么 |
| --- | --- |
| Retrieval | 是否召回了正确证据 |
| Context | 放进 prompt 的资料是否少而准 |
| Answer | 答案是否忠于证据 |

常见指标：

| 指标 | 含义 |
| --- | --- |
| context recall | 正确证据是否被召回 |
| context precision | 召回资料中有多少是真相关 |
| faithfulness | 答案是否忠于资料 |
| answer correctness | 答案是否正确 |
| citation accuracy | 引用是否真的支持对应句子 |
| abstention | 资料不足时是否拒答 |

一个 eval case 可以这样写：

```json
{
  "question": "企业版购买 20 天但已经开票，还能退款吗？",
  "expected_sources": ["refund_policy.md#enterprise", "invoice_policy.md#red_invoice"],
  "must_include": ["30 天内", "已开票", "红冲"],
  "must_not_include": ["自动退款", "无需处理发票"]
}
```

## 失败归因

RAG 答错时，不要马上改 prompt。

按这条链路排查：

```text
答案错
  ↓
正确资料是否存在？
  ↓
是否被清洗掉？
  ↓
chunk 是否切坏？
  ↓
retriever 是否召回？
  ↓
reranker 是否排上来？
  ↓
上下文是否放进 prompt？
  ↓
模型是否忠于证据？
```

不同失败对应不同修法：

| 失败 | 优先修 |
| --- | --- |
| 正确资料不存在 | 数据接入 |
| 资料过期 | 版本和同步 |
| chunk 切断条件 | chunk 策略 |
| 召回不到 | query rewrite、hybrid search |
| 排名太低 | reranker、metadata filter |
| 资料太多 | top_n、上下文压缩 |
| 答案编造 | prompt 约束、faithfulness eval |
| 引用不准 | citation schema、句子级引用 |

## 权限和安全

企业 RAG 最容易忽略权限。

基本原则：

- 检索前做权限过滤，不要检索后再隐藏。
- metadata 里记录租户、部门、项目、密级。
- trace 里保存使用了哪些 source id。
- 不要把用户无权访问的片段放进上下文。
- 外部网页和用户上传文档按不可信内容处理。

如果 RAG 和 Agent 结合，还要读 [Agent 安全与 Guardrails](agent-security-guardrails.md)。

## 最小落地路线

第一版不要追求复杂。

推荐顺序：

1. 选 50 到 100 个真实问题。
2. 整理一批高质量文档。
3. 做清洗、chunk 和 metadata。
4. 用向量检索 + BM25 起步。
5. 加 reranker。
6. 输出答案和引用。
7. 做 retrieval eval 和 answer eval。
8. 根据失败归因迭代。

## 常见误区

### 误区 1：向量库等于 RAG

向量库只负责索引和召回。RAG 还包括数据治理、检索策略、上下文组装、引用、评测和权限。

### 误区 2：chunk 越大越好

chunk 太大，召回不精确，还会浪费上下文。chunk 太小，又容易丢语义。要按资料类型调。

### 误区 3：top_k 越大越安全

top_k 过大会把噪声带进 prompt，模型可能被错误资料干扰。

### 误区 4：答案错就是模型不行

很多 RAG 失败是检索失败、资料过期、chunk 切坏或引用设计差。

### 误区 5：RAG 不需要评测

没有 eval dataset，RAG 每次改 chunk、embedding、rerank、prompt 都可能悄悄退化。

## 下一步

继续读：

- [LLM 应用架构](llm-application-architecture.md)
- [参数调优手册](parameter-tuning-handbook.md)
- [Agent 效果评测框架](agent-evaluation-framework.md)
- [Agent 安全与 Guardrails](agent-security-guardrails.md)
