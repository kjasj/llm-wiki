# 开源 Agent 提示词目录

!!! warning "进阶资料"
    这一页是源码提示词索引，不适合作为第一篇学习材料。新手建议先读 [上下文工程入门](context-engineering-beginner.md)，再回来看这一页。

这里收集开源 Agent 产品源码中能看到的提示词和提示词注入点。

记录重点不是全文搬运 prompt，而是说明它们在什么场景下出现、注入到哪里、解决什么上下文问题。

## 如何阅读这个目录

不要从源码链接开始读。

建议按这个顺序：

1. 先看“场景”：它是在权限、工具、压缩、记忆、通道，还是模型切换时出现。
2. 再看“注入位置”：它是 system/developer 指令、user prefix、工具说明，还是压缩模型 prompt。
3. 再看“作用”：它解决的是行为约束、上下文恢复、工具发现，还是安全隔离。
4. 最后才点源码链接，看具体实现。

这页和前面的上下文工程文档对应关系是：

| 上下文工程概念 | 这里的源码例子 |
| --- | --- |
| 动态 prompt 注入 | 权限提示、模型切换提示、runtime context |
| 工具上下文 | Skills、Apps、Plugins、diff guidance |
| 权限上下文 | sandbox、approval policy、Guardian |
| 压缩上下文 | compact prompt、split-turn summary、truncation notice |
| 记忆上下文 | memory read/write、wiki digest |
| 通道上下文 | IDE context、voice prompt、WhatsApp systemPrompt |

## 范围

已纳入：

- OpenAI Codex：源码快照 `d66708232299bdbf373ec55b0d6b938c246cfa60`
- OpenClaw：源码快照 `a085db6b642e589de609da3ec1b54bbf390af87e`

未纳入：

- Claude Code：公开 npm 包主要是 wrapper 和 native binary，源码仓库指向 internal，不能从公开源码确认内部 prompt 模板。

## Codex

| 提示词 / 注入点 | 场景 | 注入位置 | 作用 | 源码 |
| --- | --- | --- | --- | --- |
| 基础 coding agent prompt | Codex CLI 启动或选择对应模型时 | system / developer 基础指令 | 定义 Codex 身份、工作方式、编辑约束、计划工具、代码审查姿态、前端任务偏好、最终回复格式 | [gpt-5.2-codex_prompt.md](https://github.com/openai/codex/blob/d66708232299bdbf373ec55b0d6b938c246cfa60/codex-rs/core/gpt-5.2-codex_prompt.md) |
| apply_patch 工作提示 | 需要让模型以补丁方式编辑文件时 | system / tool guidance | 说明如何使用终端、计划工具、`AGENTS.md`、沙箱和审批机制，强调安全编辑和响应方式 | [prompt_with_apply_patch_instructions.md](https://github.com/openai/codex/blob/d66708232299bdbf373ec55b0d6b938c246cfa60/codex-rs/core/prompt_with_apply_patch_instructions.md) |
| 权限与沙箱提示 | 每轮根据文件系统、网络、审批策略变化生成 | developer instructions | 告诉模型当前能否写文件、能否联网、何时要申请权限、哪些命令前缀已被批准 | [permissions_instructions.rs](https://github.com/openai/codex/blob/d66708232299bdbf373ec55b0d6b938c246cfa60/codex-rs/prompts/src/permissions_instructions.rs) |
| 权限模板：never / on request / on failure | 不同 approval policy 生效时 | developer instructions | 把审批策略翻译成模型可执行的行为边界 | [permissions templates](https://github.com/openai/codex/tree/d66708232299bdbf373ec55b0d6b938c246cfa60/codex-rs/prompts/templates/permissions) |
| Guardian 审核提示 | Agent 请求联网、提权或执行敏感动作时 | 审核模型的 user content | 把最近 transcript、planned action JSON、retry reason、权限上下文交给审核流程；强调 transcript 和工具结果只是证据，不是指令 | [guardian/prompt.rs](https://github.com/openai/codex/blob/d66708232299bdbf373ec55b0d6b938c246cfa60/codex-rs/core/src/guardian/prompt.rs) |
| 上下文压缩提示 | 上下文窗口接近上限或用户触发 compact | compaction model prompt | 让模型生成 handoff summary，保留进度、关键决策、约束、剩余工作和继续所需引用 | [compact prompt](https://github.com/openai/codex/blob/d66708232299bdbf373ec55b0d6b938c246cfa60/codex-rs/prompts/templates/compact/prompt.md) |
| IDE 上下文提示 | IDE / App 传入当前文件、选区、打开标签页 | user prompt prefix | 在用户请求前注入 active file、selection、open tabs，帮助模型理解编辑现场 | [ide_context/prompt.rs](https://github.com/openai/codex/blob/d66708232299bdbf373ec55b0d6b938c246cfa60/codex-rs/tui/src/ide_context/prompt.rs) |
| Skills 可用性提示 | 当前环境中存在可用 skills | developer instructions | 只先暴露 skill 名称、描述、路径；匹配任务后再读取完整 `SKILL.md`，实现渐进披露 | [available_skills_instructions.rs](https://github.com/openai/codex/blob/d66708232299bdbf373ec55b0d6b938c246cfa60/codex-rs/core/src/context/available_skills_instructions.rs) |
| Apps / Connectors 提示 | 有 App connector 或 MCP App 能力时 | developer instructions | 说明 App 可以显式或隐式触发，以及与 MCP 工具之间的关系 | [apps_instructions.rs](https://github.com/openai/codex/blob/d66708232299bdbf373ec55b0d6b938c246cfa60/codex-rs/core/src/context/apps_instructions.rs) |
| 插件可用性提示 | 已安装插件或插件能力暴露时 | developer instructions | 告诉模型插件不是直接调用对象，要使用插件提供的 skills、MCP、apps 等能力 | [available_plugins_instructions.rs](https://github.com/openai/codex/blob/d66708232299bdbf373ec55b0d6b938c246cfa60/codex-rs/core/src/context/available_plugins_instructions.rs) |
| 推荐插件提示 | 系统发现可安装但未安装的插件时 | user context fragment | 当用户请求可能受益于插件时，引导模型使用安装建议工具 | [recommended_plugins_instructions.rs](https://github.com/openai/codex/blob/d66708232299bdbf373ec55b0d6b938c246cfa60/codex-rs/core/src/context/recommended_plugins_instructions.rs) |
| 模型切换提示 | 会话从一个模型切到另一个模型时 | developer instructions | 告诉新模型“用户之前使用了不同模型”，并附上继续对话的模型指令 | [model_switch_instructions.rs](https://github.com/openai/codex/blob/d66708232299bdbf373ec55b0d6b938c246cfa60/codex-rs/core/src/context/model_switch_instructions.rs) |
| Realtime 后端提示 | 实时语音 / 对话表层与执行后端协同时 | realtime backend prompt | 定义对话表层身份、语气、后端委托策略、如何处理 backend 输出和用户输入 | [backend_prompt.md](https://github.com/openai/codex/blob/d66708232299bdbf373ec55b0d6b938c246cfa60/codex-rs/prompts/templates/realtime/backend_prompt.md) |
| Realtime start / end 提示 | 进入或退出实时会话 | developer instructions | 在会话状态变化时注入开始、结束和原因说明 | [realtime_start_instructions.rs](https://github.com/openai/codex/blob/d66708232299bdbf373ec55b0d6b938c246cfa60/codex-rs/core/src/context/realtime_start_instructions.rs) |
| 多 agent 模式提示 | 用户或配置切换多 agent 行为 | developer instructions | 控制是否只能显式请求时派生子 agent，或允许主动并行委托 | [multi_agent_mode_instructions.rs](https://github.com/openai/codex/blob/d66708232299bdbf373ec55b0d6b938c246cfa60/codex-rs/core/src/context/multi_agent_mode_instructions.rs) |
| 记忆读取提示 | Codex memory 已启用且存在 memory summary | developer instructions | 告诉模型何时查 memory、查哪些文件、如何轻量检索、何时声明记忆可能过期 | [read_path.md](https://github.com/openai/codex/blob/d66708232299bdbf373ec55b0d6b938c246cfa60/codex-rs/ext/memories/templates/memories/read_path.md) |
| 记忆写入 Phase 1 | 从单次 rollout 提炼 raw memory | memory writing agent system prompt | 把原始 rollout 转成有价值的 raw memories 和 rollout summaries，强调证据、隐私和 no-op gate | [stage_one_system.md](https://github.com/openai/codex/blob/d66708232299bdbf373ec55b0d6b938c246cfa60/codex-rs/memories/write/templates/memories/stage_one_system.md) |
| 记忆写入 Phase 2 | 合并 raw memories 和 rollout summaries | memory writing agent prompt | 把原始记忆整理成渐进披露的本地 memory 文件夹 | [consolidation.md](https://github.com/openai/codex/blob/d66708232299bdbf373ec55b0d6b938c246cfa60/codex-rs/memories/write/templates/memories/consolidation.md) |

### Codex 观察

Codex 的提示词设计重点在“编码任务执行闭环”：

- 基础 prompt 定义通用工作纪律。
- 权限 prompt 把沙箱和审批策略转成模型行为约束。
- IDE / Skills / Apps / Plugins prompt 让模型按需获得上下文。
- Compaction 和 memory prompt 负责跨长任务、跨会话保留上下文。
- Guardian prompt 把安全审核从普通对话中分离出来，形成独立的评估上下文。

## OpenClaw

| 提示词 / 注入点 | 场景 | 注入位置 | 作用 | 源码 |
| --- | --- | --- | --- | --- |
| Skills 系统提示片段 | Agent runtime 中存在可见 skills | system prompt section | 把 skill 名称、描述、路径、版本渲染进 `<available_skills>`，提醒模型匹配时读取完整 skill | [system-prompt.ts](https://github.com/openclaw/openclaw/blob/a085db6b642e589de609da3ec1b54bbf390af87e/packages/agent-core/src/harness/system-prompt.ts) |
| Prompt templates | 用户或应用调用 prompt 模板 | prompt template runtime | 从 Markdown 文件加载模板，解析 frontmatter，支持参数替换 | [prompt-templates.ts](https://github.com/openclaw/openclaw/blob/a085db6b642e589de609da3ec1b54bbf390af87e/packages/agent-core/src/harness/prompt-templates.ts) |
| Compaction system prompt | 历史会话需要压缩 | summarization system prompt | 指定模型只做结构化摘要，不继续对话 | [compaction.ts](https://github.com/openclaw/openclaw/blob/a085db6b642e589de609da3ec1b54bbf390af87e/packages/agent-core/src/harness/compaction/compaction.ts) |
| 初次 compaction prompt | 没有 previous summary 时 | summarization user prompt | 生成包含目标、约束、进展、决策、下一步、关键上下文的 checkpoint summary | [compaction.ts](https://github.com/openclaw/openclaw/blob/a085db6b642e589de609da3ec1b54bbf390af87e/packages/agent-core/src/harness/compaction/compaction.ts) |
| 更新 compaction prompt | 已有 previous summary 时 | summarization user prompt | 把新消息合并进旧 summary，保留已有信息并更新进度、决策、下一步 | [compaction.ts](https://github.com/openclaw/openclaw/blob/a085db6b642e589de609da3ec1b54bbf390af87e/packages/agent-core/src/harness/compaction/compaction.ts) |
| Split-turn prefix summary | 一个 turn 太大，只能保留后半段时 | summarization user prompt | 单独总结被截掉的 turn 前缀，让保留的后缀仍有上下文 | [compaction.ts](https://github.com/openclaw/openclaw/blob/a085db6b642e589de609da3ec1b54bbf390af87e/packages/agent-core/src/harness/compaction/compaction.ts) |
| Compaction safeguard instructions | 压缩时需要额外质量约束 | custom compaction instructions | 保留对话主要语言、事实内容、章节结构、代码路径和错误信息 | [compaction-instructions.ts](https://github.com/openclaw/openclaw/blob/a085db6b642e589de609da3ec1b54bbf390af87e/src/agents/agent-hooks/compaction-instructions.ts) |
| 标识符保留提示 | 压缩包含 UUID、hash、URL、文件名等 | compaction additional focus | 要求原样保留不透明标识符，避免摘要破坏可恢复性 | [compaction.ts](https://github.com/openclaw/openclaw/blob/a085db6b642e589de609da3ec1b54bbf390af87e/src/agents/compaction.ts) |
| Context engine -> Codex projection | OpenClaw 使用 Codex harness 运行时 | Codex prompt prefix / developer addition | 把 OpenClaw context engine 组装的上下文投影给 Codex，并标注为引用数据而非新指令 | [context-engine-projection.ts](https://github.com/openclaw/openclaw/blob/a085db6b642e589de609da3ec1b54bbf390af87e/extensions/codex/src/app-server/context-engine-projection.ts) |
| Runtime context hidden message | 下一轮、运行时事件或内部上下文需要进入模型但不展示给用户 | hidden custom message / runtime system context | 把运行时上下文包装成内部块，避免泄露到用户可见 transcript | [runtime-context-prompt.ts](https://github.com/openclaw/openclaw/blob/a085db6b642e589de609da3ec1b54bbf390af87e/src/agents/embedded-agent-runner/run/runtime-context-prompt.ts) |
| Context truncation notice | 上下文因预算或工具限制被截断 | prompt notice | 告诉模型有字符被截断，并建议必要时缩小参数重跑 | [context-truncation-notice.ts](https://github.com/openclaw/openclaw/blob/a085db6b642e589de609da3ec1b54bbf390af87e/src/agents/embedded-agent-runner/context-truncation-notice.ts) |
| GPT-5 behavior contract | 模型属于 GPT-5 系列且 overlay 开启 | system prompt stable prefix | 注入 persona latch、执行策略、工具纪律、输出契约、完成契约 | [gpt5-prompt-overlay.ts](https://github.com/openclaw/openclaw/blob/a085db6b642e589de609da3ec1b54bbf390af87e/src/agents/gpt5-prompt-overlay.ts) |
| GPT-5 friendly chat overlay | GPT-5 overlay 为 friendly 模式 | system prompt section override | 调整交互风格，让回复更自然、协作、简洁 | [gpt5-prompt-overlay.ts](https://github.com/openclaw/openclaw/blob/a085db6b642e589de609da3ec1b54bbf390af87e/src/agents/gpt5-prompt-overlay.ts) |
| GPT-5 heartbeat overlay | heartbeat 触发或显式包含 heartbeat 指导 | system prompt section override | 让 agent 在定时唤醒时少说空话，优先做有价值行动，只在值得打扰时通知用户 | [gpt5-prompt-overlay.ts](https://github.com/openclaw/openclaw/blob/a085db6b642e589de609da3ec1b54bbf390af87e/src/agents/gpt5-prompt-overlay.ts) |
| Memory prompt section | memory_search / memory_get 工具可用 | prompt section | 告诉模型涉及 prior work、dates、people、preferences、todos 时先查 memory | [memory-core prompt-section.ts](https://github.com/openclaw/openclaw/blob/a085db6b642e589de609da3ec1b54bbf390af87e/extensions/memory-core/src/prompt-section.ts) |
| Wiki prompt section | wiki 工具或 compiled digest 可用 | prompt section | 引导模型在需要长期项目知识、实体页、source-backed notes 时查 wiki | [memory-wiki prompt-section.ts](https://github.com/openclaw/openclaw/blob/a085db6b642e589de609da3ec1b54bbf390af87e/extensions/memory-wiki/src/prompt-section.ts) |
| Wiki compiled digest | wiki 配置允许注入 digest 且 digest 存在 | prompt section | 把高信号页面、claims、open questions、contradictions 的小摘要放进上下文 | [memory-wiki prompt-section.ts](https://github.com/openclaw/openclaw/blob/a085db6b642e589de609da3ec1b54bbf390af87e/extensions/memory-wiki/src/prompt-section.ts) |
| Voice consult policy prompt | 实时语音 agent 决定是否调用 consult tool | realtime model instructions | 指导何时直接回答，何时调用 `openclaw_agent_consult` 获取事实、工具、memory 或 workspace 上下文 | [agent-consult-tool.ts](https://github.com/openclaw/openclaw/blob/a085db6b642e589de609da3ec1b54bbf390af87e/src/talk/agent-consult-tool.ts) |
| Delegated voice consult prompt | 语音场景把问题委托给 OpenClaw agent | delegated agent prompt | 包含语音场景、最近 transcript、额外上下文和用户请求；要求只返回可朗读的简洁结果 | [agent-consult-tool.ts](https://github.com/openclaw/openclaw/blob/a085db6b642e589de609da3ec1b54bbf390af87e/src/talk/agent-consult-tool.ts) |
| Fast voice context prompt | 语音快速检索 memory/session 命中或未命中 | realtime response prompt | 快速把少量记忆命中包装给语音模型；未命中时要求简短说明没有相关上下文 | [fast-context-runtime.ts](https://github.com/openclaw/openclaw/blob/a085db6b642e589de609da3ec1b54bbf390af87e/src/talk/fast-context-runtime.ts) |
| WhatsApp group/direct system prompt | WhatsApp 群聊或私聊配置了 `systemPrompt` | channel system prompt | 按 group/direct 或通配配置注入会话级行为说明 | [whatsapp/system-prompt.ts](https://github.com/openclaw/openclaw/blob/a085db6b642e589de609da3ec1b54bbf390af87e/extensions/whatsapp/src/system-prompt.ts) |
| Discord voice spoken-output contract | Discord voice 转录进入 agent | prompt prefix | 要求只返回适合朗读的简洁文本，避免 markdown、表格、代码块和视觉格式 | [discord voice prompt.ts](https://github.com/openclaw/openclaw/blob/a085db6b642e589de609da3ec1b54bbf390af87e/extensions/discord/src/voice/prompt.ts) |
| Teams feedback reflection prompt | 用户对 Teams 回复点踩并可附评论 | reflection prompt | 让模型输出单个 JSON，记录内部 learning，并决定是否需要给用户 follow-up | [feedback-reflection-prompt.ts](https://github.com/openclaw/openclaw/blob/a085db6b642e589de609da3ec1b54bbf390af87e/extensions/msteams/src/feedback-reflection-prompt.ts) |
| Diff guidance | 可用 diffs 工具且需要展示真实 diff | tool guidance | 引导模型使用 `diffs` 工具，而不是手写 diff 摘要 | [diffs prompt-guidance.ts](https://github.com/openclaw/openclaw/blob/a085db6b642e589de609da3ec1b54bbf390af87e/extensions/diffs/src/prompt-guidance.ts) |
| Bootstrap workflow prompt | 存在 `BOOTSTRAP.md` 工作流交接 | startup / bootstrap prompt | 要求优先处理 bootstrap，不要假装完成；无法完成时说明阻塞并给下一步 | [bootstrap-prompt.ts](https://github.com/openclaw/openclaw/blob/a085db6b642e589de609da3ec1b54bbf390af87e/src/agents/bootstrap-prompt.ts) |

### OpenClaw 观察

OpenClaw 的提示词设计重点在“多渠道常驻 Agent 的运行时适配”：

- 同一个 agent 可能来自 WebChat、WhatsApp、Discord voice、Teams feedback、heartbeat、cron 或 Codex harness。
- 因此 prompt 不只是任务说明，而是把渠道、运行状态、记忆、工具、模型族、安全边界一起翻译成上下文。
- OpenClaw 把很多 prompt 做成插件化或配置化机制，例如 prompt templates、context engine、systemPrompt、memory/wiki prompt section、model overlay。

## 分类总结

| 分类 | 典型场景 | Codex 例子 | OpenClaw 例子 |
| --- | --- | --- | --- |
| 基础行为 | Agent 启动、模型选择 | Codex base prompt | GPT-5 behavior contract |
| 权限安全 | 联网、写文件、提权、审核 | permissions、Guardian | context projection safety note |
| 工具发现 | Skills、插件、Apps、MCP | available skills、apps、plugins | skills system prompt、diff guidance |
| 压缩恢复 | 长会话、上下文溢出 | compact prompt | summarization、update summary、split-turn summary |
| 记忆召回 | 历史经验、偏好、项目知识 | memory read path、memory write agents | memory prompt、wiki prompt、compiled digest |
| 通道适配 | IDE、实时语音、聊天应用 | IDE context、realtime backend | Discord voice、WhatsApp systemPrompt、voice consult |
| 模式切换 | 模型切换、realtime、multi-agent、heartbeat | model switch、realtime、multi-agent | GPT-5 heartbeat、runtime context、bootstrap |

## 对产品设计的启发

这些源码里的提示词说明：成熟 Agent 产品的 prompt 不应该是一段大字符串。

更好的设计是：

- 把 prompt 拆成独立片段。
- 每个片段有触发场景和优先级。
- 每轮运行时根据上下文动态组装。
- 对组装结果做审计、测试和预算控制。
- 对外部内容加安全边界，明确它是“引用数据”而不是“新指令”。

这正是上下文工程在产品层面的体现。
