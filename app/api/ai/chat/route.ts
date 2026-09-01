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

    const DEFAULT_ZHIPU_KEY = '86ddb734dcf141e0acddfd790835ab1e.w24CRgqQbd6g9GPt';
    const apiKey = process.env.ZHIPU_API_KEY || DEFAULT_ZHIPU_KEY;
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

【极度重要的状态识别与逻辑推理纪律（必须严格遵守）】：
1. **严格区分任务状态与项目生命周期**：
   - **已完成/已验收任务**：标记为 \`status: done\` 的任务是已经验收结项的任务，**绝对严禁**将其作为“未完成”或“进行中待办”列出！
   - **挂起/暂停项目任务**：如果任务所属项目（或模块）处于【已暂停/挂起】（如《AI产品宣传视频制作》）或【未开始】状态，该任务处于搁置状态，**绝对不能**算作“活跃进行中”！
   - **无截止日任务**：截止日为“无/未设定”的任务通常是长期常规性工作或未排期事项，在梳理紧急进度时需明确标注并与有具体排期的主线任务区分，不能混为一谈。

2. **【核心智能准则】遇不确定或边界模糊时，主动停下来澄清边界条件并触发交互决策点**：
   - 真正智能的架构师在面对用户宽泛、多义性或未限定范围的提问（如“梳理所有未完成进行中的”、“看看有哪些风险”、“帮我规划 WBS”等）时，**绝不无脑平铺所有杂乱数据**，而是：
     1. 简要说明当前系统中的数据分歧与边界维度（如区分：活跃有排期主线、长期常规无排期、挂起暂停项目）；
     2. 在回答结尾独占一行输出结构化交互标记 \`[requires_user_input: ...]\`，提供 2~3 个具体维度的决策选项（A、B、C 等），让用户可以直接点击一键回传决策继续，而不是让用户手动打字。
   - **交互选项标记协议规范（单行输出于文末）**：
     \`[requires_user_input:{"title":"请选择您希望进一步聚焦的边界条件：","items":[{"id":"A","label":"仅看主线明确有排期的紧急待办","desc":"聚焦当前活跃推进项目的关键节点（排除挂起与无排期）","prompt":"请仅筛选有明确截止日且处于活跃推进主线中的紧急进行中任务，按负责人归纳"},{"id":"B","label":"包含无截止日的常规日常待办","desc":"将无排期的日常维护/支持性任务一并分类呈现","prompt":"请将包含无截止日期的日常常规未完成任务一并梳理"},{"id":"C","label":"全景透视（包含挂起/暂停项目）","desc":"展示系统内全部未完成事项，并明确区分活跃推进与挂起状态","prompt":"请按项目和负责人全景展示系统内所有未完成任务，明确标注挂起与正常状态"}]}]\`
   - 选项中的 \`prompt\` 必须是具体、完整、无歧义的指令。当用户点击任一选项后，系统会将该 \`prompt\` 再次发送给你，你收到后应当立即依据该特定边界条件输出深度、严密、指名道姓的最终业务分析，无需再次询问！

3. **拒绝 AI Slop 与流水账平铺**：
   - 站在资深架构师和项目总监高度，结构化输出，采用“按负责人归纳”、“按主线优先级划分”、“关键瓶颈与交付物核对”的方式呈现。

回复规范与排版美学：
1. 你的回答应当【专业、全面、结构清晰、极具落地参考价值】。
2. 排版美学：如果使用标题，必须用标准的 markdown 标题语法（如“### 标题内容”，即「井号」后面必须带空格）。
3. 可视化图表集成：当分析趋势、分布或进度时，可结合上下文使用：
   - 过去一周进度增长曲线：[CHART:TREND]
   - 各项目进度对比柱状图：[CHART:PROJECTS]
   - 任务状态比例分布饼图：[CHART:TASKS]`;

    if (context) {
      systemContent += `\n\n【用户当前正在浏览的项目细节数据 (WBS 树)】：\n${context}\n\n请结合此细化项目数据和全局数据，提供深刻的解答。`;
    }

    const systemPrompt = {
      role: 'system',
      content: systemContent,
    };

    const finalMessages = [systemPrompt, ...messages.filter((m) => m.role !== 'system')];

    // 3. 请求智谱 AI 流式传输接口 (支持 glm-4.7-flash -> glm-4-flash 故障/限流自动回退)
    const candidateModels = ['glm-4.7-flash', 'glm-4-flash'];
    let zhipuResponse: Response | null = null;
    const errorsList: string[] = [];

    for (const model of candidateModels) {
      try {
        const resp = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: finalMessages,
            temperature: 0.7,
            top_p: 0.9,
            max_tokens: 2000,
            stream: true,
          }),
        });

        if (resp.ok && resp.body) {
          zhipuResponse = resp;
          break;
        } else {
          const errText = await resp.text();
          console.warn(`Zhipu AI [${model}] stream request failed (${resp.status}):`, errText);
          errorsList.push(`[${model}] 状态码 ${resp.status}: ${errText}`);
        }
      } catch (err: any) {
        console.warn(`Zhipu AI [${model}] fetch connection error:`, err.message);
        errorsList.push(`[${model}] 连接失败: ${err.message}`);
      }
    }

    if (!zhipuResponse || !zhipuResponse.body) {
      console.error('All Zhipu AI candidate models failed:', errorsList);
      return NextResponse.json(
        {
          ok: false,
          error: '智谱 AI 对话服务暂时不可用（已尝试备用基座模型），请稍后再试。',
          details: errorsList.join('\n'),
        },
        { status: 503 }
      );
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
