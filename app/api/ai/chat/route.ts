import { NextRequest, NextResponse } from 'next/server';
import { getProjectsSummaryList } from '@/lib/project-service';
import { getDb, ensureDbLoaded } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { messages, context } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ ok: false, error: '参数错误，必须传入 messages 数组。' }, { status: 400 });
    }

    const apiKey = process.env.ZHIPU_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: '服务器未配置 ZHIPU_API_KEY 环境变量，请检查配置文件。' },
        { status: 500 }
      );
    }

    // 1. 获取全局数据库状态以喂给 AI，使其能对系统中的所有项目有 360 度全局视野
    let globalContextText = '';
    try {
      // 必须显式异步拉取并填充 Supabase 状态，避免在冷启动或独立请求中落入本地 static 示例数据的备份
      const db = await ensureDbLoaded();
      const summaries = await getProjectsSummaryList();
      
      globalContextText = `【系统当前所有项目数据概览】：\n`;
      summaries.forEach((p, idx) => {
        globalContextText += `项目 #${idx + 1}: 「${p.name}」\n`;
        globalContextText += `- 负责人: ${p.owner} | 优先级: ${p.priority} | 状态: ${p.status}\n`;
        globalContextText += `- 整体进度: ${p.progress}% (已完成 ${p.completedTasks} / 共 ${p.totalTasks} 任务)\n`;
        globalContextText += `- 是否存在超期任务: ${p.isOverdue ? '⚠️ 是 (有 ' + p.overdueTasksCount + ' 个任务超期未交付)' : '✅ 否'}\n`;
        if (p.latestDueDate) {
          globalContextText += `- 计划截止日期: ${p.latestDueDate}\n`;
        }
        if (p.description) {
          globalContextText += `- 描述: ${p.description.substring(0, 150)}${p.description.length > 150 ? '...' : ''}\n`;
        }
        globalContextText += '\n';
      });

      // 提取未完成任务详情
      const pendingTasks = db.tasks.filter(t => t.status !== 'done');
      if (pendingTasks.length > 0) {
        globalContextText += `【系统当前所有未完成/进行中任务明细】：\n`;
        pendingTasks.forEach((t) => {
          const node = db.nodes.find(n => n.id === t.node_id);
          if (node) {
            // 追溯顶级项目
            let current = node;
            while (current.parent_id !== null) {
              const parent = db.nodes.find(n => n.id === current.parent_id);
              if (!parent) break;
              current = parent;
            }
            const isOverdue = t.due_date && t.due_date < new Date().toISOString().split('T')[0];
            globalContextText += `- [任务] 「${t.name}」| 负责人: ${t.owner} | 状态: ${t.status} | 截止日: ${t.due_date || '无'} | ${isOverdue ? '⚠️ 已超期' : '进行中'} | 隶属项目: 「${current.name}」\n`;
          }
        });
      }
    } catch (dbErr: any) {
      console.warn('API: Failed to inject global db context:', dbErr.message);
    }

    // 2. 默认加入 BitQAI 的专业系统设定与全局项目概览
    let systemContent = `你是一名人工智能助理，名字叫 BitQAI（高级软件工程师和系统架构师）。
你正处于一个“项目进度管理与执行监控系统（Progress Tracker）”中。该系统支持无限层级项目树（WBS）、交付件模板、超期预警和证据链留档。

【你的特权能力】：你已被赋予了数据库全局只读权限。当前系统中的所有项目数据都会自动汇总并在下方展示给你。你可以自主了解和访问所有项目的内容和数据，根据项目系统的数据情况来完成对话，给出极具落地价值的项目管理分析、建议和决策支持。

${globalContextText}

回复规范与排版美学：
1. 你的回答应当【专业、全面且极具落地参考价值】。请根据用户的提问提供深刻、详尽的解答，给出深度合理的 WBS 拆解或者全方位的风险纠偏方案，无需刻意压缩字数。请尽显专家的深度，完整并透彻地回答用户的问题。
2. 排版美学：如果使用标题，必须用标准的 markdown 标题语法（如“### 标题内容”，即「井号」后面必须带空格，不能写成“###项目”，严禁出现格式错乱的裸井号），我们的前端配备了完美的 Apple 风格标题渲染器。
3. 可视化图表集成：当分析“项目进度对比”、“任务状态分布”、“超期/待办情况”或“进度增长趋势”时，你可以在回复的合适段落后或末尾独占一行插入以下特定的图表标记：
   - 展现过去一周每日进度增长趋势曲线，请用标记：[CHART:TREND]
   - 展现各项目当前进度百分比对比柱状图，请用标记：[CHART:PROJECTS]
   - 展现当前系统内已完成、进行中、已逾期的任务比例饼图，请用标记：[CHART:TASKS]
   系统会在气泡下方自动提取这些标记并渲染为精美的 Recharts 可视化图表，极大地提高老板的阅读体验。

你的主要职责是：
1. 协助用户梳理项目目标，进行 WBS（工作分解结构）层级划分。
2. 结合上方提供的「当前所有项目数据概览」以及「未完成任务清单」，当用户询问类似“当前有哪些项目在推进”、“谁的任务超期了”、“帮我看看哪个项目有风险”时，请基于真实数据做出精准、多维度且有战略眼光的分析与总结！
3. 给出具体的工作包任务（Task）设计建议、计划工期和重要交付件标准。
4. 表现得像一个经验丰富的 Apple 首席项目总监：专业、睿智、温和，字里行间保持极简、极高审美的品味，使用温和得体的中文。`;

    if (context) {
      systemContent += `\n\n【用户当前正在浏览的项目细节数据 (WBS 树)】：\n${context}\n\n请结合此细化项目数据和全局数据，提供深刻的解答、合理的拆解或者风险纠偏方案。`;
    }

    const systemPrompt = {
      role: 'system',
      content: systemContent
    };

    // 确保 systemPrompt 在 messages 最前端
    const finalMessages = [systemPrompt, ...messages.filter(m => m.role !== 'system')];

    console.log('Sending chat request to Zhipu AI with model: glm-4-flash');

    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'glm-4-flash',
        messages: finalMessages,
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 1500
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Zhipu AI Response Error:', response.status, errText);
      return NextResponse.json(
        { ok: false, error: `智谱 AI 请求失败，状态码: ${response.status}`, details: errText },
        { status: response.status }
      );
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || '';

    return NextResponse.json({
      ok: true,
      text: reply,
      usage: data.usage
    });

  } catch (error: any) {
    console.error('API /api/ai/chat handler error:', error);
    return NextResponse.json({ ok: false, error: error.message || '内部服务器错误' }, { status: 500 });
  }
}
