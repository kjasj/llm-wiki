# Multi-Agent 协作、自进化与记忆系统

这篇回答几个 Agent 产品里最容易变复杂的问题：

```text
多个 Agent 如何协作？
multi-agent 到底是谁在决策？
multi-agent 有哪些架构？
Agent 如何自进化？
怎么防止 Agent 之间 A2A 互相调用停不下来？
通用 Agent 的记忆系统怎么设计？
```

先给一个总判断：

> Multi-Agent 的核心不是“多几个模型角色聊天”，而是任务分解、责任边界、状态共享、停止条件和评测闭环。

如果没有这些，多 Agent 很容易变成：

```text
成本更高
延迟更长
互相甩锅
循环调用
最终答案更不可控
```

## Multi-Agent 解决什么

单 Agent 像一个通才。

Multi-Agent 更像一个小团队。

它适合解决：

- 任务很复杂，一个 Agent 很难同时做好规划、执行、审查。
- 能力差异明显，比如搜索、代码、数据分析、写作、测试。
- 需要互相校验，比如生成者和评审者分离。
- 任务可以并行，比如同时调研多个资料源。
- 需要权限隔离，比如只让某个 Agent 能访问生产数据。
- 需要跨系统协作，比如企业里不同平台的 Agent 互相委托。

但不要一上来就 multi-agent。

更推荐顺序是：

```text
单 Agent + 工具
  ↓
Router / Handoff
  ↓
Supervisor + 专家 Agent
  ↓
Graph / Workflow multi-agent
  ↓
跨系统 A2A 协作
```

## Multi-Agent 到底是谁在决策

Multi-Agent 里有很多“决策点”。

不要只问：

```text
哪个 Agent 决策？
```

要拆成：

| 决策点 | 决策内容 | 常见决策者 |
| --- | --- | --- |
| 任务是否需要拆分 | 单 Agent 做还是多 Agent 做 | Router / Supervisor |
| 分给谁 | 哪个专家 Agent 处理 | Supervisor / Planner |
| 下一步做什么 | 搜索、写代码、测试、总结 | 当前执行 Agent |
| 是否需要协作 | 要不要请求别的 Agent | 当前 Agent 或 Supervisor |
| 结果是否合格 | 是否通过验收 | Critic / Evaluator / 程序 grader |
| 是否继续 | 继续循环还是停止 | Supervisor / Runtime |
| 是否写入记忆 | 经验是否沉淀 | Memory Manager / Evaluator |

所以 multi-agent 的决策不是一个点，而是一条链。

```text
User Goal
  ↓
Router 判断任务类型
  ↓
Planner 拆任务
  ↓
Supervisor 分配任务
  ↓
Worker 执行
  ↓
Critic / Evaluator 检查
  ↓
Supervisor 决定继续、重试、合并或停止
```

真正成熟的系统里，最重要的决策通常不完全交给模型。

应该是：

```text
模型做语义判断
程序做边界控制
评测做质量裁决
权限系统做安全兜底
```

## 常见 Multi-Agent 架构

### 1. Router / Handoff

这是最简单、最推荐的起点。

```text
入口 Agent
  ↓
根据任务路由给一个专家
  ↓
专家完成后返回
```

例子：

```text
用户：帮我分析这段 SQL 为什么慢。
Router：这是数据库性能任务。
Handoff -> DBA Agent
DBA Agent：查看执行计划、索引、慢查询日志，给优化建议。
```

优点：

- 简单。
- 成本可控。
- 容易调试。

缺点：

- 路由错了后面就容易全错。
- 不适合需要多个专家同时协作的任务。

适合：

- 客服意图分流。
- 企业助手。
- IDE 中按任务类型分给代码、测试、文档 Agent。

### 2. Supervisor + Workers

这是最常见的多 Agent 架构。

```text
Supervisor
  ├── Research Agent
  ├── Coding Agent
  ├── Test Agent
  └── Writer Agent
```

Supervisor 负责：

- 理解目标。
- 拆任务。
- 分配任务。
- 收集结果。
- 判断是否重试。
- 生成最终答案。

Worker 负责：

- 做自己擅长的一类任务。
- 不直接控制全局流程。

优点：

- 职责清楚。
- 容易加权限。
- 容易加停止条件。

缺点：

- Supervisor 会成为瓶颈。
- Supervisor prompt 和状态设计很关键。

适合：

- 研究报告。
- 代码修复。
- 数据分析。
- 企业流程自动化。

### 3. Hierarchical Multi-Agent

当 Agent 数量变多时，可以分层。

```text
Global Supervisor
  ├── Engineering Supervisor
  │   ├── Backend Agent
  │   └── Test Agent
  ├── Research Supervisor
  │   ├── Search Agent
  │   └── Source Checker
  └── Writing Supervisor
      ├── Outline Agent
      └── Editor Agent
```

优点：

- 能管理更复杂任务。
- 每层只看自己相关状态。

缺点：

- 状态同步更复杂。
- 任务边界不清时容易踢皮球。
- 成本和延迟上升。

适合：

- 大型企业工作流。
- 长周期自动化任务。
- 多部门协作类 Agent。

### 4. Blackboard / Shared Workspace

Blackboard 架构像一个共享白板。

```text
Shared Workspace
  ↑       ↑       ↑
Agent A Agent B Agent C
```

每个 Agent 不一定直接互相聊天，而是：

- 读取共享状态。
- 写入自己的发现。
- 订阅自己关心的事件。
- 由调度器决定谁下一步行动。

例子：

```text
Research Agent 写入资料
Data Agent 写入统计
Critic Agent 写入风险
Writer Agent 读取这些材料写报告
```

优点：

- 不需要所有 Agent 互相通信。
- 适合异步协作。
- 状态可审计。

缺点：

- 需要设计共享状态 schema。
- 写入冲突和信息污染要处理。

适合：

- 多人协作式任务。
- 长任务。
- 异步 Agent 系统。

### 5. Debate / Critic / Review

这种架构不是为了分工，而是为了提高质量。

```text
Generator
  ↓
Critic
  ↓
Reviser
  ↓
Evaluator
```

例子：

```text
Coder 写补丁
Reviewer 找 bug
Coder 修改
Test Agent 跑测试
Evaluator 判断是否完成
```

优点：

- 能降低明显错误。
- 适合代码、法律、报告等高风险输出。

缺点：

- 成本更高。
- Critic 也可能误判。
- 没有客观测试时容易变成空谈。

适合：

- 代码生成。
- 文档审查。
- 安全审查。
- 高价值业务输出。

### 6. Graph / Workflow Agent

生产系统里，最稳的不是全自由聊天，而是图或状态机。

```text
Start
  ↓
Classify
  ↓
Plan
  ↓
Execute
  ↓
Review
  ↓
Done / Retry / Human
```

每个节点可以是一个 Agent。

边上有明确条件：

```text
if review_pass:
    done
elif retry_count < 2:
    execute_again
else:
    ask_human
```

优点：

- 可控。
- 可观测。
- 容易加停止条件。
- 适合生产。

缺点：

- 灵活性弱于自由对话。
- 需要提前设计流程。

适合：

- 企业流程。
- 工单自动化。
- 审批流。
- 代码修复流水线。

### 7. Swarm / Peer-to-Peer

Swarm 架构里 Agent 之间更平等。

```text
Agent A ↔ Agent B ↔ Agent C
```

每个 Agent 可以互相请求帮助。

优点：

- 灵活。
- 适合探索。
- 适合研究实验。

缺点：

- 最容易循环。
- 最难做责任归属。
- 最难控制成本。

如果没有很强的 runtime 控制，不建议新手从这里开始。

## 一个推荐的通用架构

如果你要做一个通用 Agent 产品，我更推荐从这个架构开始：

```text
User
  ↓
Entry Agent / Router
  ↓
Task Manager
  ↓
Planner
  ↓
Supervisor
  ├── Specialist Agents
  ├── Tools / MCP
  ├── Memory Manager
  └── Evaluator
  ↓
Response Composer
```

核心模块：

| 模块 | 作用 |
| --- | --- |
| Entry Agent | 理解用户意图，判断任务类型 |
| Task Manager | 创建 task id、预算、状态、取消信号 |
| Planner | 拆任务和依赖 |
| Supervisor | 分派任务、合并结果、控制继续或停止 |
| Specialist Agents | 专家执行者 |
| Tool Runtime | 真正执行工具和权限控制 |
| Memory Manager | 读写记忆，不让所有 Agent 随便写 |
| Evaluator | 判断结果质量 |
| Response Composer | 面向用户整理最终输出 |

这里有个关键设计：

> Agent 可以建议，Runtime 必须裁决。

不要让任意 Agent 自由创建无限子 Agent、无限 A2A 调用、无限工具调用。

## A2A 和 MCP 的区别

这两个词容易混。

| 协议 / 概念 | 解决什么 |
| --- | --- |
| Tool Calling | 模型调用当前应用提供的工具 |
| MCP | 标准化 Agent / 模型应用如何连接外部工具、数据和资源 |
| A2A | 标准化 Agent 和 Agent 之间如何发现、委托、协作和返回结果 |

可以这样理解：

```text
MCP：Agent 调工具
A2A：Agent 找另一个 Agent 帮忙
```

例子：

```text
代码 Agent 通过 MCP 调用 git、测试、文件工具。
代码 Agent 通过 A2A 把安全审查委托给 Security Agent。
```

## 如何防止 Multi-Agent / A2A 停不下来

这是工程里非常重要的问题。

多 Agent 停不下来，通常有几类原因：

| 原因 | 表现 |
| --- | --- |
| 目标不清 | Agent 一直补充、扩展、反思 |
| 没有预算 | 无限调用工具或其他 Agent |
| 没有 owner | 每个 Agent 都觉得别人还要继续 |
| 没有终止协议 | 不知道什么叫完成 |
| 环路调用 | A 找 B，B 又找 A |
| 失败重试无上限 | 一直 retry |
| 评价标准模糊 | Critic 永远觉得还能改 |

### 1. 给每个任务设置预算

每个任务创建时就要有预算。

```json
{
  "task_id": "task_123",
  "max_steps": 20,
  "max_agent_calls": 8,
  "max_tool_calls": 30,
  "max_wall_time_seconds": 300,
  "max_tokens": 100000,
  "max_cost_usd": 2.0
}
```

预算不是写给模型看的装饰。

Runtime 必须强制执行。

### 2. 设置 hop count / TTL

A2A 调用必须带 hop count。

```json
{
  "task_id": "task_123",
  "from": "research_agent",
  "to": "source_checker",
  "hop_count": 2,
  "max_hops": 4
}
```

超过 `max_hops`：

```text
禁止继续委托
返回当前最佳结果
```

这和网络里的 TTL 很像。

### 3. 禁止无约束回调

不要允许：

```text
Agent A -> Agent B -> Agent A -> Agent B ...
```

可以维护调用栈：

```text
call_stack = [A, B]
```

如果 B 想再调用 A，需要判断：

- 是否形成循环。
- 是否有新的输入。
- 是否经过 Supervisor 批准。
- 是否仍在预算内。

默认策略：

```text
Worker 不能直接反向调用 parent
只能把问题返回 Supervisor
```

### 4. 所有委托都要有 contract

A2A 请求不能只写：

```text
帮我看看这个。
```

应该写成 contract：

```json
{
  "goal": "检查这份回答是否有事实错误",
  "input_refs": ["draft_001", "sources_001"],
  "expected_output": "列出最多 5 个问题，或返回 PASS",
  "deadline": "60s",
  "allowed_actions": ["read_shared_workspace"],
  "forbidden_actions": ["call_other_agents", "modify_files"],
  "done_condition": "返回 PASS 或 findings"
}
```

重点是：

- 输入明确。
- 输出明确。
- 权限明确。
- 截止时间明确。
- 完成条件明确。

### 5. 用状态机控制生命周期

任务状态应该有限。

```text
CREATED
PLANNED
RUNNING
WAITING_AGENT
WAITING_TOOL
REVIEWING
DONE
FAILED
CANCELLED
ESCALATED
```

禁止 Agent 自己发明状态。

每次状态转换要有规则。

例子：

```text
RUNNING -> WAITING_AGENT：必须创建 delegation contract
WAITING_AGENT -> REVIEWING：必须收到 result artifact
REVIEWING -> DONE：必须通过 evaluator
REVIEWING -> RUNNING：retry_count < max_retry
```

### 6. Critic 要有限度

Critic 很容易导致无限修改。

应该限制：

```text
最多 2 轮 revision
每轮最多 5 个问题
只报告会影响任务目标的问题
不能提出无限优化建议
```

Critic 输出也要结构化：

```json
{
  "verdict": "pass | revise | fail",
  "blocking_issues": [],
  "non_blocking_suggestions": [],
  "confidence": 0.82
}
```

只有 `blocking_issues` 才能触发重做。

### 7. 加 circuit breaker

当系统发现异常模式，自动熔断。

触发条件：

- 同两个 Agent 反复互调。
- 同一工具连续失败。
- token 消耗过快。
- 没有新增信息但继续调用。
- 多次 revision 后分数不升。
- 超过 wall time。

熔断后：

```text
停止自动循环
返回当前状态
请求用户或人工确认
```

## Agent 如何自进化

先说我的判断：

> Agent 自进化的重点不是让 Agent 随便改自己的 prompt，而是建立可靠的反馈闭环。

自进化至少包括四层。

### 1. 结果层：知道自己做得好不好

没有 eval，就没有进化。

需要保存：

- 用户目标。
- trace。
- 工具调用。
- 最终答案。
- 用户反馈。
- 自动评分。
- 人工评分。
- 失败原因。

例子：

```text
任务：修复登录 bug
结果：测试未通过
失败原因：没有运行 AuthServiceTest
改进点：代码任务必须先定位相关测试，再运行测试
```

### 2. 记忆层：把经验沉淀下来

不是所有失败都写入长期记忆。

应该先经过评估：

```text
这条经验是否可复用？
是否和已有记忆冲突？
是否有证据？
是否过期？
是否只适用于某个项目？
```

可写入：

- 用户偏好。
- 项目规则。
- 常见失败模式。
- 成功工作流。
- 工具使用经验。
- 测试命令。
- API 约束。

### 3. Skill 层：把重复经验变成流程

如果某类任务反复出现，就不要只靠记忆。

应该沉淀成 skill。

```text
多次代码 review 都发现同类问题
  ↓
生成 code-review skill 的检查清单
  ↓
下次 review 自动加载
```

Skill 比普通记忆更结构化：

- 什么时候用。
- 步骤是什么。
- 调哪些工具。
- 输出什么格式。
- 怎么验证。

### 4. 策略层：改 prompt、工具、路由和流程

自进化最终可能改：

- system prompt。
- developer prompt。
- tool description。
- tool schema。
- routing policy。
- memory retrieval policy。
- eval dataset。
- skill workflow。
- workflow graph。

但生产系统里不要让 Agent 直接改线上策略。

建议流程：

```text
线上 trace
  ↓
失败聚类
  ↓
生成改进建议
  ↓
离线 eval 验证
  ↓
人工审核
  ↓
灰度发布
  ↓
监控回滚
```

这才是可靠的自进化。

## 自进化系统的关键模块

一个可进化 Agent 系统可以这样设计：

```text
Runtime Trace
  ↓
Evaluator
  ↓
Failure Analyzer
  ↓
Memory Writer
  ↓
Skill Builder
  ↓
Prompt / Policy Proposal
  ↓
Offline Eval
  ↓
Human Review
  ↓
Versioned Release
```

每个模块职责：

| 模块 | 作用 |
| --- | --- |
| Trace Store | 保存完整过程 |
| Evaluator | 给成功/失败和分数 |
| Failure Analyzer | 归因失败原因 |
| Memory Writer | 写入可复用经验 |
| Skill Builder | 把经验变成可执行流程 |
| Prompt Optimizer | 提出 prompt 改动 |
| Policy Optimizer | 提出路由、工具、权限改动 |
| Eval Runner | 验证改动是否真的变好 |
| Release Manager | 版本、灰度、回滚 |

这里最关键的是：

```text
所有进化都要可回滚
所有进化都要经过 eval
所有进化都要有版本
```

## 通用 Agent 记忆系统怎么设计

记忆不是把聊天记录全部塞进向量库。

一个通用 Agent 的记忆要分层。

### 记忆类型

| 类型 | 保存什么 | 例子 |
| --- | --- | --- |
| Working Memory | 当前任务临时状态 | 当前计划、已读文件、工具结果 |
| Episodic Memory | 历史事件 | 上次帮用户部署 vLLM 的过程 |
| Semantic Memory | 稳定事实 | 项目使用 Java 21，数据库是 PostgreSQL |
| Procedural Memory | 做事流程 | 代码修复要先跑相关测试 |
| Preference Memory | 用户偏好 | 用户喜欢中文、喜欢详细例子 |
| Policy Memory | 规则和边界 | 生产库只读，删除操作必须确认 |
| Skill Memory | 可复用能力 | `code-review`、`pdf-extraction` skill |

不同记忆的生命周期不同。

```text
Working Memory：任务结束可清理
Preference Memory：长期保留，但用户可修改
Policy Memory：高优先级，必须审计
Procedural Memory：经 eval 验证后沉淀
```

### 推荐架构

```text
Agent Runtime
  ↓
Memory Gateway
  ├── Short-term Store
  ├── Vector Store
  ├── Relational Store
  ├── Document Store
  └── Skill Registry
```

不要让 Agent 直接写数据库。

中间要有 Memory Gateway。

它负责：

- 鉴权。
- 去重。
- 冲突检测。
- 重要性评分。
- 过期策略。
- 隐私过滤。
- provenance 记录。
- 召回和排序。

### 记忆数据结构

一条记忆可以这样设计：

```json
{
  "memory_id": "mem_123",
  "type": "procedural",
  "scope": "project",
  "subject": "Java tests",
  "content": "修改 AuthService 后需要运行 AuthServiceTest。",
  "evidence": ["trace_2026_06_21_001"],
  "source": "eval_failure_analysis",
  "confidence": 0.86,
  "created_at": "2026-06-21T10:00:00+08:00",
  "updated_at": "2026-06-21T10:00:00+08:00",
  "expires_at": null,
  "access_policy": {
    "users": ["user_1"],
    "projects": ["project_a"],
    "agents": ["coding_agent"]
  },
  "status": "active"
}
```

关键字段：

| 字段 | 为什么重要 |
| --- | --- |
| `type` | 决定如何使用 |
| `scope` | 防止把项目规则误用于全局 |
| `evidence` | 记忆要有来源 |
| `confidence` | 低置信度不要强注入 |
| `expires_at` | 防止过期事实长期污染 |
| `access_policy` | 控制谁能读 |
| `status` | 支持禁用和回滚 |

### 记忆写入策略

不要每轮都写长期记忆。

推荐写入流程：

```text
Candidate Memory
  ↓
过滤敏感信息
  ↓
判断是否可复用
  ↓
查重和冲突检测
  ↓
打 scope 和 confidence
  ↓
必要时请求用户确认
  ↓
写入
```

适合写入：

- 用户明确偏好。
- 项目稳定规则。
- 经过验证的成功流程。
- 重复出现的失败原因。
- 工具或环境约束。

不适合写入：

- 一次性聊天内容。
- 未验证猜测。
- 敏感信息。
- 过期状态。
- 被 prompt injection 影响的内容。

### 记忆读取策略

读记忆也要控制。

一次请求不能把所有记忆都塞进上下文。

推荐：

```text
先按 scope 过滤
  ↓
按任务语义召回
  ↓
按 recency / confidence / evidence 排序
  ↓
去重
  ↓
压缩成上下文
```

注入上下文时要区分：

```text
用户偏好：可以作为偏好
项目规则：作为约束
历史事件：作为参考
外部文档：作为证据
```

不要把所有记忆都写成 system 级指令。

否则低质量记忆会污染高优先级规则。

### 记忆冲突怎么处理

例子：

```text
旧记忆：项目使用 Java 17。
新记忆：项目已升级到 Java 21。
```

不能简单都召回。

应该：

- 标记冲突。
- 比较时间。
- 比较证据来源。
- 必要时请求确认。
- 旧记忆改成 superseded。

记忆状态可以有：

```text
active
superseded
deprecated
deleted
needs_review
```

### 记忆和权限

记忆系统必须考虑权限。

尤其是企业 Agent。

问题包括：

- A 用户的记忆不能泄露给 B 用户。
- 项目 A 的规则不能误用于项目 B。
- 生产环境信息不能注入到低权限 Agent。
- 被删除的记忆不能继续被向量库召回。

所以不要只靠向量库。

向量库适合相似检索。

权限、版本、删除、审计更适合结构化数据库配合管理。

## Multi-Agent 和记忆怎么结合

多 Agent 系统不要让每个 Agent 都自由写长期记忆。

更好的方式：

```text
Worker Agent 产生 memory candidate
  ↓
Memory Manager 审核、归并、打标签
  ↓
Evaluator 判断是否有证据
  ↓
写入 Memory Store
```

读取也要分角色：

| Agent | 可读记忆 |
| --- | --- |
| Router | 用户偏好、任务分类历史 |
| Planner | 成功流程、项目规则 |
| Coding Agent | 代码库规则、测试命令、历史 bug |
| Critic Agent | 质量标准、失败模式 |
| Writer Agent | 用户风格偏好、输出格式 |

不要所有 Agent 共享所有记忆。

这会导致：

- 上下文膨胀。
- 信息污染。
- 权限泄漏。
- Agent 互相强化错误经验。

## 一个完整例子：代码修复 Multi-Agent

用户：

```text
修复登录 token 过期判断 bug，并跑测试。
```

流程：

```text
Entry Agent
  ↓
Router: code_fix
  ↓
Planner:
    1. 定位认证相关代码
    2. 查相关测试
    3. 修改逻辑
    4. 跑测试
    5. 总结
  ↓
Supervisor
  ├── Code Search Agent: 找 AuthService / AuthServiceTest
  ├── Coding Agent: 修改代码
  ├── Test Agent: 运行 AuthServiceTest
  └── Review Agent: 检查 diff 和测试结果
  ↓
Evaluator:
    tests_passed = true
    diff_scope_ok = true
  ↓
Memory Manager:
    发现项目规则：认证相关改动必须跑 AuthServiceTest
    写入 project procedural memory
  ↓
Final Response
```

注意停止条件：

```text
测试通过
diff 范围合理
review 无 blocking issue
或达到 retry 上限
```

不是让几个 Agent 一直讨论“还可以怎么优化”。

## 设计 checklist

做 multi-agent 前，先问这些问题：

- 是否真的需要多个 Agent，还是一个 Agent 加工具就够？
- 每个 Agent 的职责边界是什么？
- 谁是任务 owner？
- 谁能创建子任务？
- 谁能调用其他 Agent？
- 每次委托的输入、输出、权限、截止时间是什么？
- 任务预算是多少？
- 最大 hop count 是多少？
- 什么条件算完成？
- 什么情况必须停下来问用户？
- trace 如何保存？
- 失败如何归因？
- 什么经验能写入记忆？
- 记忆如何删除、过期、审计？
- 每次自进化如何 eval 和回滚？

## 我的设计建议

如果要做一个通用 Agent 产品，我建议优先抓四件事。

第一，强 Runtime。

```text
预算、权限、状态机、取消、审计、熔断
```

第二，强 Context Builder。

```text
不同 Agent 看到不同上下文
记忆按 scope 注入
工具和权限明确注入
```

第三，强 Evaluator。

```text
没有评价信号，就没有可靠自进化
```

第四，强 Memory Manager。

```text
记忆必须可溯源、可删除、可冲突处理、可权限控制
```

我不建议一开始追求“Agent 自己改自己，越跑越聪明”。

更可靠的路线是：

```text
先让 Agent 可观测
再让失败可归因
再让经验可沉淀
再让改动可评测
最后才谈自动优化
```

## 下一步

继续读：

- [大型 Agent 系统架构设计](large-agent-system-architecture.md)
- [Agent 开发入门](agent-development-beginner.md)
- [Agent 模式与实现](agent-patterns.md)
- [Agent Skills 实现思路](agent-skills-implementation.md)
- [Agent 效果评测框架](agent-evaluation-framework.md)
- [上下文工程入门](context-engineering-beginner.md)

## 参考资料

- [LangGraph Multi-Agent Supervisor](https://reference.langchain.com/python/langgraph-supervisor)
- [AutoGen Multi-agent Conversation Framework](https://microsoft.github.io/autogen/0.2/docs/Use-Cases/agent_chat/)
- [Microsoft Agent Framework Overview](https://learn.microsoft.com/en-us/agent-framework/overview/)
- [CrewAI Documentation](https://docs.crewai.com/)
- [Agent2Agent Protocol GitHub](https://github.com/a2aproject/A2A)
- [Google: Announcing the Agent2Agent Protocol](https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/)
- [Model Context Protocol introduction](https://modelcontextprotocol.io/docs/getting-started/intro)
- [Anthropic: Introducing the Model Context Protocol](https://www.anthropic.com/news/model-context-protocol)
