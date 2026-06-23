# LLM 应用生产化：从 Demo 到可运营系统

LLM 应用上线后，问题通常不再是“能不能回答”，而是：

- 质量是否稳定。
- 成本是否可控。
- 延迟是否可接受。
- 失败能否定位。
- 版本能否回滚。
- 权限和数据是否安全。

这篇回答一个工程问题：

> 一个 LLM 应用从 demo 走到生产，需要补哪些工程层？

## 生产化总图

```text
Client
  ↓
API Gateway
  ↓
Application Orchestrator
  ↓
Context Builder
  ↓
Model Gateway
  ↓
Provider / Local Serving

旁路：
Trace Store
Eval Pipeline
Cost Monitor
Prompt Registry
Policy Engine
Feedback Loop
```

如果是 Agent，还要加：

```text
Tool Runtime
Sandbox
Approval Flow
State Store
Memory Service
```

## 生产系统和 Demo 的区别

| Demo | 生产系统 |
| --- | --- |
| 一个 prompt | prompt 版本化 |
| 直接调用模型 | Model Gateway |
| 手动看效果 | eval dataset + 自动回归 |
| 出错重试一下 | 分类重试、fallback、超时预算 |
| 没有日志 | trace、指标、成本、审计 |
| 单用户 | 多租户、限流、权限 |
| 靠感觉调参 | 实验记录和灰度 |

Demo 可以快，生产系统要可解释、可回滚、可持续运营。

## API Gateway

API Gateway 处理模型无关的入口问题：

- 鉴权。
- 租户识别。
- 限流。
- 请求大小限制。
- 幂等键。
- 审计日志。
- 基础 WAF 和安全过滤。

不要把这些逻辑塞进 prompt。入口层能确定的事情，应该由程序确定。

## Model Gateway

Model Gateway 处理模型供应和路由：

- provider 适配。
- OpenAI-compatible 接口统一。
- 模型别名。
- fallback。
- 重试。
- 成本统计。
- provider 健康检查。
- A/B test。

应用不应该散落调用不同 provider SDK。

推荐调用方式：

```json
{
  "logical_model": "rag-answer",
  "task": "policy_qa",
  "tenant": "enterprise_a",
  "input_tokens_estimate": 3200,
  "latency_budget_ms": 8000
}
```

网关再决定真实模型和参数。

## Prompt Registry

prompt 不是临时字符串，而是工程资产。

每个 prompt 应该记录：

| 字段 | 作用 |
| --- | --- |
| `id` | 稳定标识 |
| `version` | 可回滚 |
| `owner` | 负责人 |
| `task` | 适用任务 |
| `model_family` | 适配模型 |
| `inputs_schema` | 输入变量 |
| `output_schema` | 输出契约 |
| `eval_set` | 回归测试 |
| `changelog` | 修改原因 |

上线时不要只说“改了 prompt”。要能回答：

- 改了哪个 prompt。
- 为什么改。
- 影响哪些任务。
- 跑了哪些 eval。
- 是否灰度。
- 如何回滚。

## Context Builder

Context Builder 决定模型这一轮看到什么。

它负责：

- 系统规则。
- 用户输入。
- 对话历史。
- RAG 资料。
- 工具 schema。
- 权限状态。
- memory。
- 当前任务状态。
- 压缩摘要。

生产系统要记录最终发给模型的上下文版本，但要注意隐私脱敏。

对于 Agent，Context Builder 是核心能力，详见 [上下文工程](context-engineering.md)。

## Trace Store

没有 trace，就没有可运营的 LLM 应用。

最小 trace 包含：

| 字段 | 说明 |
| --- | --- |
| request id | 一次请求的唯一标识 |
| user / tenant | 用户和租户 |
| task type | 任务分类 |
| model | 模型和版本 |
| prompt version | prompt 版本 |
| input / output token | token 用量 |
| latency | 耗时 |
| cost | 成本 |
| retrieval sources | RAG 使用的 source id |
| tool calls | 工具调用 |
| final answer | 最终输出 |
| error | 错误信息 |

Agent trace 还要记录每一步：

```text
step id
thought summary
tool call
tool result
state update
approval decision
stop reason
```

trace 不是为了“监控好看”，而是为了失败归因、回归测试和成本优化。

## 指标体系

指标至少分四类。

### 质量指标

- 任务完成率。
- eval pass rate。
- faithfulness。
- citation accuracy。
- schema validity。
- 人工满意度。

### 性能指标

- TTFT。
- 总耗时。
- P50 / P95 / P99。
- timeout rate。
- retry rate。

### 成本指标

- input token。
- output token。
- reasoning token。
- retrieval / rerank 成本。
- tool 成本。
- cost per task。

### 安全指标

- blocked tool calls。
- approval required rate。
- approval denied rate。
- prompt injection hits。
- data access violations。

## Eval Pipeline

生产化不能只靠人工试用。

最小 eval pipeline：

```text
收集真实问题
  ↓
标注 expected behavior
  ↓
离线跑当前版本
  ↓
离线跑候选版本
  ↓
比较质量、成本、延迟
  ↓
灰度
  ↓
线上采样复核
```

每次改这些东西都要回归：

- 模型。
- prompt。
- 工具 schema。
- RAG 数据源。
- chunk 策略。
- reranker。
- 路由规则。
- 安全策略。

评测细节见 [Agent 效果评测框架](agent-evaluation-framework.md)。

## 灰度和回滚

LLM 应用的版本不只是代码版本。

可能变化的对象：

- 模型版本。
- prompt 版本。
- 参数。
- RAG 索引。
- 工具 schema。
- policy。
- 路由规则。
- memory 写入策略。

推荐每次发布生成一个 release bundle：

```json
{
  "release_id": "2026-06-23-rag-answer-v3",
  "model": "rag-answer@2026-06-20",
  "prompt": "policy_qa@v12",
  "retrieval_index": "policy_docs@2026-06-22",
  "reranker": "rerank@v2",
  "routing": "default@v5",
  "policy": "tool_policy@v9"
}
```

这样线上事故发生时，才能快速回滚到上一组组合。

## 成本控制

常见成本来源：

- 长对话历史。
- RAG 塞太多 chunk。
- reasoning budget 过高。
- Agent loop 太长。
- 工具失败导致重试。
- 没有缓存。
- 用强模型处理简单任务。

常见优化：

| 问题 | 优化 |
| --- | --- |
| 输入太长 | 压缩历史、减少 chunk、prefix cache |
| 输出太长 | 限制 `max_output_tokens`、要求先结论 |
| 简单任务太贵 | 小模型路由 |
| RAG 成本高 | hybrid search 后 rerank top_n |
| Agent 成本高 | max steps、stop condition、workflow 化 |
| 重复请求 | 结果缓存、prompt cache |

## 安全和权限

生产系统至少要有：

- 用户鉴权。
- 租户隔离。
- 数据权限过滤。
- 工具权限。
- 高风险动作审批。
- 审计日志。
- prompt injection 防护。
- 输出脱敏。

不要依赖模型“自己遵守权限”。权限必须在运行时和数据层生效。

## 一个上线检查清单

上线前检查：

- 是否有 eval set。
- 是否记录 trace。
- 是否有 prompt / model / RAG 版本。
- 是否有 fallback。
- 是否有超时和成本预算。
- 是否有权限过滤。
- 是否有灰度和回滚方案。
- 是否有错误分类。
- 是否有人工反馈入口。
- 是否能按 request id 复盘。

## 常见误区

### 误区 1：上线就是部署一个模型

模型只是生产系统的一层。上下文、权限、评测、监控和回滚同样重要。

### 误区 2：prompt 改动不用版本化

prompt 改动可能比代码改动影响更大。

### 误区 3：只监控错误率

LLM 应用很多失败不是 500，而是“看起来正常但答错了”。

### 误区 4：只看平均延迟

用户感受更接近 P95 / P99，尤其是 streaming、RAG 和 Agent 场景。

### 误区 5：没有回滚也敢灰度

LLM 应用的回滚要覆盖模型、prompt、RAG 索引、工具 schema 和路由规则。

## 下一步

继续读：

- [模型选择与路由](model-selection-routing.md)
- [RAG 工程实践](rag-engineering-practice.md)
- [大型 Agent 系统架构设计](large-agent-system-architecture.md)
- [Agent 安全与 Guardrails](agent-security-guardrails.md)
