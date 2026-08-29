import { getDb, AppDatabase } from './db';
import { ExecutiveActivityItem, DbNode } from './types';
import { findRootProjectId } from './activity-logger';
import { formatBeijingRelativeTime } from './date-utils';

function formatExecutiveTime(ts: string): string {
  return formatBeijingRelativeTime(ts);
}

export interface PaginatedActivitiesResult {
  items: ExecutiveActivityItem[];
  total: number;
  hasMore: boolean;
  page: number;
  limit: number;
  totalPages: number;
  availableProjects: { id: string; name: string }[];
}

export function getAllExecutiveActivitiesList(): ExecutiveActivityItem[] {
  const db: AppDatabase = getDb();
  const list: ExecutiveActivityItem[] = [];
  const seenIds = new Set<string>();
  const seenEventKeys = new Set<string>();
  const seenTaskDoneIds = new Set<string>();
  const seenCommentKeys = new Set<string>();

  const isImage = (url?: string | null) => {
    if (!url) return false;
    return url.startsWith('http') && (
      !!url.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i) || 
      url.includes('files.bitqai.com/protrack/')
    );
  };

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

  // 1. 解析专属活动记录表（首要真实事件流）
  if (Array.isArray(db.activities)) {
    for (const act of db.activities) {
      if (seenIds.has(act.id)) continue;

      const pId = act.project_id || (act.node_id ? findRootProjectId(db, act.node_id) : '');
      const rawDetail = act.detail?.trim() || '';
      
      // 事件级去重指纹：避免同时写入或重复触发导致的完全相同动态
      const eventKey = `${pId}_${act.type}_${act.author}_${rawDetail.slice(0, 80)}_${act.timestamp.slice(0, 16)}`;
      if (seenEventKeys.has(eventKey)) continue;
      
      seenIds.add(act.id);
      seenEventKeys.add(eventKey);

      if (act.task_id) {
        seenTaskDoneIds.add(act.task_id);
      }
      if (act.type === 'comment_added' && rawDetail) {
        seenCommentKeys.add(`${pId}_${act.author}_${rawDetail}`);
      }

      const pName = getProjectName(pId);
      const moduleName = getParentModule(act.node_id);

      let actImageUrl: string | null = act.image_url || null;
      if (!actImageUrl && act.type === 'comment_added' && act.detail) {
        const relatedCmt = db.comments.find(
          (c) => c.content === act.detail && c.author === act.author
        );
        if (relatedCmt) {
          actImageUrl = relatedCmt.image_url || null;
        }
      }
      if (!actImageUrl && act.type === 'deliverable_submitted' && act.detail && isImage(act.detail)) {
        actImageUrl = act.detail;
      }

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
          summary: rawDetail || '关键产出物已通过阶段验收并完成数字化归档，为后续环节扫清技术与业务依赖。',
          owner: act.author,
          timestamp: act.timestamp,
          formattedTime: formatExecutiveTime(act.timestamp),
          imageUrl: actImageUrl || undefined,
          attachments: act.attachments || undefined,
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
          categoryBadge: '节点完工',
          badgeVariant: 'blue',
          headline: `${act.author} 顺利推进完成 ${doneItemName}`,
          summary: rawDetail || '该执行任务已达成验收标准并按期闭环，项目整体进度正常受控。',
          owner: act.author,
          timestamp: act.timestamp,
          formattedTime: formatExecutiveTime(act.timestamp),
          attachments: act.attachments || undefined,
        };
      } else if (act.type === 'comment_added' || act.type === 'briefing') {
        let headline = act.title || '';
        if (!headline || !headline.includes('「')) {
          let targetName = '相应工作项';
          let isTask = false;
          if (act.task_id) {
            const task = db.tasks.find((t) => t.id === act.task_id);
            if (task) {
              targetName = task.name;
              isTask = true;
            }
          } else if (act.node_id) {
            const node = db.nodes.find((n) => n.id === act.node_id);
            if (node) {
              targetName = node.name;
            }
          }
          const hasAttachments = !!(actImageUrl || (act.attachments && act.attachments.length > 0));
          if (hasAttachments) {
            headline = `${act.author} 记录了「${targetName}」${isTask ? '任务' : ''}的进展备注与证据链`;
          } else {
            headline = `${act.author} 记录了「${targetName}」${isTask ? '任务' : ''}的关键业务进展与工作指示`;
          }
        }
        item = {
          id: act.id,
          projectId: pId,
          projectName: pName,
          moduleName,
          type: 'comment',
          categoryBadge: '管理留档',
          badgeVariant: 'purple',
          headline,
          summary: rawDetail || act.title,
          owner: act.author,
          timestamp: act.timestamp,
          formattedTime: formatExecutiveTime(act.timestamp),
          imageUrl: actImageUrl || undefined,
          attachments: act.attachments || undefined,
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
          categoryBadge: '进度同步',
          badgeVariant: 'amber',
          headline: `${act.author} 更新了 ${updateItemName} 的执行细节`,
          summary: rawDetail || '已根据业务最新协同诉求完成排期调整与资源对齐。',
          owner: act.author,
          timestamp: act.timestamp,
          formattedTime: formatExecutiveTime(act.timestamp),
          attachments: act.attachments || undefined,
        };
      } else if (act.type === 'task_created' || act.type === 'project_created') {
        item = {
          id: act.id,
          projectId: pId,
          projectName: pName,
          moduleName,
          type: 'milestone',
          categoryBadge: '攻坚计划',
          badgeVariant: 'blue',
          headline: `${act.author} 规划并启动了新的交付任务`,
          summary: rawDetail || act.title,
          owner: act.author,
          timestamp: act.timestamp,
          formattedTime: formatExecutiveTime(act.timestamp),
          attachments: act.attachments || undefined,
        };
      }

      if (item) list.push(item);
    }
  }

  // 2. 仅对历史未录入 activities 表的完成任务做兜底补充
  const completedTasks = db.tasks.filter((t) => t.status === 'done' && !seenTaskDoneIds.has(t.id));
  for (const t of completedTasks) {
    const actId = `exec_task_${t.id}`;
    if (seenIds.has(actId)) continue;

    const node = db.nodes.find((n) => n.id === t.node_id);
    const pId = node ? findRootProjectId(db, node.id) : '';
    const pName = getProjectName(pId);
    const timeStr = t.deliverable_submitted_at || t.done_at || t.created_at;

    if (t.has_deliverable && t.deliverable_submission) {
      const submissionUrl = t.deliverable_submission;
      list.push({
        id: actId,
        projectId: pId,
        projectName: pName,
        moduleName: node?.name,
        type: 'deliverable',
        categoryBadge: '成果交付',
        badgeVariant: 'emerald',
        headline: `${t.owner} 交付并验收了「${t.name}」`,
        summary: t.deliverable_submission.trim(),
        owner: t.owner,
        timestamp: timeStr,
        formattedTime: formatExecutiveTime(timeStr),
        imageUrl: isImage(submissionUrl) ? submissionUrl : undefined,
        attachments: t.deliverable_attachments || undefined,
      });
      seenIds.add(actId);
    } else {
      list.push({
        id: actId,
        projectId: pId,
        projectName: pName,
        moduleName: node?.name,
        type: 'milestone',
        categoryBadge: '节点完工',
        badgeVariant: 'blue',
        headline: `${t.owner} 攻坚完成了「${t.name}」`,
        summary: `所属模块【${node?.name || pName}】核心工作已全部通过验证并顺利结项。`,
        owner: t.owner,
        timestamp: timeStr,
        formattedTime: formatExecutiveTime(timeStr),
        attachments: t.deliverable_attachments || undefined,
      });
      seenIds.add(actId);
    }
  }

  // 3. 仅对历史未在 activities 表中记录的评论做兜底补充（过滤自动生成的归档评论）
  for (const c of db.comments) {
    const rawContent = c.content?.trim() || '';
    if (!rawContent) continue;
    
    // 忽略交付件或排期调整等已有主事件日志的自动归档评论
    if (rawContent.startsWith('【交付件归档】') || rawContent.startsWith('【排期调整归档】')) {
      continue;
    }

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

    const commentKey = `${pId}_${c.author}_${rawContent}`;
    if (seenCommentKeys.has(commentKey)) continue;

    const pName = getProjectName(pId);

    list.push({
      id: actId,
      projectId: pId,
      projectName: pName,
      moduleName: moduleName || undefined,
      type: 'comment',
      categoryBadge: '管理留档',
      badgeVariant: 'purple',
      headline: `${c.author} 发布了关键指示与进展复盘`,
      summary: rawContent,
      owner: c.author,
      timestamp: c.created_at,
      formattedTime: formatExecutiveTime(c.created_at),
      imageUrl: c.image_url || undefined,
      attachments: c.attachments || undefined,
    });
    seenIds.add(actId);
    seenCommentKeys.add(commentKey);
  }

  // 4. 按时间倒序排序
  list.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return list;
}

export function getPaginatedExecutiveActivities(options?: {
  page?: number;
  limit?: number;
  projectId?: string;
  type?: string;
  search?: string;
}): PaginatedActivitiesResult {
  const page = Math.max(1, options?.page || 1);
  const limit = Math.max(1, Math.min(100, options?.limit || 10));
  const projectId = options?.projectId?.trim();
  const type = options?.type?.trim();
  const search = options?.search?.trim().toLowerCase();

  const allList = getAllExecutiveActivitiesList();

  // 提取可用项目列表
  const projectMap = new Map<string, { id: string; name: string }>();
  allList.forEach((item) => {
    const key = item.projectId || item.projectName;
    if (!projectMap.has(key)) {
      projectMap.set(key, { id: item.projectId || key, name: item.projectName });
    }
  });
  const availableProjects = Array.from(projectMap.values());

  // 过滤
  const filtered = allList.filter((item) => {
    if (projectId && projectId !== 'all') {
      const pKey = item.projectId || item.projectName;
      if (pKey !== projectId && item.projectName !== projectId) {
        return false;
      }
    }
    if (type && type !== 'all' && item.type !== type) {
      return false;
    }
    if (search) {
      const matchProject = item.projectName?.toLowerCase().includes(search);
      const matchHeadline = item.headline?.toLowerCase().includes(search);
      const matchSummary = item.summary?.toLowerCase().includes(search);
      const matchOwner = item.owner?.toLowerCase().includes(search);
      const matchModule = item.moduleName?.toLowerCase().includes(search);
      if (!matchProject && !matchHeadline && !matchSummary && !matchOwner && !matchModule) {
        return false;
      }
    }
    return true;
  });

  const total = filtered.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const items = filtered.slice(startIndex, endIndex);
  const hasMore = endIndex < total;

  return {
    items,
    total,
    hasMore,
    page,
    limit,
    totalPages,
    availableProjects,
  };
}

export function getGlobalExecutiveActivities(limit: number = 10): ExecutiveActivityItem[] {
  return getAllExecutiveActivitiesList().slice(0, limit);
}

export function getDeduplicatedExecutiveActivities(limit: number = 3): ExecutiveActivityItem[] {
  const allList = getAllExecutiveActivitiesList();
  const projectDeduplicated: ExecutiveActivityItem[] = [];
  const seenProjectIds = new Set<string>();

  for (const item of allList) {
    const key = item.projectId || item.projectName;
    if (!seenProjectIds.has(key)) {
      seenProjectIds.add(key);
      projectDeduplicated.push(item);
      if (projectDeduplicated.length >= limit) break;
    }
  }

  return projectDeduplicated;
}

