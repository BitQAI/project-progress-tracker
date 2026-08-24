import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FALLBACK_MD = `# 核心考评体系指南 (2-core-table-guide.md)

这是一个关于 AI 智能绩效考评系统的核心指标与推进指南：

## 一、 考评流程说明
1. **指标设定**：期初拆解目标并设定具体的交付物（如：系统上线、需求文档等）。
2. **过程留痕**：在 WBS 树和甘特图中持续更新任务状态，发表进展备注并附带必要的佐证附件。
3. **期末验收**：最终归档交付件，由负责人组织验收，依据提前天数自动计算时效表现。

## 二、 计分体系与规则
- **提前完工**：获得 +10% ~ +20% 绩效表现加成，体现高执行效率。
- **按期完工**：基础分 100% 满分通过。
- **逾期完工**：每日进行细微扣减，挂起任务不计入考评周期。

## 三、 用户操作建议
* **及时归档**：每次产生成果时，请在任务抽屉中点击“提交成果”，上传截图、文档或 Markdown 指南。
* **双向对齐**：通过 AI 助手对齐第三、第四阶段任务，确保团队整体方向一致。
`;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json({ ok: false, error: 'Missing url parameter' }, { status: 400 });
    }

    if (url.startsWith('data:')) {
      const commaIndex = url.indexOf(',');
      if (commaIndex !== -1) {
        const isBase64 = url.slice(0, commaIndex).includes('base64');
        const content = url.slice(commaIndex + 1);
        const decoded = isBase64 ? Buffer.from(content, 'base64').toString('utf-8') : decodeURIComponent(content);
        return new NextResponse(decoded, {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      }
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const text = await res.text();
        return new NextResponse(text, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
          },
        });
      } else {
        console.warn(`[Proxy] Fetching url ${url} failed with status ${res.status}`);
      }
    } catch (fetchErr) {
      console.warn(`[Proxy] Fetching url ${url} threw an error:`, fetchErr);
    }

    // Return friendly, useful fallback Markdown if we can't reach the live files
    if (url.includes('2-core-table-guide.md') || url.includes('guide.md') || url.endsWith('.md')) {
      return new NextResponse(FALLBACK_MD, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    return NextResponse.json({ ok: false, error: 'Failed to retrieve content' }, { status: 502 });
  } catch (error: any) {
    console.error('[Proxy] Server error:', error);
    return NextResponse.json({ ok: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
