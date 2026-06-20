# 什么是上下文工程

!!! note "新手阅读建议"
    如果你刚开始了解这个概念，先读 [上下文工程入门](context-engineering-beginner.md)。本文会更系统，也会出现产品机制、源码和 Java 设计。

## 简短定义

上下文工程是为 AI 系统设计、组织、提供和维护上下文的工作。

它关心的不是一句提示词怎么写得更漂亮，而是模型在执行任务时应该看到什么信息、以什么结构看到、什么时候看到、如何引用工具和记忆、如何避免无关信息干扰，以及如何让上下文随任务推进而更新。

从 API 链路看，它发生在：

```text
HTTP request
  ↓
request normalization
  ↓
context assembly
  ↓
prompt / chat template
  ↓
tokenizer
  ↓
Transformer
```

这里的 `context assembly` 就是上下文工程的主要工作区。

它把用户输入、系统规则、工具 schema、检索结果、历史摘要、权限状态和运行时事件，组织成模型此刻应该看到的输入。

## 和提示词工程的区别

提示词工程更像是在写“当前这次对话怎么问”。

上下文工程更像是在设计“模型工作的环境”：

- 系统指令：模型应该遵守的角色、边界和工作方式。
- 用户目标：这次真正要完成什么。
- 历史信息：哪些旧对话、旧决策、旧文件仍然相关。
- 外部知识：文档、代码、网页、数据库、知识库。
- 工具结果：搜索、执行命令、调用 API 后得到的证据。
- 中间状态：当前进度、未解决问题、计划、假设。
- 输出格式：结果应该以什么形态交付。

## 一个判断标准

如果一个 AI 系统答得不好，不一定是模型能力不够，也不一定是提示词不够花哨。

很多时候是上下文出了问题：

- 重要信息没有给到模型。
- 给了太多无关信息，稀释了注意力。
- 信息顺序混乱，模型抓不到主线。
- 历史记录没有被正确压缩和保留。
- 工具结果没有转化成可用证据。
- 模型不知道当前任务的状态。

## 核心问题

上下文工程本质上在回答几个问题：

- 这次任务需要哪些信息？
- 哪些信息现在不需要？
- 信息应该原文保留、摘要保留，还是结构化保存？
- 哪些内容是事实，哪些只是猜测？
- 当上下文窗口有限时，应该舍弃什么、保留什么？
- 模型应该在什么时候查资料、什么时候直接推理？
- 对话推进后，哪些内容要进入长期记忆或文档？

## 在我们这个笔记里的用法

我们把聊天中的重要内容写进 MkDocs，本身就是一种上下文工程。

它的作用是：

- 把临时对话变成可回看的上下文。
- 把零散观点整理成主题页面。
- 把决定和原因保存下来，避免之后重复讨论。
- 让后续聊天可以基于已有记录继续推进。

## 在 Agent 产品中的体现

在一个 Agent 产品里，上下文工程通常不是单个功能，而是一组产品机制共同完成的：

- 启动上下文：系统指令、项目规则、用户偏好、组织策略。
- 工作上下文：当前任务、打开的文件、选中的代码、最近工具结果。
- 检索上下文：通过文件搜索、代码搜索、网页、数据库、MCP 或插件按需取回信息。
- 记忆上下文：长期规则、项目经验、用户偏好、历史决策。
- 压缩上下文：当上下文窗口接近上限时，把历史压成摘要，保留关键事实。
- 隔离上下文：用子 agent、独立线程或独立会话避免大范围探索污染主任务。
- 权限上下文：哪些工具能用、哪些数据能读、哪些动作需要确认。

这些机制最终都会落到模型调用链路里：

| 机制 | 进入模型前通常变成什么 |
| --- | --- |
| 系统规则 | system / developer message |
| 工具能力 | tools schema 或工具说明 |
| 检索结果 | 引用片段、文件片段、结构化证据 |
| 历史对话 | 原文消息或压缩摘要 |
| 权限状态 | 当前可用工具、禁用动作、审批要求 |
| 运行时事件 | 隐藏消息、runtime context、临时提示 |

所以，上下文工程不是简单“多塞资料”，而是设计输入结构、优先级、边界和更新策略。

### Codex

Codex 中的上下文工程主要体现在“面向代码仓库的工作现场”：

- 线程保存用户提示、模型输出和工具调用，是一次任务的短期上下文。
- Codex 会从文件内容、命令输出、工具结果和当前任务进度中持续收集上下文。
- 长任务中，Codex 可以通过压缩上下文继续工作。
- `AGENTS.md` 提供分层项目指令：全局、仓库、子目录可以有不同规则。
- Skills 使用渐进披露：先只把技能名称、描述和路径放进上下文，真正需要时再读取完整说明。
- MCP 把外部工具和资料接进来，例如文档、浏览器、Figma、监控系统等。

这里的关键不是“让模型一次读完整个仓库”，而是让它知道如何定位相关文件、如何运行验证、如何遵守项目规则。

### Claude Code

Claude Code 的上下文工程和 Codex 很像，但公开文档里更直接强调上下文窗口、记忆和规则加载：

- 每个会话从新的上下文窗口开始。
- `CLAUDE.md` 用来保存项目、用户或组织级的持久说明。
- Auto memory 会根据纠正、偏好和项目经验自动记录可复用信息。
- 路径规则可以只在处理匹配文件时加载，减少无关规则占用上下文。
- `/compact` 和自动压缩会把长会话整理成摘要。
- 子 agent 可以把大规模读取和研究隔离在自己的上下文窗口，只把摘要带回主会话。

它体现了一种很重要的原则：不是所有信息都应该常驻上下文；只有当前阶段需要的信息才应该进入工作窗口。

### OpenClaw

OpenClaw 更像一个常驻的个人 Agent 网关，所以它的上下文工程比编码工具多了“跨渠道”和“跨时间”的问题：

- 它把 Telegram、WhatsApp、Slack、Discord 等聊天入口连接到 AI agent。
- Gateway 负责会话、路由和渠道连接，是上下文流转的中枢。
- OpenClaw 有明确的 context engine 概念，用来决定每次模型运行时包含哪些消息、如何总结旧历史、如何跨子 agent 管理上下文。
- context engine 的生命周期包括 ingest、assemble、compact、after turn。
- 插件可以替换上下文引擎，改变组装、压缩或跨会话回忆行为。

如果说 Codex 和 Claude Code 更关注“代码任务上下文”，OpenClaw 关注的是“一个长期在线助手如何从多个入口接收消息，并把它们组织成可执行任务上下文”。

## 横向对比

| 产品 | 上下文工程重点 | 典型机制 |
| --- | --- | --- |
| Codex | 仓库任务、工具执行、验证闭环 | 线程、文件读取、工具输出、`AGENTS.md`、Skills、MCP、压缩 |
| Claude Code | 代码会话、规则加载、自动记忆、窗口管理 | `CLAUDE.md`、Auto memory、路径规则、`/compact`、子 agent |
| OpenClaw | 多渠道常驻助手、会话路由、跨任务记忆 | Gateway、session routing、context engine、插件上下文引擎、子 agent 生命周期 |

## 产品设计启发

如果要设计一个 Agent 产品，上下文工程至少要回答：

- 哪些上下文启动时加载？
- 哪些上下文按需检索？
- 哪些上下文由用户维护，哪些由系统自动维护？
- 历史太长时如何压缩？
- 子任务是否应该拥有独立上下文？
- 工具结果是否需要原样进入模型，还是先在执行环境中处理？
- 用户、项目、组织之间的规则优先级是什么？
- 哪些上下文只是建议，哪些规则必须由权限系统强制执行？

一个成熟 Agent 产品的差异，往往不只在模型，而在这些上下文管道是否设计得足够清楚。

## 源码中的动态 Prompt 注入

动态注入 prompt 指的是：Agent 在运行过程中根据当前状态、入口、权限、工具、模型、压缩需求等条件，把额外说明拼进 system、developer、user 或隐藏消息里。

这些 prompt 通常不是用户主动输入的，而是产品为了让模型正确处理特定场景而注入的运行时上下文。

### Codex 中看到的类型

公开源码中可以看到这些动态注入点：

- 权限与沙箱提示：根据当前 sandbox、网络权限、审批策略、已批准命令前缀等生成 developer instructions。
- Guardian 审核提示：当 agent 请求联网或提权时，把精简 transcript、待审核 action JSON、retry reason 等交给审核流程。
- 压缩提示：上下文接近上限时，用固定 compaction prompt 生成 handoff summary。
- IDE 上下文提示：把 active file、selection、open tabs 等拼到用户请求前面。
- Skills 可用性提示：先注入技能名称、描述、路径，真正使用时再读完整 `SKILL.md`。
- 插件/Apps 提示：告诉模型可用插件、推荐插件、App connector 的触发方式。
- 模型切换提示：当会话切换模型后，注入“之前使用不同模型，请按这些指令继续”的过渡说明。
- Realtime 开始/结束提示：进入或退出实时会话时注入开始、结束和原因说明。
- 多 agent 模式提示：根据模式告诉模型是否只能显式请求时派生子 agent，或允许主动并行委托。
- 记忆提示：读取 memory summary，生成 memory read-path developer instructions；写入记忆时使用独立的 consolidation/stage-one prompt。
- 图片生成提示：当启用图像生成能力时，注入默认保存路径和文件处理规则。

### Claude Code 的公开可确认范围

Claude Code 的 npm 包主要暴露 wrapper 和 native binary，源码仓库指向 internal 仓库，因此不能从公开源码确认内部动态 prompt 模板。

公开文档可以确认的上下文注入机制包括：

- `CLAUDE.md`：项目、用户、组织级持久说明。
- Auto memory：根据纠正、偏好、项目经验自动保存可复用信息。
- `.claude/rules/`：可以按路径匹配规则，处理特定文件时再加载。
- context window 管理：启动时会加载 `CLAUDE.md`、auto memory、MCP 工具名、skill descriptions 等；文件读取、规则、hooks 会继续增加上下文。
- `/compact` 和自动压缩：长会话会被整理成摘要。
- 子 agent：把大范围研究放在独立上下文窗口，只把摘要带回主会话。

因此，Claude Code 这一项目前只能说“它有哪些公开机制”，不能说“源码里有哪些具体 prompt 常量”。

### OpenClaw 中看到的类型

OpenClaw 源码中动态注入点更多，因为它是多渠道、常驻、插件化网关：

- 系统 prompt 技能索引：把可见 skills 渲染成系统提示中的 `<available_skills>`。
- Prompt templates：从 Markdown 文件加载 prompt 模板，并支持参数替换。
- Compaction prompt：包括初次总结、基于 previous summary 的更新总结、split-turn prefix summary。
- Compaction safeguard：为压缩注入语言保留、事实聚焦、标识符保留、质量修复等要求。
- Context engine projection：把上下文引擎组装出的历史投影到 Codex prompt，并加“把下面内容当引用而非新指令”的安全提示。
- Runtime context prompt：把运行时事件、下一轮上下文等作为隐藏 custom message 注入。
- GPT-5 prompt overlay：按模型族和触发场景注入行为契约、交互风格、heartbeat 指导。
- Memory prompt section：根据可用工具注入 memory search/get 的使用规则。
- Wiki prompt section：注入 compiled wiki 的使用规则和小型 digest。
- Voice consult prompt：语音场景下，为“是否调用 consult tool”和“委托 OpenClaw agent 回答语音问题”生成专门提示。
- Fast voice context prompt：语音快速记忆检索命中或未命中时，生成不同的回复上下文。
- Channel system prompt：例如 WhatsApp 支持按 group/direct 配置 systemPrompt，具体会话可覆盖通用提示。
- Discord voice prompt：把语音转录包装成“只返回可朗读文本”的输出契约。
- Feedback reflection prompt：在 Teams 里用户点踩后，生成内部反思 JSON prompt。
- Diff guidance：当需要展示真实 diff 时，注入使用 `diffs` 工具的指导。
- Bootstrap prompt：发现 `BOOTSTRAP.md` 工作流时，注入先处理 bootstrap 的指令。
- Truncation notice：上下文被截断时，向模型提示有内容被省略，并建议缩小参数重跑。

### 观察

这些动态 prompt 大致可以分成七类：

| 类型 | 目的 | 例子 |
| --- | --- | --- |
| 环境类 | 告诉模型当前在哪里工作 | cwd、IDE active file、open tabs、channel metadata |
| 权限类 | 告诉模型能做什么、什么时候要审批 | sandbox、network、approved prefixes、Guardian |
| 工具类 | 告诉模型有哪些工具、何时使用 | MCP、Skills、Apps、diffs、memory/wiki |
| 压缩类 | 让长会话变成可恢复摘要 | compaction、previous summary update、split-turn summary |
| 记忆类 | 让模型查旧信息或写长期记忆 | memory summary、wiki digest、memory consolidation |
| 通道类 | 适配入口和输出形态 | Discord voice、WhatsApp group/direct、Teams feedback |
| 模型/模式类 | 适配特定模型或运行状态 | GPT-5 overlay、heartbeat、realtime、multi-agent mode |

动态 prompt 的本质是：产品把“当前发生了什么”翻译成模型能理解、能执行的上下文协议。

这也是上下文工程的核心体现之一。

如果说检索、记忆和压缩解决的是“模型应该知道什么”，那么动态 prompt 注入解决的是“模型此刻应该如何解释当前局面、遵守哪些边界、采用哪种工作方式”。

换句话说，Agent 产品不是把一个固定系统提示词丢给模型就结束了，而是在每一轮运行时不断重组上下文：

- 当前入口是什么：IDE、终端、网页、语音、聊天群。
- 当前状态是什么：新任务、继续任务、压缩后恢复、模型切换、定时唤醒。
- 当前风险是什么：联网、写文件、执行命令、访问隐私数据。
- 当前可用能力是什么：工具、插件、skills、MCP、memory、wiki。
- 当前输出应该是什么形态：代码补丁、语音短答、JSON、diff、静默 heartbeat。

所以动态 prompt 注入可以看成“运行时上下文工程”：它把产品状态转译成模型行为约束。

## Agent 产品中如何设计 Prompt 注入

如果要让一个 Agent 产品后续容易改造提示词、注入提示词，核心原则是：不要把 prompt 写死在业务流程里，而要把 prompt 当成独立的运行时资源和可组合管线。

相关源码目录可继续看：[开源 Agent 提示词目录](open-source-agent-prompts.md)。

### 设计原则

- Prompt 模板外置：放在 `resources/prompts/`、数据库或配置中心，而不是散落在 Java 字符串里。
- Prompt 分层：区分 base system prompt、产品策略、工具说明、权限说明、通道说明、记忆说明、任务说明。
- Prompt 片段化：每个注入点都是一个 `PromptFragment`，有 id、role、priority、condition、content。
- 运行时组装：每轮请求前根据 `AgentRuntimeContext` 动态选择片段。
- 优先级明确：system、developer、user、tool、memory 等上下文要有稳定顺序。
- 条件可配置：按入口、模型、用户、组织、工具可用性、权限状态、任务类型决定是否注入。
- 模板可版本化：每个 prompt 有版本号，方便灰度、回滚、A/B test。
- 输出可观测：保存本轮实际组装出的 prompt breakdown，便于调试。
- 注入可测试：每个场景都能 snapshot 测试最终 prompt。
- 安全边界明确：外部消息、历史记录、网页内容等要包成“引用数据”，不要当指令。

### Java 中的核心抽象

可以把 prompt 注入设计成一组接口：

```java
public enum PromptRole {
    SYSTEM,
    DEVELOPER,
    USER,
    TOOL,
    HIDDEN
}

public record PromptFragment(
    String id,
    PromptRole role,
    int priority,
    String content,
    String version
) {}

public interface PromptContributor {
    boolean supports(AgentRuntimeContext context);

    List<PromptFragment> contribute(AgentRuntimeContext context);
}
```

`AgentRuntimeContext` 是运行时状态：

```java
public record AgentRuntimeContext(
    String userId,
    String workspaceId,
    String model,
    String channel,
    String taskType,
    boolean networkEnabled,
    boolean writeEnabled,
    boolean memoryEnabled,
    boolean voiceMode,
    boolean compacting,
    List<String> availableTools,
    Map<String, Object> metadata
) {}
```

然后用一个组装器统一排序、截断、渲染：

```java
public final class PromptAssembler {
    private final List<PromptContributor> contributors;

    public PromptAssembler(List<PromptContributor> contributors) {
        this.contributors = contributors;
    }

    public List<PromptFragment> assemble(AgentRuntimeContext context) {
        return contributors.stream()
            .filter(contributor -> contributor.supports(context))
            .flatMap(contributor -> contributor.contribute(context).stream())
            .sorted(Comparator
                .comparing(PromptFragment::role)
                .thenComparingInt(PromptFragment::priority))
            .toList();
    }
}
```

### 示例：权限 Prompt 注入

```java
public final class PermissionPromptContributor implements PromptContributor {
    @Override
    public boolean supports(AgentRuntimeContext context) {
        return true;
    }

    @Override
    public List<PromptFragment> contribute(AgentRuntimeContext context) {
        StringBuilder text = new StringBuilder();

        if (context.writeEnabled()) {
            text.append("Filesystem write access is enabled for the current workspace.\n");
        } else {
            text.append("Filesystem is read-only. Do not modify files.\n");
        }

        if (context.networkEnabled()) {
            text.append("Network access is available. Use it only when current information is required.\n");
        } else {
            text.append("Network access is disabled. Do not attempt external requests.\n");
        }

        return List.of(new PromptFragment(
            "permissions.runtime",
            PromptRole.DEVELOPER,
            100,
            text.toString(),
            "v1"
        ));
    }
}
```

### 示例：语音入口 Prompt 注入

```java
public final class VoicePromptContributor implements PromptContributor {
    @Override
    public boolean supports(AgentRuntimeContext context) {
        return context.voiceMode();
    }

    @Override
    public List<PromptFragment> contribute(AgentRuntimeContext context) {
        return List.of(new PromptFragment(
            "channel.voice.output",
            PromptRole.DEVELOPER,
            300,
            """
            The user is interacting through voice.
            Return only concise spoken text.
            Avoid markdown tables, code fences, citations, and long lists unless explicitly requested.
            Ask one brief clarification question if the transcript is ambiguous.
            """,
            "v1"
        ));
    }
}
```

### 示例：外置模板

Java 中可以把模板放在：

```text
src/main/resources/prompts/
  base-system.md
  permissions.md
  voice-output.md
  compaction.md
  memory-recall.md
```

然后由模板服务读取：

```java
public interface PromptTemplateStore {
    String load(String templateId, String version);
}
```

如果后续要改提示词，只改模板文件或配置中心，不改业务代码。

### 推荐模块划分

```text
agent-context/
  AgentRuntimeContext.java
  PromptFragment.java
  PromptContributor.java
  PromptAssembler.java
  PromptBudgetManager.java
  PromptAuditLogger.java

agent-prompts/
  BaseSystemPromptContributor.java
  PermissionPromptContributor.java
  ToolPromptContributor.java
  MemoryPromptContributor.java
  ChannelPromptContributor.java
  CompactionPromptContributor.java
  ModelOverlayPromptContributor.java

resources/prompts/
  *.md
```

### 最重要的设计点

Prompt 注入系统应该回答三个问题：

- 谁可以注入：哪些模块、插件、组织策略可以贡献 prompt。
- 什么时候注入：基于什么运行时条件触发。
- 怎么合并：顺序、优先级、预算、冲突、审计怎么处理。

做到这三点，Agent 产品后续才容易扩展：新增一个渠道、新增一种工具、新增一个模型 overlay、新增一种安全策略，都只是增加一个 `PromptContributor`，而不是改一堆业务流程。

## 暂定理解

上下文工程可以理解为：

> 让模型在正确的时间，以合适的形式，拿到足够但不过量的信息。

这个定义后续可以继续细化。

## 参考资料

- [上下文工程提示词模板库](context-engineering-prompt-templates.md)
- [Codex Prompting](https://developers.openai.com/codex/prompting)
- [Codex AGENTS.md](https://developers.openai.com/codex/guides/agents-md)
- [Codex Skills](https://developers.openai.com/codex/skills)
- [Codex MCP](https://developers.openai.com/codex/mcp)
- [Anthropic: Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- [Claude Code: How Claude remembers your project](https://code.claude.com/docs/en/memory)
- [Claude Code: Explore the context window](https://code.claude.com/docs/en/context-window)
- [OpenClaw: Context engine](https://docs.openclaw.ai/concepts/context-engine)
- [OpenAI Codex 源码](https://github.com/openai/codex)
- [OpenClaw 源码](https://github.com/openclaw/openclaw)
- [Claude Code npm package](https://www.npmjs.com/package/@anthropic-ai/claude-code)
