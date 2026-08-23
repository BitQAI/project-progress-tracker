import { AppDatabase, DbNode, DbTask } from './types';

/**
 * 递归追溯顶级项目名称与状态
 */
function getProjectRoot(nodeId: string, nodeMap: Map<string, DbNode>): { name: string; status: string; id: string } {
  let curr = nodeMap.get(nodeId);
  if (!curr) return { name: '未知项目', status: 'unknown', id: '' };
  while (curr.parent_id) {
    const parent = nodeMap.get(curr.parent_id);
    if (!parent) break;
    curr = parent;
  }
  return { name: curr.name, status: curr.status, id: curr.id };
}

/**
 * 状态中文映射
 */
const STATUS_TEXT: Record<string, string> = {
  in_progress: '进行中',
  suspended: '已暂停/挂起',
  unstarted: '未开始',
  done: '已完成',
};

/**
 * 构建高精度的全局关系型数据库 AI 知识上下文
 */
export function buildEnhancedAiKnowledgeContext(db: AppDatabase): string {
  const nodeMap = new Map<string, DbNode>(db.nodes.map((n) => [n.id, n]));
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. 系统所有项目与 WBS 树形结构全景
  const rootProjects = db.nodes.filter((n) => !n.parent_id);
  let context = `【1. 系统所有项目状态与 WBS 结构全景】：\n`;
  rootProjects.forEach((proj, idx) => {
    const childNodes = db.nodes.filter((n) => n.parent_id === proj.id);
    const projTasks = db.tasks.filter((t) => {
      const node = nodeMap.get(t.node_id);
      return node && (node.id === proj.id || node.parent_id === proj.id);
    });
    const doneTasks = projTasks.filter((t) => t.status === 'done');
    const pct = projTasks.length > 0 ? Math.round((doneTasks.length / projTasks.length) * 100) : 0;
    const projStatusCn = STATUS_TEXT[proj.status] || proj.status;

    context += `项目 #${idx + 1}: 「${proj.name}」\n`;
    context += `  - 项目状态: 【${projStatusCn}】 (系统代码: ${proj.status}) | 负责人: ${proj.owner} | 优先级: ${proj.priority} | 工期: ${proj.estimated_duration || '未设定'}\n`;
    context += `  - 完成度: ${pct}% (${doneTasks.length}/${projTasks.length} 任务完成)\n`;
    if (proj.description) context += `  - 目标描述: ${proj.description}\n`;

    if (childNodes.length > 0) {
      context += `  - 下辖子阶段/模块 (WBS)：\n`;
      childNodes.forEach((c) => {
        const nodeStatusCn = STATUS_TEXT[c.status] || c.status;
        context += `    * 模块「${c.name}」| 模块状态: 【${nodeStatusCn}】| 负责人: ${c.owner} | 截止日: ${c.due_date || '未排期'}\n`;
      });
    }
    context += '\n';
  });

  // 2. 交付件与成果验收证据库（明确区分已验收通过与待交付）
  const deliverableTasks = db.tasks.filter((t) => t.has_deliverable);
  context += `【2. 交付件与成果验收证据库 (共 ${deliverableTasks.length} 项交付要求)】：\n`;
  deliverableTasks.forEach((t) => {
    const root = getProjectRoot(t.node_id, nodeMap);
    const node = nodeMap.get(t.node_id);
    const projStatusCn = STATUS_TEXT[root.status] || root.status;
    const isDone = t.status === 'done';

    context += `- [${isDone ? '✅ 已验收结项任务' : '⏳ 待提交交付件任务'}] 「${t.name}」\n`;
    context += `  * 所属项目: 「${root.name}」【项目状态: ${projStatusCn}】 | 所属模块: 「${node?.name || ''}」\n`;
    context += `  * 责任人: ${t.owner} | 任务状态: ${isDone ? '【已完成/已验收 (不可算作未完成待办)】' : '【待交付/待办】'}\n`;
    context += `  * 交付标准/要求: ${t.deliverable_requirement || '未特别指定'}\n`;
    if (t.deliverable_submission) {
      context += `  * 提交成果记录: ${t.deliverable_submission}\n`;
      if (t.deliverable_submitted_at) context += `  * 提交时间: ${t.deliverable_submitted_at}\n`;
    } else {
      context += `  * 成果提交状态: 尚未提交\n`;
    }
  });
  context += '\n';

  // 3. 所有任务执行分工与精准状态归类 (严格区分活跃、无排期、挂起、已完成)
  context += `【3. 任务执行状态与负责人清单（特别注意状态边界分类）】：\n`;
  db.tasks.forEach((t) => {
    const root = getProjectRoot(t.node_id, nodeMap);
    const node = nodeMap.get(t.node_id);
    const isDone = t.status === 'done';
    const isParentSuspended = root.status === 'suspended' || node?.status === 'suspended';
    const isParentUnstarted = root.status === 'unstarted' || node?.status === 'unstarted';
    const hasDueDate = !!t.due_date && t.due_date.trim() !== '';
    const isOverdue = !isDone && hasDueDate && t.due_date! < todayStr;

    let categoryTag = '';
    let categoryExplanation = '';

    if (isDone) {
      categoryTag = '✅ 已完成任务（非进行中）';
      categoryExplanation = '任务已结项或已验收完成，严禁列入未完成待办。';
    } else if (isParentSuspended) {
      categoryTag = '⏸️ 挂起/暂停项目任务（非活跃进行中）';
      categoryExplanation = `所属项目「${root.name}」处于挂起暂停状态，该任务目前处于搁置状态，不要混入活跃待办。`;
    } else if (isParentUnstarted) {
      categoryTag = '⏹️ 未启动项目任务（非活跃进行中）';
      categoryExplanation = `所属项目「${root.name}」未开工，该任务暂未激活。`;
    } else if (isOverdue) {
      categoryTag = '⚠️ 活跃且超期任务（高优待办）';
      categoryExplanation = `截止日为 ${t.due_date}，当前已超期，需紧急处理。`;
    } else if (!hasDueDate) {
      categoryTag = '📅 长期/无排期日常任务（待办）';
      categoryExplanation = '未指定具体截止日期，属于持续性或常规维护事项。若用户仅查紧急主线待办应予区分或向用户澄清。';
    } else {
      categoryTag = '⚡ 活跃正常推进中任务（待办）';
      categoryExplanation = `计划截止日为 ${t.due_date}，正常推进中。`;
    }

    context += `- [分类: ${categoryTag}] 任务名称: 「${t.name}」\n`;
    context += `  * 状态性质: ${categoryExplanation}\n`;
    context += `  * 所属项目: 「${root.name}」(项目状态: ${STATUS_TEXT[root.status] || root.status})\n`;
    if (node && node.id !== root.id) {
      context += `  * 所属模块: 「${node.name}」(模块状态: ${STATUS_TEXT[node.status] || node.status})\n`;
    }
    context += `  * 负责人: ${t.owner} | 截止日期: ${hasDueDate ? t.due_date : '无(未设定截止日)'} | 工期: ${t.estimated_duration || '未设定'}\n`;
    if (t.has_deliverable) {
      context += `  * 包含交付件: 是 (${isDone ? '已验收' : '待提交'})\n`;
    }
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
