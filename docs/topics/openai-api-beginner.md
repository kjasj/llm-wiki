# LLM API：从 HTTP 请求到 Transformer

这篇重新从真正的 API 链路讲。

不是先讲 Python SDK。

而是先看：

```text
HTTP 请求
  ↓
后端解析 JSON
  ↓
渲染 LLM Prompt Template / Chat Template
  ↓
Tokenizer 编码成 token id
  ↓
Transformer prefill
  ↓
逐 token decode
  ↓
采样参数生效
  ↓
HTTP / SSE 返回
```

Python SDK、Java SDK、OpenAI SDK 本质上都只是这个 HTTP API 的封装。

## API 的本质

大模型 API 表面上是：

```text
POST /v1/responses
POST /v1/chat/completions
```

但它真正做的是：

> 把结构化的 HTTP JSON 请求，转换成模型能处理的一串 token，然后让 Transformer 继续预测下一个 token。

所以我们要分三层看。

| 层次 | 你看到的东西 | 后端实际做的事 |
| --- | --- | --- |
| HTTP API 层 | URL、Header、JSON body | 鉴权、限流、解析参数、路由模型 |
| Prompt 渲染层 | `messages`、`tools`、`instructions` | 拼成模型训练时熟悉的 chat template |
| Transformer 层 | token id | embedding、attention、FFN、logits、采样 |

## 第一层：HTTP 请求长什么样

先看最原始的 HTTP。

### Responses API

Responses API 的 HTTP 请求大概是：

```http
POST /v1/responses HTTP/1.1
Host: api.openai.com
Authorization: Bearer $OPENAI_API_KEY
Content-Type: application/json
```

body：

```json
{
  "model": "gpt-5.5",
  "instructions": "你是一个耐心的中文老师，回答要适合新手。",
  "input": "用一句话解释什么是 KV Cache。",
  "temperature": 0.3,
  "top_p": 1,
  "max_output_tokens": 200
}
```

curl 形式：

```bash
curl https://api.openai.com/v1/responses \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-5.5",
    "instructions": "你是一个耐心的中文老师，回答要适合新手。",
    "input": "用一句话解释什么是 KV Cache。",
    "temperature": 0.3,
    "top_p": 1,
    "max_output_tokens": 200
  }'
```

这个请求里，最核心的是：

```text
model              选哪个模型
instructions       高优先级指令
input              用户输入
temperature/top_p  采样策略
max_output_tokens  输出长度上限
```

非流式响应可以先理解成：

```json
{
  "id": "resp_xxx",
  "object": "response",
  "status": "completed",
  "output": [
    {
      "type": "message",
      "role": "assistant",
      "content": [
        {
          "type": "output_text",
          "text": "KV Cache 是生成时缓存历史 token 的 Key 和 Value，避免重复计算。"
        }
      ]
    }
  ]
}
```

真实响应字段会随模型、工具和输出类型变化。

第一遍只要抓住：

```text
请求里放 input
响应里取 output / output_text
```

### Chat Completions API

Chat Completions API 的 HTTP 请求大概是：

```http
POST /v1/chat/completions HTTP/1.1
Host: api.openai.com
Authorization: Bearer $OPENAI_API_KEY
Content-Type: application/json
```

body：

```json
{
  "model": "gpt-5.5",
  "messages": [
    {
      "role": "developer",
      "content": "你是一个耐心的中文老师，回答要适合新手。"
    },
    {
      "role": "user",
      "content": "用一句话解释什么是 KV Cache。"
    }
  ],
  "temperature": 0.3,
  "top_p": 1
}
```

curl 形式：

```bash
curl https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-5.5",
    "messages": [
      {"role": "developer", "content": "你是一个耐心的中文老师，回答要适合新手。"},
      {"role": "user", "content": "用一句话解释什么是 KV Cache。"}
    ],
    "temperature": 0.3,
    "top_p": 1
  }'
```

Chat Completions 的核心是：

```text
messages = 一组有角色的对话消息
```

非流式响应可以先理解成：

```json
{
  "id": "chatcmpl_xxx",
  "object": "chat.completion",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "KV Cache 是生成时缓存历史 token 的 Key 和 Value，避免重复计算。"
      },
      "finish_reason": "stop"
    }
  ]
}
```

第一遍只要抓住：

```text
请求里放 messages
响应里读 choices[0].message.content
```

## Responses 和 Chat Completions 的差别

先用工程视角记：

| 接口 | 输入组织方式 | 适合理解成 |
| --- | --- | --- |
| Responses API | `instructions` + `input` + tools 等统一结构 | 新一代统一生成接口 |
| Chat Completions API | `messages` 数组 | 经典聊天续写接口 |

OpenAI 官方现在更推荐新文本生成项目优先使用 Responses API。

但很多本地部署框架、旧项目、OpenAI-compatible 服务仍然会优先兼容 Chat Completions。

所以两者都要懂。

## 第二层：后端收到 HTTP 后做什么

一个 LLM 服务端收到请求后，通常不是立刻把 JSON 扔给 Transformer。

它会先做一堆工程处理。

```text
HTTP 请求进来
  ↓
鉴权：API Key 是否有效
  ↓
限流：有没有超过 QPS / TPM / RPM
  ↓
解析 JSON：字段是否合法
  ↓
模型路由：model 对应哪组服务实例
  ↓
参数归一化：temperature、top_p、max tokens 等
  ↓
安全和策略检查：内容、工具权限、组织策略
  ↓
Prompt 渲染：messages/tools/instructions 变成模型输入
  ↓
Tokenizer：文本变 token id
  ↓
推理引擎：prefill + decode
  ↓
Response formatter：把输出 token 包装成 API 响应
  ↓
返回 HTTP JSON 或 SSE stream
```

在 vLLM、SGLang、llama.cpp server 这类框架里，你能更直观看到这条链路。

它们经常对外暴露 OpenAI-compatible API：

```text
应用以为自己在调 OpenAI
  ↓
其实请求打到本地 vLLM/SGLang/llama.cpp server
  ↓
服务端加载本地开源模型生成结果
```

## 第三层：为什么需要 Prompt Template

HTTP JSON 是给程序看的。

Transformer 不认识 JSON 里的 `role`、`messages`、`tools` 这些字段。

Transformer 只认识：

```text
token id 序列
```

所以中间必须有一步：

> 把结构化请求渲染成模型训练时熟悉的文本格式。

这一步就叫：

```text
Prompt Template
Chat Template
```

## messages 如何渲染成 prompt

假设 HTTP body 是：

```json
{
  "messages": [
    {"role": "system", "content": "你是一个安全的助手。"},
    {"role": "user", "content": "解释一下 MoE。"}
  ]
}
```

后端可能会渲染成类似这样的文本：

```text
<|system|>
你是一个安全的助手。
<|user|>
解释一下 MoE。
<|assistant|>
```

注意：

> 这只是示意，不代表 OpenAI 内部真实模板。

不同模型的 chat template 不一样。

比如某些开源模型可能是：

```text
<s>[INST] <<SYS>>
你是一个安全的助手。
<</SYS>>

解释一下 MoE。 [/INST]
```

另一些模型可能是：

```text
<|im_start|>system
你是一个安全的助手。
<|im_end|>
<|im_start|>user
解释一下 MoE。
<|im_end|>
<|im_start|>assistant
```

所以你在部署开源模型时，经常会看到：

```text
tokenizer.chat_template
apply_chat_template(...)
```

这一步非常关键。

如果 template 用错，模型可能会：

- 不知道哪里是用户问题。
- 不知道哪里该开始回答。
- 把系统指令当普通文本。
- 工具调用格式混乱。
- 输出质量明显下降。

## role 在模板里有什么用

`role` 不是魔法。

它最终也要被渲染成 token。

比如：

```json
{"role": "developer", "content": "只输出 JSON。"}
```

可能被渲染成：

```text
<|developer|>
只输出 JSON。
```

模型之所以会尊重这些角色，是因为它在训练和后训练阶段见过类似格式，并学会了：

```text
system/developer 指令优先级更高
user 是任务输入
assistant 是应该生成的位置
tool 是外部工具返回
```

所以 API 层的 `role`，到了底层会变成 template 中的一部分特殊标记或文本模式。

## tools 如何渲染进 prompt

工具调用也不是模型凭空会用。

HTTP 请求可能传：

```json
{
  "tools": [
    {
      "type": "function",
      "name": "get_weather",
      "description": "查询城市天气",
      "parameters": {
        "type": "object",
        "properties": {
          "city": {"type": "string"}
        },
        "required": ["city"]
      }
    }
  ]
}
```

后端通常会把工具信息放进模型上下文，类似：

```text
你可以调用以下工具：

工具名：get_weather
描述：查询城市天气
参数 JSON Schema：
{
  "type": "object",
  "properties": {
    "city": {"type": "string"}
  },
  "required": ["city"]
}

如果需要调用工具，请输出符合协议的 tool call。
```

真实产品可能不会这么直白地拼文本，也可能用特殊 token、隐藏模板或结构化约束。

但直觉是一样的：

> tools 参数会被转成模型能理解的工具说明和输出协议。

模型生成 tool call 后，服务端再把它解析成结构化 JSON。

## function calling 的真实链路

一次工具调用大概是：

```text
用户问：北京天气怎么样？
  ↓
HTTP body 里带 tools
  ↓
后端把工具 schema 渲染进 prompt
  ↓
Transformer 生成一个 tool call
  ↓
服务端解析 tool call
  ↓
业务后端执行 get_weather(city="北京")
  ↓
工具结果作为 tool message 再放回上下文
  ↓
模型根据工具结果生成最终回答
```

所以 tools 不是“模型自己联网”。

而是：

```text
模型决定要不要调用工具
服务端负责执行工具
工具结果再回到模型上下文
```

## Structured Output 怎么进入底层

如果你要求模型输出 JSON，最弱的方式是只写 prompt：

```text
请输出 JSON。
```

更强的方式是 API 层给结构化输出约束。

服务端可能会做两件事：

1. 把格式要求写进 prompt。
2. 在解码时使用 grammar / schema / constrained decoding 限制输出。

直觉：

```text
普通生成：模型什么 token 都可能选
受约束生成：非法 JSON token 不允许选
```

这就是为什么结构化输出不只是 prompt engineering，也和解码器有关。

## 第四层：Tokenizer

Prompt template 渲染完成后，还是文本。

Transformer 不能直接处理文本。

于是要 tokenizer：

```text
渲染后的 prompt 文本
  ↓
tokenizer.encode(...)
  ↓
token id 序列
```

例子：

```text
<|user|>
解释一下 MoE。
<|assistant|>
```

可能变成：

```text
[128001, 882, 198, 12345, 34567, 128002, 198, 128003]
```

这些数字才是 Transformer 真正接收的输入。

## 第五层：Transformer 怎么处理 API 请求

到了底层，API 的概念已经消失。

模型只看到：

```text
token id: [128001, 882, 198, ...]
```

然后进入 Transformer：

```text
token id
  ↓
embedding
  ↓
position encoding / RoPE
  ↓
多层 Transformer block
  ↓
logits
  ↓
sampling
  ↓
下一个 token
```

### prefill

prefill 是处理输入 prompt 的阶段。

假设 prompt 有 2000 个 token。

模型先把这 2000 个 token 全部过一遍 Transformer，建立上下文表示，并生成 KV Cache。

直觉：

```text
prefill = 阅读题目
```

prefill 的成本主要和输入长度有关。

### decode

decode 是逐 token 生成输出的阶段。

模型每次生成一个 token：

```text
生成第 1 个 token
  ↓
把它追加到上下文
  ↓
生成第 2 个 token
  ↓
继续
```

直觉：

```text
decode = 一个字一个字写答案
```

decode 的速度受：

- KV Cache。
- batch。
- 显存带宽。
- 模型大小。
- 并发数量。
- 采样策略。

共同影响。

## 参数在哪里生效

很多 API 参数不是在同一层生效的。

| 参数 | 生效位置 | 作用 |
| --- | --- | --- |
| `model` | 路由层 | 选择哪个模型服务 |
| `messages` / `input` | prompt 渲染层 | 决定输入内容 |
| `instructions` | prompt 渲染层 | 放入高优先级指令 |
| `tools` | prompt 渲染层 + 工具执行层 | 提供工具 schema 和执行协议 |
| `temperature` | 采样层 | 调整 logits 分布的尖锐程度 |
| `top_p` | 采样层 | 只保留累计概率范围内 token |
| `max_output_tokens` | 解码控制层 | 限制最多生成 token 数 |
| `stop` | 解码控制层 | 生成到指定文本时停止 |
| `stream` | HTTP 返回层 | 是否用流式事件返回 |

所以 API 参数不是都在 prompt 里。

有些影响 prompt，有些影响推理服务，有些影响采样和返回协议。

## temperature 到底做了什么

Transformer 最后一层会输出 logits。

可以理解成每个候选 token 的原始分数：

```text
苹果：8.0
香蕉：7.2
火车：1.1
```

temperature 会调整这些分数。

直觉：

```text
低 temperature：高分 token 更容易被选中，输出更稳定
高 temperature：低分 token 也更有机会，输出更多样
```

如果任务是：

```text
从日志里抽取订单号
```

通常希望低温。

如果任务是：

```text
给产品起 20 个名字
```

可以提高温度。

## top_p 到底做了什么

top_p 是 nucleus sampling。

假设模型给候选 token 概率：

```text
A：0.50
B：0.25
C：0.15
D：0.05
E：0.05
```

如果：

```text
top_p = 0.90
```

就只保留累计概率达到 0.90 的候选：

```text
A + B + C = 0.90
```

D 和 E 会被排除。

所以：

```text
temperature 调概率形状
top_p 控候选集合大小
```

一般先调 temperature，不要一开始两个一起乱调。

## stream 是什么

非流式返回：

```text
服务端等模型生成完整答案
  ↓
一次性返回 HTTP JSON
```

流式返回：

```text
模型每生成一点
  ↓
服务端通过 SSE 发一个事件
  ↓
前端边收边显示
```

HTTP 上常见的是：

```http
Content-Type: text/event-stream
```

事件长得类似：

```text
data: {"type":"response.output_text.delta","delta":"你好"}

data: {"type":"response.output_text.delta","delta":"，"}

data: {"type":"response.completed"}
```

不同 API 的事件字段会不同，但底层思想一样：

```text
decode 每吐出一小段，HTTP 层就推给客户端。
```

### Streaming 请求示例

Responses API 里可以这样请求流式输出：

```bash
curl https://api.openai.com/v1/responses \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-5.5",
    "input": "用两句话解释 prefill 和 decode。",
    "stream": true
  }'
```

Chat Completions API 也可以用类似方式：

```bash
curl https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-5.5",
    "messages": [
      {"role": "user", "content": "用两句话解释 prefill 和 decode。"}
    ],
    "stream": true
  }'
```

从底层看，stream 不会改变 Transformer 的生成方式。

它改变的是返回方式：

```text
decode 生成 token
  ↓
response formatter 包装增量
  ↓
SSE event 推给客户端
```

## OpenAI-compatible API 是什么

很多本地部署框架会提供类似接口：

```text
POST http://localhost:8000/v1/chat/completions
```

你发：

```json
{
  "model": "Qwen2.5-7B-Instruct",
  "messages": [
    {"role": "user", "content": "解释一下 Transformer"}
  ],
  "temperature": 0.7
}
```

服务端可能是：

- vLLM。
- SGLang。
- llama.cpp server。
- Text Generation Inference。
- 自己写的 FastAPI 服务。

这就是 OpenAI-compatible：

> HTTP 接口格式尽量像 OpenAI，但底层模型和推理引擎可以是你自己的。

## OpenAI-compatible 服务端最小伪实现

下面不是生产代码，只是帮助理解后端链路。

```python
@app.post("/v1/chat/completions")
def chat_completions(request):
    body = request.json()

    model_name = body["model"]
    messages = body["messages"]
    temperature = body.get("temperature", 1.0)
    top_p = body.get("top_p", 1.0)
    max_tokens = body.get("max_tokens", 512)

    model, tokenizer = model_registry.get(model_name)

    # 1. 把结构化 messages 渲染成模型熟悉的 chat template。
    prompt_text = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True,
    )

    # 2. 文本变 token id。
    input_ids = tokenizer.encode(prompt_text)

    # 3. 推理引擎做 prefill + decode + sampling。
    output_ids = engine.generate(
        input_ids=input_ids,
        temperature=temperature,
        top_p=top_p,
        max_tokens=max_tokens,
    )

    # 4. token id 变回文本。
    text = tokenizer.decode(output_ids)

    # 5. 包装成 OpenAI-compatible 响应。
    return {
        "object": "chat.completion",
        "choices": [
            {
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": text
                },
                "finish_reason": "stop"
            }
        ]
    }
```

这段伪代码对应：

```text
HTTP JSON
  ↓
messages
  ↓
chat_template
  ↓
prompt_text
  ↓
tokenizer.encode
  ↓
input_ids
  ↓
Transformer generate
  ↓
output_ids
  ↓
tokenizer.decode
  ↓
response formatter
  ↓
HTTP JSON
```

vLLM、SGLang、llama.cpp server 做的事情比这复杂得多，但学习时可以先用这段伪代码建立主线。

真正的生产服务还会处理：

- 鉴权和限流。
- 请求排队。
- continuous batching。
- prefix cache。
- KV Cache 显存管理。
- streaming SSE。
- 工具调用。
- structured output。
- 错误码和监控。

## 一个完整例子

用户发 HTTP：

```json
{
  "model": "qwen2.5-7b-instruct",
  "messages": [
    {"role": "system", "content": "你是一个机器学习老师。"},
    {"role": "user", "content": "用一句话解释 attention。"}
  ],
  "temperature": 0.3,
  "max_tokens": 100
}
```

后端渲染 prompt：

```text
<|im_start|>system
你是一个机器学习老师。
<|im_end|>
<|im_start|>user
用一句话解释 attention。
<|im_end|>
<|im_start|>assistant
```

tokenizer 编码：

```text
[151644, 8948, 198, 56568, 99185, ...]
```

Transformer prefill：

```text
读完整个 prompt，建立 KV Cache
```

Transformer decode：

```text
第 1 步生成：Attention
第 2 步生成：是
第 3 步生成：让
...
```

采样参数生效：

```text
temperature=0.3 让输出更稳定
max_tokens=100 限制最多生成 100 个 token
```

后端返回：

```json
{
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "Attention 是让模型在处理当前 token 时，判断应该重点参考哪些上下文 token 的机制。"
      }
    }
  ]
}
```

## 和上下文工程的关系

现在再看上下文工程，就更清楚了。

上下文工程不是只写一句 prompt。

它实际发生在：

```text
HTTP 请求体如何组织
messages 顺序如何安排
system/developer/user/tool 如何分层
tools schema 如何暴露
检索结果放在哪里
历史对话如何压缩
prompt template 是否稳定
是否利于 prefix cache
```

也就是说：

> 上下文工程就是在 HTTP API 和 Transformer 之间，设计高质量、可控、可缓存、可调试的输入结构。

## SDK 在哪里

SDK 只是把 HTTP 请求封装了一层。

比如你写：

```python
client.chat.completions.create(...)
```

它内部大致就是：

```text
组装 JSON body
  ↓
加 Authorization Header
  ↓
POST /v1/chat/completions
  ↓
解析 HTTP response
```

所以学习顺序应该是：

```text
先懂 HTTP API
再懂 prompt/template 渲染
再懂 tokenizer 和 Transformer
最后再看 SDK 怎么帮你少写样板代码
```

## 最小学习路线

建议按这个顺序学：

1. 会手写 `curl` 调 `/v1/responses`。
2. 会手写 `curl` 调 `/v1/chat/completions`。
3. 理解 `messages`、`role`、`instructions`、`tools` 在 HTTP JSON 中的位置。
4. 理解服务端如何把 `messages` 渲染成 chat template。
5. 理解 tokenizer 如何把 prompt text 变成 token id。
6. 理解 prefill、decode、KV Cache。
7. 理解 `temperature`、`top_p`、`max_output_tokens` 在采样和解码阶段生效。
8. 再看 vLLM、SGLang、llama.cpp 如何提供 OpenAI-compatible API。

## 参考资料

- [OpenAI Text generation guide](https://developers.openai.com/api/docs/guides/text)
- [OpenAI Responses API reference](https://developers.openai.com/api/reference/resources/responses/methods/create)
- [OpenAI Chat Completions API reference](https://developers.openai.com/api/reference/resources/chat)
- [vLLM OpenAI-compatible server](https://docs.vllm.ai/en/stable/serving/openai_compatible_server/)
- [SGLang Docs](https://docs.sglang.io/)
- [llama.cpp GitHub](https://github.com/ggml-org/llama.cpp)
