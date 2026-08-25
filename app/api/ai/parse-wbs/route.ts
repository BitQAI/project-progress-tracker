import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { WbsParseTargetLevel, ParsedDraftNode, ParsedDraftTask } from '@/lib/ai-wbs-types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function buildSystemPrompt(targetLevel: WbsParseTargetLevel, contextName?: string, defaultOwner?: string): string {
  const resolvedOwner = defaultOwner?.trim() || '负责人';
  const resolvedContext = contextName?.trim() || '未命名项目项';

  const commonRules = `
【解析与属性提取核心规则（极致优化）】：
1. 子任务/任务名称(name)：提取或总结为清晰、可落地、面向交付的动宾短语。例如“编写退款状态机核心代码”、“部署自动化CI/CD流水线”，避免模糊词汇。
2. 负责人(owner)：精准识别非结构化文本中提及的责任人；如果未提及，则填入「${resolvedOwner}」。
3. 预估工期(estimatedDuration)：**必须显式提取并填入工期**。如果输入文本中包含如“3天”、“2周”、“4小时”等工期描述，请将其精准提取；**如果输入文本完全没有提及工期，你必须作为资深敏捷项目经理，根据该任务在 IT 研发中的实际复杂度与行业规范，智能推算并自动补全一个极为合理且具体的工期描述（例如：普通API开发 3天、联调测试 2天、架构设计与表结构 3天、配置申请/商户秘钥 1天、上线发布 1天等），绝对不能留空**。
4. 截止日期(dueDate)：提取具体日期（格式 YYYY-MM-DD），未指定可留空，或根据工期推算。
5. 交付物验收/交付标准(hasDeliverable & deliverableRequirement)：**必须显式定义交付及验收标准**。如果输入中显式提到了交付要求（如“交付测试报告”），请精准归纳并填入；**若输入完全未提及交付标准，你必须根据专业软件工程标准，为该项工作智能设计并补全具体的交付物与验收标准说明（例如：API接口任务 -> '交付符合规范的 Swagger 文档及单元测试用例通过报告'；前端开发任务 -> '交付可运行的界面代码并完成全链路联调与视觉还原验收'；后端开发任务 -> '交付经过单元测试的后端业务逻辑代码并完成主分支合并'；运维部署任务 -> '完成生产环境部署、提供健康检查接口及可用性验证截图'；配置/秘钥申请 -> '交付申请成功的账户秘钥库及本地配置调试说明'）**，并标记 hasDeliverable: true。绝不能留空或填“无”。`;

  if (targetLevel === 'task_subtasks') {
    return `你是一名资深的敏捷项目总监与系统架构师（BitQAI）。
你的任务是将用户提供的非结构化文本（如需求说明、开发计划、实施步骤等）智能拆解为主任务「${resolvedContext}」下的【细分子任务清单 (Subtasks)】。
默认负责人：${resolvedOwner}
${commonRules}

【严格输出格式】：
只输出合法的 JSON 格式纯文本（不要输出任何额外的问候语或说明）。JSON 格式如下：
{
  "summary": "已将主任务拆解为 X 个细分子任务",
  "tasks": [
    {
      "name": "子任务名称",
      "owner": "${resolvedOwner}",
      "estimatedDuration": "2天",
      "dueDate": "2026-09-05",
      "hasDeliverable": true,
      "deliverableRequirement": "需交付物验收标准说明"
    }
  ]
}`;
  }

  if (targetLevel === 'node_tasks') {
    return `你是一名资深的敏捷项目总监与系统架构师（BitQAI）。
你的任务是将用户提供的非结构化文本智能拆解为模块/分组「${resolvedContext}」下的【具体工作任务清单 (Tasks)】。
默认负责人：${resolvedOwner}
${commonRules}

【严格输出格式】：
只输出合法的 JSON 格式纯文本：
{
  "summary": "已为模块拆解出 X 项具体任务",
  "tasks": [
    {
      "name": "任务名称",
      "owner": "${resolvedOwner}",
      "estimatedDuration": "3天",
      "dueDate": "2026-09-10",
      "hasDeliverable": true,
      "deliverableRequirement": "需交付物验收标准说明"
    }
  ]
}`;
  }

  // project_subnodes
  return `你是一名资深的敏捷项目总监与系统架构师（BitQAI）。
你的任务是将用户提供的非结构化文本智能拆解为项目的【分组/模块节点 (Nodes)】及各模块下的【初始任务列表 (Tasks)】。
默认负责人：${resolvedOwner}
${commonRules}

【严格输出格式】：
只输出合法的 JSON 格式纯文本：
{
  "summary": "已拆解为 X 个模块及 Y 项任务",
  "nodes": [
    {
      "name": "模块名称",
      "owner": "${resolvedOwner}",
      "estimatedDuration": "2周",
      "dueDate": "2026-09-15",
      "description": "模块描述",
      "tasks": [
        {
          "name": "任务名称",
          "owner": "${resolvedOwner}",
          "estimatedDuration": "3天",
          "dueDate": "2026-09-10",
          "hasDeliverable": true,
          "deliverableRequirement": "交付物验收说明"
        }
      ]
    }
  ]
}`;
}

function extractJsonFromText(rawText: string): any {
  let cleaned = (rawText || '').trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```\s*$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/```\s*$/, '');
  }
  cleaned = cleaned.trim();

  // 1. 直接 JSON.parse
  try {
    return JSON.parse(cleaned);
  } catch {
    // 2. 匹配最外层 { ... }
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const jsonCandidate = cleaned.substring(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(jsonCandidate);
      } catch {
        // ignore
      }
    }

    // 3. 匹配最外层 [ ... ]
    const firstBracket = cleaned.indexOf('[');
    const lastBracket = cleaned.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      const jsonCandidate = cleaned.substring(firstBracket, lastBracket + 1);
      try {
        return JSON.parse(jsonCandidate);
      } catch {
        // ignore
      }
    }
  }

  return JSON.parse(cleaned);
}

function guessDeliverableRequirement(taskName: string): string {
  const name = taskName.toLowerCase();
  if (name.includes('接口') || name.includes('api') || name.includes('swagger') || name.includes('对接') || name.includes('联调')) {
    return '交付符合规范的 API 接口设计文档及 Swagger 联调成功截图';
  }
  if (name.includes('前端') || name.includes('页面') || name.includes('界面') || name.includes('ui') || name.includes('渲染') || name.includes('还原')) {
    return '交付高还原度前端页面，通过团队视觉验收并完成前后端接口联调';
  }
  if (name.includes('部署') || name.includes('配置') || name.includes('环境') || name.includes('上线') || name.includes('发布') || name.includes('ci') || name.includes('cd') || name.includes('构建') || name.includes('托管') || name.includes('运维')) {
    return '完成环境部署并提供健康检查接口及可用性/监控验证截图';
  }
  if (name.includes('后端') || name.includes('开发') || name.includes('服务') || name.includes('代码') || name.includes('逻辑') || name.includes('数据库') || name.includes('表结构') || name.includes('设计') || name.includes('架构')) {
    return '交付经过单元测试验证的后端业务逻辑代码并完成主分支合并';
  }
  if (name.includes('测试') || name.includes('用例') || name.includes('压测') || name.includes('缺陷') || name.includes('bug')) {
    return '交付完整的测试用例库，及功能/兼容性测试用例全部通过的报告';
  }
  if (name.includes('资质') || name.includes('账号') || name.includes('申请') || name.includes('秘钥') || name.includes('密钥') || name.includes('证书') || name.includes('公钥') || name.includes('私钥')) {
    return '交付申请成功的资质证书/账户秘钥库及本地配置集成调试说明';
  }
  if (name.includes('需求') || name.includes('文档') || name.includes('prd') || name.includes('原型') || name.includes('评审')) {
    return '交付评审通过的需求规格说明书、系统流程图或高保真原型文件';
  }
  return '交付任务对应的工作成果产出、系统功能通过验证且无遗留阻碍缺陷';
}

function normalizeSingleTask(
  rawTask: any,
  tIdx: number,
  timestamp: number,
  defaultOwner: string,
  prefix: string = 'draft_task'
): ParsedDraftTask {
  const name =
    (typeof rawTask === 'string'
      ? rawTask
      : rawTask?.name ||
        rawTask?.title ||
        rawTask?.task_name ||
        rawTask?.taskName ||
        rawTask?.subtask_name ||
        rawTask?.subtaskName ||
        rawTask?.content ||
        rawTask?.item ||
        `任务项 ${tIdx + 1}`
    ).toString().trim();

  const owner =
    (typeof rawTask === 'object' && rawTask !== null
      ? rawTask.owner ||
        rawTask.assignee ||
        rawTask.person ||
        rawTask.responsible ||
        rawTask.author ||
        defaultOwner
      : defaultOwner
    )?.toString().trim() || defaultOwner || '负责人';

  const estimatedDuration =
    (typeof rawTask === 'object' && rawTask !== null
      ? rawTask.estimatedDuration ||
        rawTask.estimated_duration ||
        rawTask.duration ||
        rawTask.estimate ||
        rawTask.estimated_time ||
        rawTask.time ||
        ''
      : ''
    )?.toString().trim();

  const dueDate =
    (typeof rawTask === 'object' && rawTask !== null
      ? rawTask.dueDate ||
        rawTask.due_date ||
        rawTask.deadline ||
        rawTask.end_date ||
        rawTask.endDate ||
        null
      : null
    )?.toString().trim() || null;

  const deliverableRequirementRaw =
    (typeof rawTask === 'object' && rawTask !== null
      ? rawTask.deliverableRequirement ||
        rawTask.deliverable_requirement ||
        rawTask.deliverable ||
        rawTask.deliverables ||
        rawTask.acceptanceCriteria ||
        rawTask.acceptance_criteria ||
        rawTask.deliverable_desc ||
        ''
      : ''
    )?.toString().trim() || '';

  // 智能交付/验收要求兜底逻辑
  const isMeaningless = !deliverableRequirementRaw || 
    ['无', '否', 'none', 'null', 'undefined', '暂无', '待定', '工作完成', '任务完成', '验收说明'].includes(deliverableRequirementRaw.toLowerCase());
  
  const deliverableRequirement = isMeaningless 
    ? guessDeliverableRequirement(name) 
    : deliverableRequirementRaw;

  const hasDeliverable = true; // 项目管理最佳规范：每一项子任务皆应当有明确的交付件或验收要求

  return {
    id: `${prefix}_${timestamp}_${tIdx + 1}`,
    name: name || `任务项 ${tIdx + 1}`,
    owner: owner || defaultOwner || '负责人',
    dueDate: dueDate || null,
    estimatedDuration: estimatedDuration || '',
    hasDeliverable,
    deliverableRequirement,
    selected: true,
  };
}

async function callZhipu(model: string, apiKey: string, systemInstruction: string, userPrompt: string): Promise<string> {
  const zhipuResponse = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 3000,
    }),
  });

  if (!zhipuResponse.ok) {
    const errText = await zhipuResponse.text();
    console.error(`Zhipu AI [${model}] Parse WBS Error:`, zhipuResponse.status, errText);
    throw new Error(`智谱 AI [${model}] 请求失败 (状态码: ${zhipuResponse.status})`);
  }

  const zhipuData = await zhipuResponse.json();
  return zhipuData.choices?.[0]?.message?.content || '';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, targetLevel = 'project_subnodes', contextName } = body;
    const defaultOwner = (body.defaultOwner || '').trim() || '负责人';

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ ok: false, error: '请输入需要解析的文本内容' }, { status: 400 });
    }

    const systemInstruction = buildSystemPrompt(targetLevel, contextName, defaultOwner);
    const userPrompt = `用户输入的待解析内容如下：\n"""\n${text.trim()}\n"""\n\n请严格按照要求解析为结构化 JSON 数据。`;

    let rawText = '';
    const DEFAULT_ZHIPU_KEY = '4f9c32afead84dee800abd7e517ad492.QySLiv9Y0RB6SFCo';
    const zhipuApiKey = process.env.ZHIPU_API_KEY || DEFAULT_ZHIPU_KEY;
    const errorsList: string[] = [];

    // 优先使用智谱 AI glm-4.6v-flash 免费高效多模态基座模型，若失败依次向下级联回退
    if (zhipuApiKey) {
      try {
        rawText = await callZhipu('glm-4.6v-flash', zhipuApiKey, systemInstruction, userPrompt);
      } catch (zhipuErr: any) {
        console.warn('Zhipu AI glm-4.6v-flash call failed, trying glm-4.7-flash:', zhipuErr.message);
        errorsList.push(`glm-4.6v-flash: ${zhipuErr.message}`);

        try {
          rawText = await callZhipu('glm-4.7-flash', zhipuApiKey, systemInstruction, userPrompt);
        } catch (zhipuErr47: any) {
          console.warn('Zhipu AI glm-4.7-flash call failed, trying stable glm-4-flash fallback:', zhipuErr47.message);
          errorsList.push(`glm-4.7-flash: ${zhipuErr47.message}`);
          
          try {
            rawText = await callZhipu('glm-4-flash', zhipuApiKey, systemInstruction, userPrompt);
          } catch (zhipuFallbackErr: any) {
            console.error('Zhipu AI glm-4-flash fallback also failed:', zhipuFallbackErr.message);
            errorsList.push(`glm-4-flash: ${zhipuFallbackErr.message}`);
          }
        }
      }
    }

    // 回退至 Gemini
    if (!rawText) {
      const geminiAi = getGeminiClient();
      if (!geminiAi) {
        const consolidatedError = errorsList.length > 0 
          ? `智谱 AI 解析失败且系统未配置 Gemini 智能兜底。详细错误如下：\n${errorsList.join('\n')}`
          : '系统未配置任何可用的 AI API Key (ZHIPU_API_KEY 或 GEMINI_API_KEY)';
        return NextResponse.json({ ok: false, error: consolidatedError }, { status: 500 });
      }

      try {
        const response = await geminiAi.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: userPrompt,
          config: {
            systemInstruction,
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
        });
        rawText = response.text || '{}';
      } catch (geminiErr: any) {
        console.error('Gemini AI API call failed:', geminiErr);
        let helpfulMessage = geminiErr.message || String(geminiErr);
        if (helpfulMessage.includes('PERMISSION_DENIED') || helpfulMessage.includes('403')) {
          helpfulMessage = 'Gemini API Key 权限不足 (PERMISSION_DENIED / 403)。这通常是因为该 API Key 关联的 Google Cloud / AI Studio 账号被拒绝访问，请检查 Key 或联系管理员。';
        }

        const finalErrorMsg = errorsList.length > 0
          ? `AI 智能分析调用全部失败。\n【智谱 AI 异常】:\n  ${errorsList.join('\n  ')}\n【Gemini 智能兜底异常】:\n  ${helpfulMessage}`
          : `AI 智能分析解析失败: ${helpfulMessage}`;

        return NextResponse.json({ ok: false, error: finalErrorMsg }, { status: 500 });
      }
    }

    let parsedJson: any;
    try {
      parsedJson = extractJsonFromText(rawText);
    } catch (parseErr) {
      console.error('Failed to parse AI JSON response:', rawText, parseErr);
      parsedJson = { summary: '解析完成', nodes: [], tasks: [] };
    }

    const timestamp = Date.now();
    let normalizedNodes: ParsedDraftNode[] | undefined;
    let normalizedTasks: ParsedDraftTask[] | undefined;

    if (targetLevel === 'project_subnodes') {
      let rawNodesList: any[] = [];
      if (Array.isArray(parsedJson)) {
        rawNodesList = parsedJson;
      } else if (Array.isArray(parsedJson.nodes)) {
        rawNodesList = parsedJson.nodes;
      } else if (Array.isArray(parsedJson.subnodes)) {
        rawNodesList = parsedJson.subnodes;
      } else if (Array.isArray(parsedJson.modules)) {
        rawNodesList = parsedJson.modules;
      } else if (Array.isArray(parsedJson.groups)) {
        rawNodesList = parsedJson.groups;
      } else if (Array.isArray(parsedJson.items)) {
        rawNodesList = parsedJson.items;
      } else if (Array.isArray(parsedJson.tasks)) {
        rawNodesList = [
          {
            name: contextName ? `${contextName}模块` : '核心模块',
            owner: defaultOwner || '负责人',
            tasks: parsedJson.tasks,
          },
        ];
      }

      normalizedNodes = rawNodesList.map((node: any, nIdx: number) => {
        const nodeOwner =
          node.owner || node.assignee || node.person || defaultOwner || '负责人';
        const nodeDuration =
          node.estimatedDuration || node.estimated_duration || node.duration || '';
        const nodeDueDate = node.dueDate || node.due_date || node.deadline || null;
        const rawChildTasks = Array.isArray(node.tasks)
          ? node.tasks
          : Array.isArray(node.subtasks)
          ? node.subtasks
          : Array.isArray(node.items)
          ? node.items
          : [];

        return {
          id: `draft_node_${timestamp}_${nIdx + 1}`,
          name: node.name || node.title || node.moduleName || `子模块 ${nIdx + 1}`,
          owner: nodeOwner,
          estimatedDuration: nodeDuration,
          dueDate: nodeDueDate,
          description: node.description || node.desc || '',
          priority: 'P1',
          tasks: rawChildTasks.map((task: any, tIdx: number) =>
            normalizeSingleTask(
              task,
              tIdx,
              timestamp,
              nodeOwner,
              `draft_node_${timestamp}_${nIdx + 1}_task`
            )
          ),
          selected: true,
        };
      });
    } else {
      // targetLevel === 'node_tasks' | 'task_subtasks'
      let rawTaskList: any[] = [];
      if (Array.isArray(parsedJson)) {
        rawTaskList = parsedJson;
      } else if (Array.isArray(parsedJson.tasks)) {
        rawTaskList = parsedJson.tasks;
      } else if (Array.isArray(parsedJson.subtasks)) {
        rawTaskList = parsedJson.subtasks;
      } else if (Array.isArray(parsedJson.subTasks)) {
        rawTaskList = parsedJson.subTasks;
      } else if (Array.isArray(parsedJson.items)) {
        rawTaskList = parsedJson.items;
      } else if (Array.isArray(parsedJson.data)) {
        rawTaskList = parsedJson.data;
      } else if (Array.isArray(parsedJson.taskList)) {
        rawTaskList = parsedJson.taskList;
      } else if (Array.isArray(parsedJson.list)) {
        rawTaskList = parsedJson.list;
      } else if (Array.isArray(parsedJson.nodes)) {
        rawTaskList = parsedJson.nodes.flatMap((n: any) =>
          Array.isArray(n.tasks) && n.tasks.length > 0
            ? n.tasks
            : Array.isArray(n.subtasks)
            ? n.subtasks
            : [n]
        );
      }

      normalizedTasks = rawTaskList.map((task: any, tIdx: number) =>
        normalizeSingleTask(task, tIdx, timestamp, defaultOwner, 'draft_task')
      );
    }

    const defaultSummary =
      targetLevel === 'task_subtasks'
        ? `已成功拆解 ${(normalizedTasks || []).length} 项细分子任务`
        : targetLevel === 'node_tasks'
        ? `已成功拆解 ${(normalizedTasks || []).length} 项模块任务`
        : `已成功拆解 ${(normalizedNodes || []).length} 个模块分组`;

    return NextResponse.json({
      ok: true,
      data: {
        targetLevel,
        summary: parsedJson.summary || defaultSummary,
        nodes: normalizedNodes,
        tasks: normalizedTasks,
      },
    });
  } catch (err: any) {
    console.error('AI Parse WBS error:', err);
    return NextResponse.json(
      { ok: false, error: err.message || 'AI 智能解析服务异常，请稍后重试' },
      { status: 500 }
    );
  }
}
