# Agent 开发入门

这篇讲“怎么开始做一个 Agent”。

先记住一句话：

> Agent 不是会聊天的模型，而是能围绕目标持续做事的系统。

一个 Agent 通常包含：

- 模型。
- 指令。
- 工具。
- 状态。
- 记忆。
- 运行循环。
- 权限和安全边界。
- 观测和评测。

## Agent 和普通聊天有什么不同

普通聊天更像：

```text
用户问一句
  ↓
模型答一句
```

Agent 更像：

```text
用户给目标
  ↓
Agent 判断需要什么信息
  ↓
调用工具
  ↓
读取工具结果
  ↓
继续判断下一步
  ↓
直到完成任务或遇到阻塞
```

例子：

```text
帮我修复登录接口的 bug，并跑测试。
```

普通聊天模型可能只给建议。

Agent 应该能：

- 查相关文件。
- 阅读代码。
- 定位 bug。
- 修改文件。
- 运行测试。
- 根据报错继续修。
- 总结改了什么。

## Agent 的最小结构

一个最小 Agent 可以这样拆：

```text
User Goal
  ↓
Agent Instructions
  ↓
Context Builder
  ↓
LLM Call
  ↓
Tool Router
  ↓
Tool Execution
  ↓
Observation
  ↓
State Update
  ↓
Next LLM Call
```

每一层都有独立职责。

| 模块 | 作用 |
| --- | --- |
| User Goal | 用户真正想完成什么 |
| Agent Instructions | 角色、边界、工作方式 |
| Context Builder | 组装本轮模型需要看的上下文 |
| LLM Call | 调用模型做判断或生成 |
| Tool Router | 判断模型要调用哪个工具 |
| Tool Execution | 真正执行搜索、文件、数据库、API |
| Observation | 把工具结果变成模型可读信息 |
| State Update | 更新任务进度、记忆、日志 |

## Agent Loop

Agent 的核心是 loop。

伪流程：

```text
while not done:
    组装上下文
    调用模型
    如果模型要调用工具:
        执行工具
        把工具结果放回上下文
    否则:
        输出最终答案
        done
```

对应到代码思路：

```python
while True:
    prompt = build_context(state)
    result = call_model(prompt, tools=tools)

    if result.tool_call:
        observation = run_tool(result.tool_call)
        state.add_observation(observation)
        continue

    return result.final_answer
```

这个 loop 是 Agent 和普通一次性 LLM 调用的分水岭。

## Tools

工具是 Agent 接触外部世界的方式。

常见工具：

- 文件读取。
- 文件修改。
- Shell 命令。
- Web 搜索。
- 数据库查询。
- 业务系统 API。
- 向量检索。
- 浏览器操作。

工具设计要包含：

| 字段 | 作用 |
| --- | --- |
| name | 工具名 |
| description | 什么时候用 |
| input_schema | 参数结构 |
| permission | 是否需要审批 |
| output_format | 返回什么格式 |

一个天气工具可以这样理解：

```json
{
  "name": "get_weather",
  "description": "查询指定城市的天气",
  "parameters": {
    "type": "object",
    "properties": {
      "city": {"type": "string"}
    },
    "required": ["city"]
  }
}
```

工具描述越清楚，Agent 越容易选对工具。

## State

Agent 需要状态。

状态不是全部塞给模型，而是系统保存的任务现场。

例如：

```text
当前目标：修复登录接口
已读文件：AuthController.java, LoginService.java
已发现问题：token 过期判断使用了本地时间
已执行工具：grep, unit test
下一步：修改时间比较逻辑并重跑测试
```

状态可以分三类：

| 状态 | 保存什么 |
| --- | --- |
| 短期状态 | 当前任务进度、工具结果、临时假设 |
| 长期记忆 | 用户偏好、项目规则、历史决策 |
| 外部状态 | 文件系统、数据库、工单、网页 |

## Context Builder

Context Builder 是 Agent 产品里非常关键的一层。

它决定：

- 哪些历史消息进入模型。
- 哪些工具结果进入模型。
- 哪些文件片段进入模型。
- 哪些规则进入 system/developer message。
- 哪些信息只作为引用数据，不当作指令。

这就是上下文工程落地的位置。

```text
State + Memory + Tools + User Goal
  ↓
Context Builder
  ↓
HTTP request body
  ↓
LLM
```

如果 Agent 经常乱跑，不一定是模型差，也可能是 Context Builder 把现场组织错了。

## 权限和安全

Agent 能调用工具，就必须有权限边界。

至少要区分：

| 动作 | 建议策略 |
| --- | --- |
| 只读搜索 | 默认允许 |
| 读取项目文件 | 默认允许，但记录日志 |
| 修改文件 | 根据场景允许或审批 |
| 执行 shell | 高风险命令要审批 |
| 联网请求 | 根据产品策略限制 |
| 访问私有数据 | 必须鉴权和审计 |

权限上下文也应该进入模型。

例如：

```text
你可以读取工作区文件。
你不能访问外网。
修改文件前需要说明计划。
```

但最终权限不能只靠 prompt。

真正的安全要由程序和沙箱执行。

## 观测能力

Agent 很难只看最终答案调试。

你需要看到完整轨迹：

```text
用户输入
  ↓
模型输出的动作
  ↓
工具调用
  ↓
工具结果
  ↓
下一次模型调用
  ↓
最终答案
```

这叫 trace。

trace 能帮助你判断：

- 是 prompt 错了。
- 是工具描述错了。
- 是检索结果错了。
- 是模型选错工具。
- 是工具执行失败。
- 是权限策略挡住了。

没有 trace，就很难做 Agent 评测。

## 最小开发路线

第一版 Agent 不要做太大。

建议按这个顺序：

1. 先做一个只会回答的 LLM wrapper。
2. 加一个只读工具，比如搜索文档。
3. 加 Agent loop，让模型能根据工具结果继续回答。
4. 加 state，保存当前任务进度。
5. 加 trace，记录每一步。
6. 加权限边界，限制危险工具。
7. 加 eval dataset，防止改坏。
8. 再考虑多 agent、长期记忆、复杂规划。

## 常见误区

### 误区 1：Agent 等于更长的 prompt

不是。

Agent 是模型、工具、状态、权限、评测组成的系统。

### 误区 2：工具越多越好

不是。

工具越多，模型越容易选错，也越难评测。

先给少量高质量工具。

### 误区 3：先做多 Agent

不建议。

先把单 Agent 的 loop、工具、状态、trace 做清楚，再拆多 Agent。

### 误区 4：只看最终回答

Agent 需要看轨迹。

很多失败不是最终生成失败，而是中间选错工具、查错资料、误解权限。

## 下一步

继续读：

- [Agent 模式与实现](agent-patterns.md)
- [Agent Skills 实现思路](agent-skills-implementation.md)
- [Agent 效果评测框架](agent-evaluation-framework.md)
- [上下文工程入门](context-engineering-beginner.md)
- [LLM API：从 HTTP 到 Transformer](openai-api-beginner.md)
