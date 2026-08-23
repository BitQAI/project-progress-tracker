import { NextRequest, NextResponse } from 'next/server';
import { ensureDbLoaded } from '@/lib/db';
import { buildEnhancedAiKnowledgeContext } from '@/lib/ai-context-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { messages, context } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { ok: false, error: '参数错误，必须传入 messages 数组。' },
        { status: 400 }
      );
    }

    const apiKey = process.env.ZHIPU_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: '服务器未配置 ZHIPU_API_KEY 环境变量，请检查配置文件。' },
        { status: 500 }
      );
    }

    // 1. 获取全局关系型数据库结构化知识上下文
    let globalContextText = '';
    try {
      const db = await ensureDbLoaded();
      globalContextText = buildEnhancedAiKnowledgeContext(db);
    } catch (dbErr: any) {
      console.warn('API: Failed to inject global db context:', dbErr.message);
    }

    // 2. 注入 BitQAI 专家设定与 360 度全局上下文
    let systemContent = `你是一名人工智能助理，名字叫 BitQAI（高级软件工程师和系统架构师）。
你正处于一个“项目进度管理与执行监控系统（Progress Tracker）”中。该系统已重构为高保真关系型数据模型，涵盖无限层级 WBS、交付件证据库、排期调整审计与团队协作证据链。

【你的特权能力】：你已被赋予了数据库全局只读权限。当前系统中的所有关系型项目数据都会自动汇总并在下方展示给你。你可以精准了解和访问所有项目的内容、子模块责任人、已提交/待交付的成果详情、排期变更记录以及团队讨论，根据项目系统的真实数据做出极具深度、落地价值的分析与决策支持。

${globalContextText}

回复规范与排版美学：
1. 你的回答应当【专业、全面且极具落地参考价值】。请根据用户的提问提供深刻、详尽的解答，给出深度合理的 WBS 拆解、交付成果评估或者全方位的风险纠偏方案，无需刻意压缩字数。
2. 排版美学：如果使用标题，必须用标准的 markdown 标题语法（如“### 标题内容”，即「井号」后面必须带空格，不能写成“###项目”）。
3. 可视化图表集成：当分析“项目进度对比”、“任务状态分布”、“超期/待办情况”或“进度增长趋势”时，你可以在回复的合适段落后或末尾独占一行插入以下特定的图表标记：
   - 展现过去一周每日进度增长趋势曲线，请用标记：[CHART:TREND]
   - 展现各项目当前进度百分比对比柱状图，请用标记：[CHART:PROJECTS]
   - 展现当前系统内已完成、进行中、已逾期的任务比例饼图，请用标记：[CHART:TASKS]
   系统会在气泡下方自动提取这些标记并渲染为精美的 Recharts 可视化图表。

你的主要职责是：
1. 协助用户梳理项目目标，进行 WBS（工作分解结构）层级划分。
2. 结合上方提供的「关系型数据库全景数据」，当用户询问类似“李工负责哪些任务”、“有哪些交付件已提交”、“谁的任务超期了”、“帮我分析各项目风险”时，基于真实数据做出精准、指名道姓、有依据的回答！
3. 给出具体的工作包任务（Task）设计建议、计划工期和重要交付件标准。
4. 表现得像一个经验丰富的首席系统架构师与项目总监：专业、睿智、温和，字里行间保持极简、极高审美的品味，使用温和得体的中文。`;

    if (context) {
      systemContent += `\n\n【用户当前正在浏览的项目细节数据 (WBS 树)】：\n${context}\n\n请结合此细化项目数据和全局数据，提供深刻的解答。`;
    }

    const systemPrompt = {
      role: 'system',
      content: systemContent,
    };

    const finalMessages = [systemPrompt, ...messages.filter((m) => m.role !== 'system')];

    // 3. 请求智谱 AI glm-4-flash 流式传输接口 (stream: true)
    const zhipuResponse = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'glm-4-flash',
        messages: finalMessages,
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 2000,
        stream: true,
      }),
    });

    if (!zhipuResponse.ok) {
      const errText = await zhipuResponse.text();
      console.error('Zhipu AI Response Error:', zhipuResponse.status, errText);
      return NextResponse.json(
        { ok: false, error: `智谱 AI 请求失败，状态码: ${zhipuResponse.status}`, details: errText },
        { status: zhipuResponse.status }
      );
    }

    if (!zhipuResponse.body) {
      return NextResponse.json({ ok: false, error: '智谱 AI 响应流为空' }, { status: 500 });
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // 4. 构造 Server-Sent Events (SSE) 分块流，极速实时推送到前端
    const stream = new ReadableStream({
      async start(controller) {
        const reader = zhipuResponse.body!.getReader();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || trimmed.startsWith(':')) continue;

              if (trimmed === 'data: [DONE]') {
                controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
                continue;
              }

              if (trimmed.startsWith('data: ')) {
                try {
                  const jsonStr = trimmed.slice(6);
                  const parsed = JSON.parse(jsonStr);
                  const deltaContent = parsed.choices?.[0]?.delta?.content || '';
                  if (deltaContent) {
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ content: deltaContent })}\n\n`)
                    );
                  }
                } catch {
                  // 忽略不完整的中间数据分块
                }
              }
            }
          }

          if (buffer.trim()) {
            const trimmed = buffer.trim();
            if (trimmed.startsWith('data: ') && trimmed !== 'data: [DONE]') {
              try {
                const parsed = JSON.parse(trimmed.slice(6));
                const deltaContent = parsed.choices?.[0]?.delta?.content || '';
                if (deltaContent) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ content: deltaContent })}\n\n`)
                  );
                }
              } catch {}
            }
          }
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        } catch (streamErr: any) {
          console.error('Streaming transform error:', streamErr);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: streamErr.message || '流式传输异常' })}\n\n`
            )
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error: any) {
    console.error('API /api/ai/chat handler error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || '内部服务器错误' },
      { status: 500 }
    );
  }
}
