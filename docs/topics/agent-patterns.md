# Agent 模式与实现

这篇整理常见 Agent 模式。

你提到的：

- ReAct 模式。
- Plan 模式。

都是 Agent 设计里的核心模式。

但现在主流工程里还会遇到：

- Plan-and-Execute。
- ReWOO。
- LLMCompiler。
- Reflexion。
- Tree of Thoughts。
- CodeAct。
- RAG Agent。
- Router / Handoff。
- Multi-Agent。
- Graph / Workflow Agent。
- Memory / Skill Library。

先记住一句话：

> Agent 模式不是模型结构，而是“模型、工具、状态和控制流”的组织方式。

## 先看一张总表

| 模式 | 核心思想 | 适合场景 | 主要代价 |
| --- | --- | --- | --- |
| ReAct | reasoning 和 action 交替进行 | 工具问答、搜索、简单任务执行 | 多轮调用，成本和延迟高 |
| Plan-and-Execute | 先规划，再逐步执行 | 长任务、复杂目标 | 计划可能过时，需要重规划 |
| ReWOO | 先生成推理计划和工具占位，再批量执行工具 | 多步查询、减少重复 prompt | 对计划质量依赖高 |
| LLMCompiler | 把任务编译成可并行执行的 DAG | 多工具、多依赖、高性能执行 | 实现复杂 |
| Reflexion | 失败后反思，把经验写入记忆 | 可重试任务、代码、游戏、长任务 | 需要可靠反馈信号 |
| Tree of Thoughts | 探索多条推理路径并选择 | 搜索型问题、规划、谜题 | 调用次数多 |
| CodeAct | 用可执行代码作为动作空间 | 编程、数据分析、API 编排 | 需要沙箱和权限控制 |
| RAG Agent | 检索资料后回答或行动 | 知识问答、企业文档 | 检索质量决定上限 |
| Router / Handoff | 根据任务路由给工具或专家 | 多能力系统、客服、企业助手 | 路由错会导致全链路错 |
| Multi-Agent | 多个角色协作 | 复杂任务、评审、分工 | 通信成本和状态管理复杂 |
| Graph / Workflow | 用图或状态机约束 Agent 流程 | 生产系统、可控流程 | 灵活性比自由 Agent 低 |
| Memory / Skill Library | 把成功经验沉淀成可复用技能 | 长期学习、代码助手、游戏 Agent | 记忆检索和版本管理复杂 |

Agent 产品化工程继续看：[Harness Engineering：把模型变成可用 Agent 的工程](harness-engineering.md)。

Agent 循环、停止条件和恢复继续看：[Loop Engineering：Agent 循环、停止条件与恢复](loop-engineering.md)。

Multi-Agent、A2A 停止条件、自进化和记忆系统会单独展开，继续看：[Multi-Agent 协作、自进化与记忆系统](multi-agent-collaboration-memory.md)。

## ReAct 模式

ReAct 来自 “Reasoning + Acting”。

它的核心是：

```text
Thought
  ↓
Action
  ↓
Observation
  ↓
Thought
  ↓
Action
  ↓
Observation
  ↓
Final Answer
```

模型不是一次性回答，而是边推理边调用工具。

### 例子

用户问：

```text
OpenAI 最新的模型文档里推荐哪个文本生成接口？
```

ReAct 轨迹可能是：

```text
Thought: 这个问题需要查当前文档。
Action: web_search("OpenAI text generation Responses API recommended")
Observation: 找到 OpenAI 文档。
Thought: 需要确认是否提到 Responses API。
Action: open_doc(...)
Observation: 文档说新项目推荐 Responses API。
Final Answer: 文本生成新项目优先看 Responses API。
```

### 实现伪代码

```python
while True:
    response = llm(messages, tools=tools)

    if response.tool_call:
        result = run_tool(response.tool_call)
        messages.append({
            "role": "tool",
            "content": result,
        })
        continue

    return response.final_answer
```

### 适合什么

ReAct 适合：

- 搜索问答。
- 工具调用。
- 简单代码任务。
- 需要根据观察结果调整下一步的任务。

### 不适合什么

ReAct 不适合：

- 步骤很多的长任务。
- 可以并行执行的多工具任务。
- 对成本和延迟非常敏感的任务。

因为它每一步都要：

```text
LLM -> tool -> LLM -> tool
```

调用次数容易变多。

## Plan-and-Execute 模式

Plan-and-Execute 把规划和执行拆开。

它的核心是：

```text
Planner: 先列计划
  ↓
Executor: 按步骤执行
  ↓
必要时 Replanner 更新计划
```

### 例子

用户说：

```text
帮我调研 vLLM、SGLang、llama.cpp，并写一个对比文档。
```

Planner 可能先生成：

```text
1. 查 vLLM 官方文档。
2. 查 SGLang 官方文档。
3. 查 llama.cpp README。
4. 整理适用场景。
5. 写对比表。
6. 给选择建议。
```

Executor 再逐步执行。

### 实现伪代码

```python
plan = planner(goal)

for step in plan.steps:
    result = executor(step, state)
    state.add(step, result)

    if should_replan(state):
        plan = replanner(goal, state)

return synthesizer(goal, state)
```

### 适合什么

适合：

- 长任务。
- 多步骤研究。
- 代码迁移。
- 文档生成。
- 复杂操作流程。

### 风险

Plan-and-Execute 的风险是：

- 初始计划可能错。
- 环境变化后计划过时。
- 执行器机械执行错误计划。

所以实际实现里经常要加：

```text
replan
checkpoint
human approval
trace
```

## ReWOO 模式

ReWOO 是 Reasoning WithOut Observation。

它和 ReAct 的区别是：

```text
ReAct: 每一步拿到 observation 后再想下一步
ReWOO: 先把推理和工具占位计划写出来，再执行工具
```

### 典型流程

```text
Planner 生成带变量的计划
  ↓
Worker 执行工具调用，填充变量
  ↓
Solver 根据工具结果生成答案
```

例子：

```text
Plan:
E1 = search("vLLM OpenAI compatible server")
E2 = search("SGLang OpenAI compatible API")
E3 = search("llama.cpp server README")
Answer = compare(E1, E2, E3)
```

工具可以按计划执行，最后统一求解。

### 适合什么

适合：

- 多个查询相对独立。
- 想减少 LLM 反复读长 prompt。
- 工具调用成本比模型调用低。

### 风险

不适合强依赖实时观察的任务。

如果第一个工具结果会改变第二步的方向，ReAct 或 Plan-and-Execute 更稳。

## LLMCompiler 模式

LLMCompiler 可以理解成：

> 把自然语言任务编译成可执行任务图。

它不是简单线性计划，而是 DAG：

```text
Task A: 搜索 vLLM
Task B: 搜索 SGLang
Task C: 搜索 llama.cpp
Task D: 对比 A/B/C
```

A、B、C 可以并行。

D 依赖 A、B、C。

### 实现直觉

```python
dag = compiler(goal)

ready_tasks = dag.get_ready_tasks()
run_parallel(ready_tasks)

while not dag.done():
    ready_tasks = dag.get_ready_tasks()
    run_parallel(ready_tasks)

return finalizer(dag.results)
```

### 适合什么

适合：

- 多工具并行。
- 数据依赖明确。
- 对延迟敏感。
- 复杂研究和批处理任务。

### 代价

实现复杂，需要任务图、依赖管理、错误恢复和结果合并。

## Reflexion 模式

Reflexion 的核心是：

> Agent 失败后，用自然语言反思失败原因，并把反思写入记忆，下一次尝试时使用。

它不一定更新模型参数。

它更新的是：

```text
memory / reflection
```

### 流程

```text
执行任务
  ↓
得到反馈：成功 / 失败 / 分数 / 报错
  ↓
生成 reflection
  ↓
保存到 episodic memory
  ↓
下一次尝试时读取 reflection
```

### 例子

代码 Agent 第一次修 bug 失败：

```text
测试失败：AuthServiceTest.testExpiredToken
```

Reflection：

```text
上次失败原因：只修改了 Controller，没有修改 Service 层的 token 过期判断。
下次应该先定位 token validation 逻辑，再改测试覆盖的核心路径。
```

### 适合什么

适合：

- 可重试任务。
- 有明确反馈的任务。
- 编程任务。
- 游戏或环境探索。

### 风险

如果反馈本身不可靠，reflection 会把错误经验写进记忆。

## Tree of Thoughts 模式

Tree of Thoughts，简称 ToT。

它的核心是：

> 不只生成一条推理链，而是探索多条候选思路，再评估和选择。

### 流程

```text
生成多个 thought
  ↓
给每个 thought 打分
  ↓
选择更好的 thought 扩展
  ↓
必要时回溯
  ↓
得到最终答案
```

### 适合什么

适合：

- 谜题。
- 规划。
- 数学。
- 需要搜索的复杂问题。
- 早期选择会严重影响结果的任务。

### 代价

调用次数很多。

生产系统里一般不会默认对所有请求使用 ToT，而是只在高价值复杂任务里启用。

## CodeAct 模式

CodeAct 的核心是：

> 让 Agent 用可执行代码作为动作。

不是让模型输出：

```json
{"tool": "search", "query": "..."}
```

而是让模型输出可执行代码：

```python
docs = search("vLLM OpenAI-compatible server")
summary = summarize(docs)
print(summary)
```

系统在沙箱里执行代码，再把结果返回给模型。

### 适合什么

适合：

- 编程任务。
- 数据分析。
- 多 API 编排。
- 需要循环、条件、变量和中间计算的任务。

### 风险

CodeAct 必须有强沙箱。

要限制：

- 文件系统。
- 网络。
- 进程。
- 环境变量。
- 凭据。
- 执行时间。

## RAG Agent 模式

RAG Agent 是把检索作为核心工具的 Agent。

流程：

```text
用户问题
  ↓
判断是否需要检索
  ↓
生成 query
  ↓
检索文档
  ↓
选择相关片段
  ↓
基于证据回答
```

### 适合什么

适合：

- 企业知识库。
- 文档问答。
- 法规、产品、内部流程。
- 需要引用证据的回答。

### 关键点

RAG Agent 的效果主要取决于：

- query 改写。
- 文档切片。
- rerank。
- context precision。
- context recall。
- answer faithfulness。

如果检索错了，模型再强也容易答错。

## Router / Handoff 模式

Router 模式让一个模型先判断任务类型，再转给不同工具或子 Agent。

```text
用户请求
  ↓
Router
  ↓
代码 Agent / 搜索 Agent / 数据库 Agent / 客服 Agent
```

Handoff 是更明确的移交：

```text
当前 Agent 发现任务属于另一个专家
  ↓
把上下文和控制权交给专家 Agent
```

### 适合什么

适合：

- 多业务线客服。
- 多工具平台。
- 多专家系统。
- 复杂 Agent 产品。

### 风险

路由错了，后面再强也会跑偏。

所以 router 要重点评测：

- 分类准确率。
- 是否该拒答。
- 是否该请求澄清。
- 是否该 handoff。

## Multi-Agent 模式

Multi-Agent 是多个 Agent 协作。

常见形态：

```text
Planner Agent
Executor Agent
Reviewer Agent
Research Agent
Coder Agent
```

### 例子

代码任务：

```text
Planner：拆任务
Coder：改代码
Reviewer：审查风险
Tester：运行测试
Summarizer：写总结
```

### 适合什么

适合：

- 任务很复杂。
- 需要不同专业角色。
- 需要评审和反思。
- 需要并行探索。

### 风险

Multi-Agent 不天然更强。

它会带来：

- 上下文同步问题。
- 成本增加。
- 多 agent 互相污染。
- 责任边界不清。
- 调试困难。

第一版产品一般先做好单 Agent，再拆多 Agent。

## Graph / Workflow Agent

Graph / Workflow Agent 用图或状态机约束流程。

它不像自由 Agent 那样每一步都完全让模型决定。

例子：

```text
Start
  ↓
Classify Intent
  ↓
Retrieve Docs
  ↓
Generate Answer
  ↓
Check Safety
  ↓
Return
```

如果安全检查失败：

```text
Check Safety -> Refuse / Escalate
```

### 适合什么

适合生产系统。

因为它：

- 可控。
- 可观测。
- 易评测。
- 容易插入人工审批。
- 容易做失败恢复。

### 风险

灵活性低一些。

如果任务开放度很高，图会变复杂。

## Memory / Skill Library 模式

这个模式把成功经验沉淀下来。

例如 Voyager 这类长期 Agent 会维护技能库：

```text
任务成功
  ↓
总结可复用技能
  ↓
保存代码或过程
  ↓
下次相似任务检索技能
  ↓
组合技能解决新任务
```

在代码 Agent 里也很常见：

- 记住项目构建命令。
- 记住测试方式。
- 记住用户偏好。
- 记住常见修复路径。

### 风险

记忆不是越多越好。

要处理：

- 过期。
- 冲突。
- 错误经验。
- 隐私。
- 检索噪声。

## 当前主流怎么选

如果你做产品，可以先按这个选择：

| 目标 | 推荐模式 |
| --- | --- |
| 普通工具调用 Agent | ReAct |
| 长任务 | Plan-and-Execute + Replan |
| 企业知识库问答 | RAG Agent + Graph |
| 代码/数据分析 Agent | CodeAct 或 ReAct + Shell/文件工具 |
| 多业务线客服 | Router / Handoff |
| 高可靠生产流程 | Graph / Workflow Agent |
| 复杂研究任务 | Plan-and-Execute、ReWOO、LLMCompiler |
| 需要自我改进 | Reflexion + Eval + Memory |
| 多角色协作 | Multi-Agent，但要谨慎 |

入门建议：

```text
先实现 ReAct
  ↓
加 Plan-and-Execute
  ↓
用 Graph/Workflow 固化生产流程
  ↓
再考虑 Multi-Agent、Reflexion、ReWOO、LLMCompiler
```

## 和评测的关系

不同模式要评不同东西。

| 模式 | 重点评测 |
| --- | --- |
| ReAct | 工具选择、工具参数、是否过度调用 |
| Plan-and-Execute | 计划质量、执行完成率、重规划时机 |
| ReWOO | 计划变量是否正确、工具结果是否正确绑定 |
| Reflexion | reflection 是否真的改善下一次表现 |
| ToT | 候选生成和评分是否靠谱 |
| CodeAct | 代码安全、执行结果、沙箱边界 |
| RAG Agent | 检索准确率、faithfulness、引用质量 |
| Router / Handoff | 路由准确率、handoff 上下文是否完整 |
| Multi-Agent | 角色边界、通信成本、最终贡献 |
| Graph / Workflow | 节点正确率、边条件、失败恢复 |

所以 Agent 模式不是只影响代码结构，也决定了评测框架怎么设计。

## 最小实现顺序

建议这样学：

1. 写一个 ReAct agent。
2. 给它加 trace。
3. 给它加 eval dataset。
4. 把长任务改成 Plan-and-Execute。
5. 把高频稳定流程改成 Graph。
6. 给 RAG、工具调用、路由分别做评测。
7. 最后再尝试 Reflexion、CodeAct、多 Agent。

## 参考资料

- [ReAct paper](https://arxiv.org/abs/2210.03629)
- [Google Research ReAct blog](https://research.google/blog/react-synergizing-reasoning-and-acting-in-language-models/)
- [LangChain Plan-and-Execute](https://www.langchain.com/blog/plan-and-execute-agents)
- [LangChain planning agents: Plan-and-Execute, ReWOO, LLMCompiler](https://www.langchain.com/blog/planning-agents)
- [ReWOO paper](https://arxiv.org/abs/2305.18323)
- [Reflexion paper](https://arxiv.org/abs/2303.11366)
- [Tree of Thoughts paper](https://arxiv.org/abs/2305.10601)
- [CodeAct paper](https://arxiv.org/abs/2402.01030)
- [AutoGen paper](https://arxiv.org/abs/2308.08155)
- [Voyager paper](https://arxiv.org/abs/2305.16291)
