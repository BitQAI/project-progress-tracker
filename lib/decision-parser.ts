/**
 * 决策点与边界条件选项解析器
 */

export interface DecisionOptionItem {
  id: string; // 如 "A", "B", "C"
  label: string;
  desc?: string;
  prompt: string;
}

export interface DecisionPointData {
  type?: string;
  requires_user_input?: boolean;
  title?: string;
  items: DecisionOptionItem[];
}

/**
 * 容错清理与解析 JSON 字符串
 */
function safeParseJson(rawJsonStr: string): any {
  if (!rawJsonStr || typeof rawJsonStr !== 'string') return null;
  const trimmed = rawJsonStr.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // 尝试修复常见的 LLM 输出格式问题（单引号替换、智能中文标点替换、去除末尾多余逗号）
    try {
      let fixed = trimmed
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/,\s*([\]}])/g, '$1') // 去除末尾多余逗号
        .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":'); // 给未加引号的 key 补全引号
      return JSON.parse(fixed);
    } catch {
      return null;
    }
  }
}

/**
 * 使用字符扫描法精准匹配带平衡括号的标签 [tag: {...}]
 */
function extractBalancedTag(
  content: string,
  tagNames: string[]
): { jsonStr: string; fullMatch: string } | null {
  for (const tagName of tagNames) {
    const pattern = new RegExp(`\\[\\s*${tagName}\\s*[：:]`, 'i');
    const match = pattern.exec(content);
    if (!match) continue;

    const startIdx = match.index;
    const colonIdx = startIdx + match[0].length;

    // 寻找起始的 { 或 [
    let jsonStartIdx = -1;
    for (let i = colonIdx; i < content.length; i++) {
      if (content[i] === '{' || content[i] === '[') {
        jsonStartIdx = i;
        break;
      } else if (!/\s/.test(content[i])) {
        // 如果遇到非空白且不是括号，说明格式不规范
        break;
      }
    }

    if (jsonStartIdx === -1) continue;

    // 扫描平衡的花括号 / 方括号
    const startChar = content[jsonStartIdx];
    const endChar = startChar === '{' ? '}' : ']';
    let depth = 0;
    let inString = false;
    let escape = false;
    let jsonEndIdx = -1;

    for (let i = jsonStartIdx; i < content.length; i++) {
      const char = content[i];

      if (escape) {
        escape = false;
        continue;
      }
      if (char === '\\' && inString) {
        escape = true;
        continue;
      }
      if (char === '"' || char === "'") {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === startChar) {
          depth++;
        } else if (char === endChar) {
          depth--;
          if (depth === 0) {
            jsonEndIdx = i;
            break;
          }
        }
      }
    }

    if (jsonEndIdx !== -1) {
      const jsonStr = content.substring(jsonStartIdx, jsonEndIdx + 1);
      // 寻找闭合的外层 ']'
      let tagEndIdx = jsonEndIdx + 1;
      while (tagEndIdx < content.length && content[tagEndIdx] !== ']') {
        tagEndIdx++;
      }
      if (tagEndIdx < content.length && content[tagEndIdx] === ']') {
        tagEndIdx++;
      }
      const fullMatch = content.substring(startIdx, tagEndIdx);
      return { jsonStr, fullMatch };
    }
  }
  return null;
}

/**
 * 从文本中提取结构化决策点数据
 */
export function extractDecisionPoint(content: string): {
  data: DecisionPointData | null;
  cleanedText: string;
} {
  if (!content) return { data: null, cleanedText: '' };

  let extractedData: DecisionPointData | null = null;
  let cleanedText = content;

  // 1. 精准平衡匹配 [requires_user_input: {...}], [OPTIONS: {...}], [DECISION_POINT: {...}]
  const balancedResult = extractBalancedTag(content, [
    'requires_user_input',
    'OPTIONS',
    'options',
    'DECISION_POINT',
    'decision_point',
    'DECISION_OPTIONS',
  ]);

  if (balancedResult) {
    const parsed = safeParseJson(balancedResult.jsonStr);
    if (parsed) {
      if (Array.isArray(parsed)) {
        extractedData = {
          title: '请选择您希望进一步聚焦的边界条件：',
          items: parsed,
          requires_user_input: true,
        };
      } else if (parsed.items || parsed.options) {
        extractedData = {
          title: parsed.title || '请选择您希望进一步聚焦的边界条件：',
          items: parsed.items || parsed.options,
          requires_user_input: true,
        };
      }
      if (extractedData && extractedData.items.length > 0) {
        cleanedText = cleanedText.replace(balancedResult.fullMatch, '').trim();
      }
    }
  }

  // 2. 匹配 Markdown 代码块 ```json {"requires_user_input": ...}
  if (!extractedData) {
    const codeBlockRegex = /```(?:json|json:requires_user_input|requires_user_input)?\s*(\{[\s\S]*?\})\s*```/i;
    const codeMatch = content.match(codeBlockRegex);
    if (codeMatch && codeMatch[1]) {
      const parsed = safeParseJson(codeMatch[1]);
      if (parsed && (parsed.requires_user_input || parsed.items || parsed.options)) {
        const rawItems = parsed.items || parsed.options;
        if (Array.isArray(rawItems) && rawItems.length > 0) {
          extractedData = {
            title: parsed.title || '请选择您希望进一步聚焦的边界条件：',
            items: rawItems,
            requires_user_input: true,
          };
          cleanedText = cleanedText.replace(codeBlockRegex, '').trim();
        }
      }
    }
  }

  // 3. 智能文本匹配：如果模型输出了自然语言的 A/B/C/D 选项列表
  if (!extractedData) {
    const hasPromptHint =
      content.includes('选择') ||
      content.includes('边界') ||
      content.includes('选项') ||
      content.includes('维度') ||
      content.includes('下钻') ||
      content.includes('澄清') ||
      content.includes('请问') ||
      content.includes('确认');

    // 匹配如 "A. xxx", "- A. xxx", "1. 选项A: xxx", "【选项A】xxx", "(A) xxx", "A) xxx"
    const optionLinesRegex = /(?:^|\n)\s*(?:[-*•]\s*)?(?:\[|【|\()?([A-D]|选项[A-D]|\d+)(?:\]|】|\))?[.、:：)）\s]\s*([^\n]+)/g;
    const matches = Array.from(content.matchAll(optionLinesRegex));

    if (matches.length >= 2 && (hasPromptHint || matches.length <= 5)) {
      const fallbackItems: DecisionOptionItem[] = [];
      const matchedFullStrings: string[] = [];

      matches.forEach((m, idx) => {
        const rawPrefix = m[1].trim();
        const rawLine = m[2].trim();
        if (!rawLine || rawLine.length < 2) return;

        // 过滤掉长段落正文或非选项行
        if (rawLine.length > 120) return;

        let id = String.fromCharCode(65 + idx);
        if (/^[A-D]$/i.test(rawPrefix)) {
          id = rawPrefix.toUpperCase();
        } else if (rawPrefix.includes('选项')) {
          id = rawPrefix.replace('选项', '').trim().toUpperCase() || id;
        }

        let label = rawLine;
        let desc = '';

        // 智能拆分“标题：描述”或“标题（描述）”
        if (rawLine.includes('：') || rawLine.includes(':')) {
          const parts = rawLine.split(/[：:]/);
          label = parts[0].trim();
          desc = parts.slice(1).join('：').trim();
        } else if (rawLine.includes('——') || rawLine.includes(' - ')) {
          const parts = rawLine.split(/——|\s-\s/);
          label = parts[0].trim();
          desc = parts.slice(1).join(' ').trim();
        } else if (rawLine.includes('（') && rawLine.endsWith('）')) {
          const parenIdx = rawLine.indexOf('（');
          label = rawLine.substring(0, parenIdx).trim();
          desc = rawLine.substring(parenIdx + 1, rawLine.length - 1).trim();
        } else if (rawLine.includes('(') && rawLine.endsWith(')')) {
          const parenIdx = rawLine.indexOf('(');
          label = rawLine.substring(0, parenIdx).trim();
          desc = rawLine.substring(parenIdx + 1, rawLine.length - 1).trim();
        }

        // 清除 markdown 粗体符号
        label = label.replace(/\*\*/g, '').trim();
        desc = desc.replace(/\*\*/g, '').trim();

        fallbackItems.push({
          id,
          label,
          desc: desc || undefined,
          prompt: `请按照选项 ${id}「${label}」的明确边界条件执行精准分析与结构化梳理。`,
        });
        matchedFullStrings.push(m[0]);
      });

      if (fallbackItems.length >= 2) {
        extractedData = {
          title: '请直接点击下方选项一键决策：',
          items: fallbackItems,
          requires_user_input: true,
        };
      }
    }
  }

  // 规范化 items 字段，确保 prompt 存在
  if (extractedData && extractedData.items) {
    extractedData.items = extractedData.items.map((item, idx) => ({
      id: item.id || String.fromCharCode(65 + idx),
      label: (item.label || item.prompt || `选项 ${item.id}`).replace(/\*\*/g, ''),
      desc: item.desc ? item.desc.replace(/\*\*/g, '') : undefined,
      prompt: item.prompt || `请针对「${item.label || item.id}」进行进一步分析`,
    }));
  }

  return { data: extractedData, cleanedText };
}
