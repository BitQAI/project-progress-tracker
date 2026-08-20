import { AppDatabase, DbNode, DbTask } from './types';

/**
 * 递归追溯顶级项目名称
 */
function getProjectRootName(nodeId: string, nodeMap: Map<string, DbNode>): string {
  let curr = nodeMap.get(nodeId);
  if (!curr) return '未知项目';
  while (curr.parent_id) {
    const parent = nodeMap.get(curr.parent_id);
    if (!parent) break;
    curr = parent;
  }
  return curr.name;
}

/**
 * 构建高精度的全局关系型数据库 AI 知识上下文
 */
export function buildEnhancedAiKnowledgeContext(db: AppDatabase): string {
  const nodeMap = new Map<string, DbNode>(db.nodes.map((n) => [n.id, n]));
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. 项目与 WBS 全景
  const rootProjects = db.nodes.filter((n) => !n.parent_id);
  let context = `【1. 系统所有项目与 WBS 树形结构全景】：\n`;
  rootProjects.forEach((proj, idx) => {
    const childNodes = db.nodes.filter((n) => n.parent_id === proj.id);
    const projTasks = db.tasks.filter((t) => {
      const node = nodeMap.get(t.node_id);
      return node && (node.id === proj.id || node.parent_id === proj.id);
    });
    const doneTasks = projTasks.filter((t) => t.status === 'done');
    const pct = projTasks.length > 0 ? Math.round((doneTasks.length / projTasks.length) * 100) : 0;

    context += `项目 #${idx + 1}: 「${proj.name}」\n`;
    context += `  - 负责人: ${proj.owner} | 状态: ${proj.status} | 优先级: ${proj.priority} | 工期: ${proj.estimated_duration || '未设定'}\n`;
    context += `  - 整体完成度: ${pct}% (${doneTasks.length}/${projTasks.length} 任务完成)\n`;
    if (proj.description) context += `  - 目标描述: ${proj.description}\n`;

    if (childNodes.length > 0) {
      context += `  - 下辖子模块 (WBS)：\n`;
      childNodes.forEach((c) => {
        context += `    * [模块] 「${c.name}」| 负责人: ${c.owner} | 状态: ${c.status} | 工期: ${c.estimated_duration || '未设定'}\n`;
      });
    }
    context += '\n';
  });

  // 2. 交付件与成果验收证据库
  const deliverableTasks = db.tasks.filter((t) => t.has_deliverable);
  context += `【2. 交付件与成果验收证据库 (共 ${deliverableTasks.length} 项交付要求)】：\n`;
  deliverableTasks.forEach((t) => {
    const projName = getProjectRootName(t.node_id, nodeMap);
    const node = nodeMap.get(t.node_id);
    context += `- [交付任务] 「${t.name}」 (归属项目: 「${projName}」/「${node?.name || ''}」)\n`;
    context += `  * 责任人: ${t.owner} | 状态: ${t.status === 'done' ? '✅ 已验收完成' : '⏳ 待交付'}\n`;
    context += `  * 交付标准/要求: ${t.deliverable_requirement || '未特别指定'}\n`;
    if (t.deliverable_submission) {
      context += `  * 实际提交成果/证据: ${t.deliverable_submission}\n`;
      if (t.deliverable_submitted_at) context += `  * 提交时间: ${t.deliverable_submitted_at}\n`;
    } else {
      context += `  * 成果提交状态: 尚未提交\n`;
    }
  });
  context += '\n';

  // 3. 所有任务执行分工与超期预警
  context += `【3. 任务执行与成员分工清单】：\n`;
  db.tasks.forEach((t) => {
    const projName = getProjectRootName(t.node_id, nodeMap);
    const isOverdue = t.status !== 'done' && t.due_date && t.due_date < todayStr;
    context += `- [${t.status === 'done' ? '已完成' : isOverdue ? '⚠️ 已超期' : '进行中'}] 「${t.name}」\n`;
    context += `  负责人: ${t.owner} | 截止日: ${t.due_date || '无'} | 归属: 「${projName}」\n`;
  });
  context += '\n';

  // 4. 团队跟进备注与讨论证据链 (Comments)
  if (db.comments && db.comments.length > 0) {
    context += `【4. 团队跟进备注与讨论记录 (Comments)】：\n`;
    db.comments.slice(-15).forEach((c) => {
      let targetDesc = '项目/节点';
      if (c.task_id) {
        const task = db.tasks.find((t) => t.id === c.task_id);
        targetDesc = `任务「${task?.name || c.task_id}」`;
      } else if (c.node_id) {
        const node = nodeMap.get(c.node_id);
        targetDesc = `节点「${node?.name || c.node_id}」`;
      }
      context += `- [${c.author}] 在 ${targetDesc} 留言 (${c.created_at.substring(0, 10)}): "${c.content}"\n`;
    });
    context += '\n';
  }

  // 5. 近期关键审计与操作动态 (Activities)
  if (db.activities && db.activities.length > 0) {
    context += `【5. 系统近期重大操作动态与变更日志】：\n`;
    db.activities.slice(0, 10).forEach((a) => {
      context += `- [${a.timestamp.substring(0, 16)}] ${a.author} ${a.title}: ${a.detail || ''}\n`;
    });
    context += '\n';
  }

  return context;
}
