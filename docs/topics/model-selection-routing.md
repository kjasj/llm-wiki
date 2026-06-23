# 模型选择与路由：质量、延迟和成本的平衡

模型选择不是“选一个最强模型”。

真实系统里通常需要多模型组合：

```text
简单问题 -> 小模型
复杂推理 -> reasoning 模型
长上下文 -> 长上下文模型
结构化抽取 -> 稳定 JSON 模型
高风险动作 -> 更强模型 + 审批
失败重试 -> fallback 模型
```

这篇回答一个工程问题：

> 如何按任务、成本、延迟和风险选择模型，并在服务端做稳定路由？

## 先分清模型选择的目标

常见目标有四个：

| 目标 | 典型指标 |
| --- | --- |
| 质量 | 正确率、faithfulness、任务完成率 |
| 延迟 | TTFT、总耗时、P95 / P99 |
| 成本 | input token、output token、reasoning token、工具成本 |
| 稳定性 | 错误率、超时率、格式失败率、可用性 |

这四个目标经常互相冲突。

```text
更强模型：质量高，但更慢更贵
更小模型：便宜快速，但复杂任务容易失败
更长上下文：信息更多，但成本和干扰更高
更高 reasoning：复杂推理更好，但延迟和成本更高
```

所以模型选择要以任务为中心，而不是以模型榜单为中心。

## 模型类型地图

| 类型 | 适合 | 不适合 |
| --- | --- | --- |
| 小型 chat 模型 | 分类、改写、简单问答、路由 | 复杂推理、高风险判断 |
| 大型 chat 模型 | 通用回答、总结、复杂写作 | 极低延迟或低成本场景 |
| reasoning 模型 | 数学、代码、规划、多约束决策 | 简单 FAQ、低延迟场景 |
| 长上下文模型 | 多文档阅读、代码仓库、长报告 | 资料可检索时的简单问答 |
| embedding 模型 | 检索、聚类、相似度 | 直接生成答案 |
| reranker 模型 | RAG 候选重排 | 单独回答问题 |
| 本地开源模型 | 数据内控、低边际成本、本地实验 | 高质量通用复杂任务 |
| 微调模型 | 固定格式、稳定风格、专门流程 | 新知识频繁变化 |

## 一条基本路由链

推荐把模型调用分成几层：

```text
用户请求
  ↓
任务分类
  ↓
风险判断
  ↓
上下文预算估算
  ↓
模型选择
  ↓
参数选择
  ↓
执行
  ↓
失败重试 / fallback
  ↓
记录 trace 和 eval 标签
```

不要让前端直接决定模型。模型选择应该在服务端，和权限、预算、日志、评测绑定。

## 任务分类

第一步是判断请求属于哪类任务。

示例分类：

| 任务 | 推荐模型策略 |
| --- | --- |
| 问候、短问答 | 小模型，低温度 |
| 摘要 | 中等模型，按长度控制输出 |
| RAG 问答 | 检索 + 中等模型，必要时升级 |
| 代码修复 | 强模型或 coding 模型，保留 trace |
| 多步规划 | reasoning 模型或 Agent loop |
| JSON 抽取 | 支持结构化输出的稳定模型 |
| 高风险工具调用 | 强模型 + policy engine + 人工审批 |

分类器可以是规则，也可以是小模型。

第一版用规则就够：

```text
包含“总结 / 摘要” -> summarization
包含代码块或错误堆栈 -> code
需要外部资料 -> rag
需要执行动作 -> tool_use
涉及付款、删除、发送、授权 -> high_risk
```

等数据多了再训练或微调分类器。

## 复杂度估算

路由时要估算任务复杂度。

可用信号：

- 输入 token 长度。
- 是否有多约束。
- 是否需要跨文档综合。
- 是否需要工具。
- 是否需要可验证推理。
- 用户是否要求“详细分析”“一步步推导”。
- 历史同类任务失败率。

复杂度可以分级：

| 等级 | 策略 |
| --- | --- |
| L0 | 小模型直接答 |
| L1 | 中等模型答 |
| L2 | 强模型答 |
| L3 | reasoning 模型或多步 workflow |
| L4 | Agent + 工具 + 审批 + trace |

## 成本预算

每次请求都应该有预算。

预算包含：

- 输入 token。
- 输出 token。
- reasoning token。
- embedding / rerank 成本。
- 工具调用成本。
- 超时和重试成本。

一个简单策略：

```text
free 用户：小模型 + 短上下文 + 低 max_output_tokens
pro 用户：中等模型 + RAG + 适度 fallback
enterprise 用户：强模型 + eval trace + 高可靠 fallback
```

不要只按用户等级分配模型。还要按任务风险和复杂度动态调整。

## 参数也要路由

模型路由不只是选 model，也要选参数。

| 场景 | 参数倾向 |
| --- | --- |
| 精确问答 | 低 `temperature` |
| 创意写作 | 较高 `temperature` |
| JSON 输出 | 结构化输出，低温度 |
| 长摘要 | 更高 `max_output_tokens` |
| 复杂推理 | 更高 reasoning budget |
| 快速分类 | 低输出长度，小模型 |

参数细节见 [参数调优手册](parameter-tuning-handbook.md)。

## Fallback 和重试

生产系统必须处理失败。

常见失败：

- API 超时。
- 429 限流。
- 5xx 错误。
- 输出格式不合法。
- 模型拒答。
- RAG 没召回证据。
- 工具调用失败。

重试策略要分类型：

| 失败 | 策略 |
| --- | --- |
| 429 | 等待、降级、换 provider |
| 5xx | 快速重试一次，再 fallback |
| JSON 不合法 | 用同模型修复或改用结构化输出 |
| 答案无证据 | 扩大检索或拒答 |
| 复杂任务失败 | 升级 reasoning 模型 |
| 工具失败 | 返回可恢复错误，不盲目重试 |

不要无限重试。每个请求要有：

- 最大重试次数。
- 总超时时间。
- 最大成本。
- fallback 路径。

## Model Gateway

当模型调用变多，建议加 Model Gateway。

它负责：

- 统一 provider API。
- 模型别名管理。
- 鉴权和租户限流。
- 成本统计。
- fallback 和重试。
- prompt / model / 参数版本记录。
- trace 采样。
- A/B test 和灰度。

典型结构：

```text
Application
  ↓
Model Gateway
  ├─ OpenAI-compatible provider
  ├─ 本地 vLLM / SGLang
  ├─ embedding provider
  └─ reranker provider
```

应用侧只调用逻辑模型名：

```text
model: "fast-chat"
model: "reasoning-high"
model: "json-extractor"
model: "rag-answer"
```

网关再映射到真实 provider 和版本。

## 评测驱动模型选择

不要凭感觉换模型。

每个重要任务都要有 eval set：

| 任务 | Eval |
| --- | --- |
| RAG | retrieval recall、faithfulness、citation accuracy |
| JSON 抽取 | schema validity、field accuracy |
| 代码修复 | tests pass、diff scope、trace |
| 客服 | policy compliance、resolution rate |
| 安全 | tool misuse、prompt injection resistance |

模型上线前跑：

```text
baseline model
candidate model
same dataset
same prompt
same tools
compare quality / latency / cost
```

如果 prompt、模型、RAG、工具 schema 同时变，就很难知道是谁造成了效果变化。

## 一个路由示例

```python
def route(request):
    task = classify_task(request)
    risk = estimate_risk(request)
    complexity = estimate_complexity(request)

    if risk == "high":
        return {
            "model": "reasoning-high",
            "approval_required": True,
            "max_steps": 8,
        }

    if task == "rag":
        return {
            "model": "rag-answer",
            "retrieval": {"hybrid": True, "rerank": True},
            "temperature": 0.1,
        }

    if task == "json_extract":
        return {
            "model": "json-extractor",
            "structured_output": True,
            "temperature": 0,
        }

    if complexity >= 3:
        return {
            "model": "reasoning-medium",
            "reasoning_effort": "medium",
        }

    return {
        "model": "fast-chat",
        "temperature": 0.3,
    }
```

这只是决策骨架。真实系统还要加租户预算、provider 健康状态和历史失败率。

## 常见误区

### 误区 1：永远用最强模型

这会让成本和延迟失控，也会掩盖应用层设计问题。

### 误区 2：只按价格选模型

便宜模型如果导致更多重试、人工兜底和用户流失，总成本可能更高。

### 误区 3：fallback 只要换模型

有些失败不是模型问题，而是检索、工具、权限或 prompt 问题。

### 误区 4：模型升级不需要回归

模型升级可能改变格式、工具调用倾向、拒答行为和推理风格。

### 误区 5：路由规则永远不变

路由应该从 trace 和 eval 中学习，定期根据失败率、成本和延迟调整。

## 下一步

继续读：

- [参数调优手册](parameter-tuning-handbook.md)
- [RAG 工程实践](rag-engineering-practice.md)
- [LLM 应用生产化](llmops-production.md)
- [Agent 效果评测框架](agent-evaluation-framework.md)
