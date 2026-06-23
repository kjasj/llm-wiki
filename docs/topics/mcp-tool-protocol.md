# MCP 工具协议：让 Agent 连接外部系统

MCP 是 Model Context Protocol。

它的目标是给 AI 应用和外部系统之间提供一个标准连接方式。AI 应用可以通过 MCP 访问外部数据、工具和工作流，而不是每个产品都重新发明一套插件协议。

这篇回答一个工程问题：

> MCP、tool calling、plugin、A2A 到底有什么区别？做 Agent 产品时应该如何设计 MCP 集成？

## MCP 解决什么问题

没有 MCP 时，每个 Agent 产品都要自己定义：

- 如何发现工具。
- 工具 schema 怎么描述。
- 工具结果怎么返回。
- 文件、数据库、网页等资源怎么暴露。
- Prompt 模板和工作流怎么复用。
- 连接生命周期怎么管理。
- 权限和用户确认怎么做。

MCP 把这些连接方式标准化。

官方规格里，MCP 用 JSON-RPC 2.0 消息在三类角色之间通信：

| 角色 | 作用 |
| --- | --- |
| Host | LLM 应用本身，如 IDE、桌面助手、聊天应用 |
| Client | Host 内部的连接器，负责和 server 通信 |
| Server | 提供工具、资源或 prompt 的外部服务 |

## MCP 和 Tool Calling 的区别

Tool calling 是模型输出“我要调用某个函数”的能力。

MCP 是应用连接外部工具和上下文的协议。

可以这样理解：

```text
Tool Calling：模型和应用之间的动作格式
MCP：应用和外部工具 / 数据源之间的连接协议
```

一次工具调用可能是：

```text
模型决定调用 search_docs
  ↓
Host 解析 tool call
  ↓
MCP Client 请求 MCP Server
  ↓
Server 查询文档
  ↓
结果返回 Host
  ↓
Host 把 observation 放回模型上下文
```

模型不一定直接知道 MCP 的底层细节。它看到的是经过 Host 整理后的工具描述和工具结果。

## MCP 的三类 Server 能力

MCP server 可以暴露三类能力。

| 能力 | 给谁用 | 直觉 |
| --- | --- | --- |
| Resources | 用户或模型 | 可读取的上下文和数据 |
| Prompts | 用户 | 可复用的模板和工作流入口 |
| Tools | 模型 | 可执行的函数或动作 |

### Resources

Resources 是上下文资料。

例子：

- 文件内容。
- 数据库 schema。
- 当前项目配置。
- Figma 设计节点。
- 日志片段。
- Wiki 页面。

Resources 不等于工具调用。它更像“可读取资料”。

### Prompts

Prompts 是可复用工作流入口。

例子：

- “生成 PR 描述”模板。
- “分析错误日志”模板。
- “根据设计稿生成页面”模板。

它通常由用户选择或 Host 注入，不应该被当作任意代码执行。

### Tools

Tools 是模型可以请求执行的动作。

例子：

- 查询数据库。
- 创建 issue。
- 发送邮件。
- 搜索文档。
- 修改文件。
- 调用内部 API。

Tools 风险最高，因为它们可能读取敏感数据或产生副作用。

## MCP 和 A2A 的区别

MCP 连接工具和数据。

A2A 连接 Agent 和 Agent。

| 对比 | MCP | A2A |
| --- | --- | --- |
| 连接对象 | 工具、资源、数据源 | Agent |
| 核心问题 | 如何调用外部能力 | 如何委托、协作、交接 |
| 典型返回 | 工具结果、资源内容 | 子任务结果、状态、计划 |
| 主要风险 | 权限、数据泄露、副作用 | 循环、职责不清、成本失控 |

复杂系统里两者会同时存在：

```text
Supervisor Agent
  ↓ A2A
Code Agent
  ↓ MCP
GitHub / 文件系统 / CI
```

## MCP 和 Plugin / Skill 的区别

| 概念 | 解决什么 |
| --- | --- |
| MCP | 外部系统连接协议 |
| Plugin | 产品内的扩展包机制 |
| Skill | 给 Agent 按需加载的能力说明和资源包 |
| Tool | 可执行动作 |

一个插件里可以包含 MCP server。

一个 skill 可以告诉 Agent 什么时候使用某个 MCP tool。

一个 MCP server 可以暴露多个 tools、resources 和 prompts。

## 安全边界

MCP 让 Agent 能力变强，也扩大了风险面。

主要风险：

- 工具描述被 prompt injection 污染。
- 用户无权访问的资源被 server 暴露。
- 工具组合导致数据外泄。
- lookalike tool 伪装成可信工具。
- 高风险动作缺少用户确认。
- server 返回内容被当作新指令。

基本原则：

| 原则 | 做法 |
| --- | --- |
| 用户知情 | 明确展示要连接的 server 和可用能力 |
| 最小权限 | 只暴露当前任务需要的 resources 和 tools |
| 工具确认 | 高风险 tool call 必须审批 |
| 结果隔离 | tool result 是数据，不是指令 |
| 审计 | 记录 tool call、参数、结果摘要和用户确认 |
| 可撤销 | 支持禁用 server、撤销 token、回滚配置 |

这和 [Agent 安全与 Guardrails](agent-security-guardrails.md) 的原则一致。

## MCP Host 该做什么

Host 不是简单转发器。

它应该负责：

- 管理 MCP server 连接。
- 做 server allowlist。
- 展示能力给用户确认。
- 把 MCP tools 转成模型可理解的工具 schema。
- 对 tool call 做权限判断。
- 对资源访问做租户和路径限制。
- 把 tool result 包装成不可信 observation。
- 记录 trace。
- 处理超时、取消、错误和重试。

不要把所有 MCP server 暴露的能力一次性塞进模型上下文。要按任务和权限做渐进披露。

## MCP Server 该做什么

Server 应该把能力描述清楚。

一个好的 tool schema 应该包含：

- 工具做什么。
- 输入字段含义。
- 必填和可选字段。
- 副作用。
- 权限要求。
- 常见错误。
- 输出结构。
- 是否幂等。
- 是否可 dry-run。

反例：

```text
tool: run
description: run command
```

更好的描述：

```text
tool: query_customer_order
description: 查询当前租户下指定订单的状态。只读，无副作用。
input:
  order_id: 订单 ID，必须属于当前用户可访问范围。
output:
  status: paid | refunded | pending
  created_at: ISO 时间
errors:
  permission_denied
  order_not_found
```

工具 schema 是 Agent 行为的一部分，不只是 API 文档。

## 生产集成模式

### 模式 1：本地 MCP Server

适合：

- 文件系统。
- 本地 IDE。
- 本地数据库。
- 开发工具。

特点：

- 延迟低。
- 权限靠本机环境和 Host 控制。
- 更适合个人工具和开发场景。

### 模式 2：远程 MCP Server

适合：

- SaaS。
- 企业数据源。
- 内部 API。
- 多用户平台。

需要额外关注：

- OAuth / token。
- 租户隔离。
- 网络超时。
- 审计。
- rate limit。
- server 健康检查。

### 模式 3：MCP Gateway

企业里可以在 Host 和多个 MCP server 之间加一层 gateway。

```text
Host
  ↓
MCP Gateway
  ├─ GitHub MCP
  ├─ Database MCP
  ├─ Docs MCP
  └─ Internal API MCP
```

Gateway 负责：

- server 注册。
- 权限策略。
- 审计。
- tool allowlist。
- 统一错误格式。
- 统一 observability。

## 和上下文工程的关系

MCP 提供外部能力，但上下文工程决定“什么时候把什么能力暴露给模型”。

不要一次暴露 200 个 tools。更好的方式：

```text
用户任务
  ↓
任务分类
  ↓
选择相关 MCP servers
  ↓
选择相关 resources / tools
  ↓
压缩工具描述
  ↓
执行过程中按需展开
```

这叫渐进披露。

## 最小落地路线

1. 先接一个只读 MCP server。
2. 只暴露 2 到 3 个工具。
3. 给每个工具写清楚 schema、错误和权限。
4. Host 做 allowlist。
5. 保存 tool call trace。
6. 高风险工具先不开放。
7. 加 eval，检查工具是否被正确选择。
8. 再接写操作和审批。

## 常见误区

### 误区 1：MCP 会自动保证安全

协议提供连接方式，但权限、审批、审计和沙箱仍然要 Host 和平台实现。

### 误区 2：工具越多越好

工具太多会增加选择错误、上下文成本和注入风险。

### 误区 3：Server 返回内容可以直接当指令

Server 返回的是外部数据。它可能包含恶意文本，必须按不可信内容处理。

### 误区 4：MCP 替代 Agent 架构

MCP 解决连接问题，不解决 loop、状态、评测、预算和恢复。

### 误区 5：只写代码不写工具语义

Agent 依赖工具描述做决策。schema 质量直接影响调用质量。

## 下一步

继续读：

- [Agent Skills 实现思路](agent-skills-implementation.md)
- [Agent 安全与 Guardrails](agent-security-guardrails.md)
- [上下文工程](context-engineering.md)
- [大型 Agent 系统架构设计](large-agent-system-architecture.md)

## 参考资料

- [Model Context Protocol: What is MCP?](https://modelcontextprotocol.io/docs/getting-started/intro)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/specification/2025-06-18)
