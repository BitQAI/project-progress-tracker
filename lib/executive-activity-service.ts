import { getDb, AppDatabase } from './db';
import { ExecutiveActivityItem, DbNode } from './types';
import { findRootProjectId } from './activity-logger';
import { formatBeijingRelativeTime } from './date-utils';

function formatExecutiveTime(ts: string): string {
  return formatBeijingRelativeTime(ts);
}

function cleanExecutiveText(text?: string): string {
  if (!text) return '';
  return text
    .split('\n')
    .map((line) => {
      let l = line.trim();
      // 彻底清除 + 与 - 符号及列表符号
      l = l.replace(/^[-+*•·]\s*/, '');
      l = l.replace(/^\+\s*/, '').replace(/^-\s*/, '');
      return l;
    })
    .filter((l) => l.length > 0 && !l.startsWith('@@') && !l.startsWith('【变更'))
    .join('；');
}

export function getGlobalExecutiveActivities(limit: number = 3): ExecutiveActivityItem[] {
  const db: AppDatabase = getDb();
  const list: ExecutiveActivityItem[] = [];
  const seenIds = new Set<string>();

  const projectMap = new Map<string, DbNode>();
  db.nodes.forEach((n) => {
    if (!n.parent_id) {
      projectMap.set(n.id, n);
    }
  });

  const getProjectName = (projectId: string): string => {
    const p = projectMap.get(projectId) || db.nodes.find((n) => n.id === projectId);
    return p ? p.name : '核心业务项目';
  };

  const getParentModule = (nodeId?: string | null): string | undefined => {
    if (!nodeId) return undefined;
    const node = db.nodes.find((n) => n.id === nodeId);
    return node ? node.name : undefined;
  };

  // 1. 解析专属活动记录表
  if (Array.isArray(db.activities)) {
    for (const act of db.activities) {
      if (seenIds.has(act.id)) continue;
      seenIds.add(act.id);

      const pId = act.project_id || (act.node_id ? findRootProjectId(db, act.node_id) : '');
      const pName = getProjectName(pId);
      const moduleName = getParentModule(act.node_id);
      const cleanSummary = cleanExecutiveText(act.detail);

      let item: ExecutiveActivityItem | null = null;

      if (act.type === 'deliverable_submitted') {
        item = {
          id: act.id,
          projectId: pId,
          projectName: pName,
          moduleName,
          type: 'deliverable',
          categoryBadge: '成果交付归档',
          badgeVariant: 'emerald',
          headline: `${act.author} 完成成果交付与验收（${moduleName || pName}）`,
          summary: cleanSummary || '关键产出物已通过阶段验收并完成数字化归档，为后续环节扫清技术与业务依赖。',
          owner: act.author,
          timestamp: act.timestamp,
          formattedTime: formatExecutiveTime(act.timestamp),
        };
      } else if (act.type === 'task_done') {
        const doneMatch = act.title.match(/「([^」]+)」/);
        const doneItemName = doneMatch ? `「${doneMatch[1]}」` : '相应任务';
        item = {
          id: act.id,
          projectId: pId,
          projectName: pName,
          moduleName,
          type: 'milestone',
          categoryBadge: '关键节点完工',
          badgeVariant: 'blue',
          headline: `${act.author} 顺利推进完成 ${doneItemName}`,
          summary: cleanSummary || '该执行任务已达成验收标准并按期闭环，项目整体进度正常受控。',
          owner: act.author,
          timestamp: act.timestamp,
          formattedTime: formatExecutiveTime(act.timestamp),
        };
      } else if (act.type === 'comment_added' || act.type === 'briefing') {
        item = {
          id: act.id,
          projectId: pId,
          projectName: pName,
          moduleName,
          type: 'comment',
          categoryBadge: '管理留档与推进',
          badgeVariant: 'purple',
          headline: `${act.author} 记录了关键业务进展与工作指示`,
          summary: cleanSummary || act.title,
          owner: act.author,
          timestamp: act.timestamp,
          formattedTime: formatExecutiveTime(act.timestamp),
        };
      } else if (act.type === 'task_updated' || act.type === 'node_updated') {
        const updateMatch = act.title.match(/「([^」]+)」/);
        const updateItemName = updateMatch ? `「${updateMatch[1]}」` : '相应工作项';
        item = {
          id: act.id,
          projectId: pId,
          projectName: pName,
          moduleName,
          type: 'progress',
          categoryBadge: '进度排期同步',
          badgeVariant: 'amber',
          headline: `${act.author} 更新了 ${updateItemName} 的执行细节`,
          summary: cleanSummary || '已根据业务最新协同诉求完成排期调整与资源对齐。',
          owner: act.author,
          timestamp: act.timestamp,
          formattedTime: formatExecutiveTime(act.timestamp),
        };
      } else if (act.type === 'task_created' || act.type === 'project_created') {
        item = {
          id: act.id,
          projectId: pId,
          projectName: pName,
          moduleName,
          type: 'milestone',
          categoryBadge: '新增攻坚计划',
          badgeVariant: 'blue',
          headline: `${act.author} 规划并启动了新的交付任务`,
          summary: cleanSummary || act.title,
          owner: act.author,
          timestamp: act.timestamp,
          formattedTime: formatExecutiveTime(act.timestamp),
        };
      }

      if (item) list.push(item);
    }
  }

  // 2. 从已提交交付件和已完成的核心任务中提取管理层动态（补充兜底）
  const completedTasks = db.tasks.filter((t) => t.status === 'done');
  for (const t of completedTasks) {
    const actId = `exec_task_${t.id}`;
    if (seenIds.has(actId)) continue;

    const node = db.nodes.find((n) => n.id === t.node_id);
    const pId = node ? findRootProjectId(db, node.id) : '';
    const pName = getProjectName(pId);
    const timeStr = t.deliverable_submitted_at || t.done_at || t.created_at;

    if (t.has_deliverable && t.deliverable_submission) {
      list.push({
        id: actId,
        projectId: pId,
        projectName: pName,
        moduleName: node?.name,
        type: 'deliverable',
        categoryBadge: '成果交付归档',
        badgeVariant: 'emerald',
        headline: `${t.owner} 交付并验收了「${t.name}」`,
        summary: cleanExecutiveText(t.deliverable_submission),
        owner: t.owner,
        timestamp: timeStr,
        formattedTime: formatExecutiveTime(timeStr),
      });
      seenIds.add(actId);
    } else {
      list.push({
        id: actId,
        projectId: pId,
        projectName: pName,
        moduleName: node?.name,
        type: 'milestone',
        categoryBadge: '关键节点完工',
        badgeVariant: 'blue',
        headline: `${t.owner} 攻坚完成了「${t.name}」`,
        summary: `所属模块【${node?.name || pName}】核心工作已全部通过验证并顺利结项。`,
        owner: t.owner,
        timestamp: timeStr,
        formattedTime: formatExecutiveTime(timeStr),
      });
      seenIds.add(actId);
    }
  }

  // 3. 提取管理层留言与评论
  for (const c of db.comments) {
    const actId = `exec_cmt_${c.id}`;
    if (seenIds.has(actId)) continue;
    
    let pId = '';
    let moduleName = '';
    if (c.node_id) {
      pId = findRootProjectId(db, c.node_id);
      const n = db.nodes.find((item) => item.id === c.node_id);
      moduleName = n?.name || '';
    } else if (c.task_id) {
      const t = db.tasks.find((item) => item.id === c.task_id);
      if (t) {
        pId = findRootProjectId(db, t.node_id);
        const n = db.nodes.find((item) => item.id === t.node_id);
        moduleName = n?.name || '';
      }
    }
    const pName = getProjectName(pId);

    list.push({
      id: actId,
      projectId: pId,
      projectName: pName,
      moduleName: moduleName || undefined,
      type: 'comment',
      categoryBadge: '管理留档与推进',
      badgeVariant: 'purple',
      headline: `${c.author} 发布了关键指示与进展复盘`,
      summary: cleanExecutiveText(c.content),
      owner: c.author,
      timestamp: c.created_at,
      formattedTime: formatExecutiveTime(c.created_at),
    });
    seenIds.add(actId);
  }

  // 4. 按时间倒序排序
  list.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  // 5. 按项目去重：同一项目只保留最新进展的一条
  const projectDeduplicated: ExecutiveActivityItem[] = [];
  const seenProjectIds = new Set<string>();

  for (const item of list) {
    const key = item.projectId || item.projectName;
    if (!seenProjectIds.has(key)) {
      seenProjectIds.add(key);
      projectDeduplicated.push(item);
      if (projectDeduplicated.length >= limit) break;
    }
  }

  return projectDeduplicated;
}
