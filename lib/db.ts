import fs from 'fs';
import path from 'path';
import { supabase } from './supabase';
import {
  DbNode,
  DbTask,
  DbTemplate,
  DbTemplateStage,
  DbTemplateDeliverable,
  DbComment,
  DbActivityLog,
  AppDatabase,
} from './types';
import { getInitialDatabase } from './db-seed';

export { getInitialDatabase };
export type { AppDatabase };

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'projects.json');

let inMemoryDb: AppDatabase | null = null;

export function getDb(): AppDatabase {
  if (inMemoryDb) {
    if (!inMemoryDb.activities) inMemoryDb.activities = [];
    return inMemoryDb;
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      inMemoryDb = JSON.parse(content);
      if (!inMemoryDb || !Array.isArray(inMemoryDb.nodes)) {
        inMemoryDb = getInitialDatabase();
        persistDbLocalSync();
      } else if (!Array.isArray(inMemoryDb.activities)) {
        inMemoryDb.activities = [];
      }
    } catch {
      inMemoryDb = getInitialDatabase();
      persistDbLocalSync();
    }
  } else {
    inMemoryDb = getInitialDatabase();
    persistDbLocalSync();
  }

  if (!inMemoryDb.activities) inMemoryDb.activities = [];
  return inMemoryDb!;
}

/**
 * 拓扑排序 nodes：确保父节点排在子节点前面，满足关系型数据库外键约束
 */
function sortNodesTopologically(nodes: DbNode[]): DbNode[] {
  const result: DbNode[] = [];
  const insertedIds = new Set<string>();
  const remaining = [...nodes];

  // 1. 先插入根节点
  for (let i = remaining.length - 1; i >= 0; i--) {
    if (!remaining[i].parent_id) {
      insertedIds.add(remaining[i].id);
      result.push(remaining[i]);
      remaining.splice(i, 1);
    }
  }

  // 2. 逐层插入子节点
  let maxLoop = remaining.length * 2 + 10;
  while (remaining.length > 0 && maxLoop-- > 0) {
    let insertedAny = false;
    for (let i = remaining.length - 1; i >= 0; i--) {
      const node = remaining[i];
      if (node.parent_id && insertedIds.has(node.parent_id)) {
        insertedIds.add(node.id);
        result.push(node);
        remaining.splice(i, 1);
        insertedAny = true;
      }
    }
    if (!insertedAny && remaining.length > 0) {
      const orphan = remaining.pop()!;
      orphan.parent_id = null;
      insertedIds.add(orphan.id);
      result.push(orphan);
    }
  }

  return result;
}

/**
 * 将本地/内存状态安全同步到 Supabase 关系表中
 */
export async function syncLocalStateToSupabase(sourceDb: AppDatabase): Promise<{ success: boolean; message: string }> {
  if (!supabase) return { success: false, message: 'Supabase 未初始化' };

  try {
    const validNodeIds = new Set(sourceDb.nodes?.map((n) => n.id) || []);
    const validTaskIds = new Set(sourceDb.tasks?.map((t) => t.id) || []);
    const validTemplateIds = new Set(sourceDb.templates?.map((tpl) => tpl.id) || []);
    const validStageIds = new Set(sourceDb.templateStages?.map((s) => s.id) || []);

    // 1. 同步模板及交付物
    if (sourceDb.templates && sourceDb.templates.length > 0) {
      const tplRows = sourceDb.templates.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description || null,
        created_at: t.created_at || new Date().toISOString(),
      }));
      const { error } = await supabase.from('pm_templates').upsert(tplRows);
      if (error) throw error;

      // 差异删除已废弃模板
      const { data: supaTpls } = await supabase.from('pm_templates').select('id');
      if (supaTpls) {
        const toDel = supaTpls.filter((t) => !validTemplateIds.has(t.id)).map((t) => t.id);
        if (toDel.length > 0) await supabase.from('pm_templates').delete().in('id', toDel);
      }
    }

    if (sourceDb.templateStages && sourceDb.templateStages.length > 0) {
      const stageRows = sourceDb.templateStages.map((s) => ({
        id: s.id,
        template_id: s.template_id,
        name: s.name,
        order_num: s.order || 1,
      }));
      const { error } = await supabase.from('pm_template_stages').upsert(stageRows);
      if (error) throw error;

      const { data: supaStages } = await supabase.from('pm_template_stages').select('id');
      if (supaStages) {
        const toDel = supaStages.filter((s) => !validStageIds.has(s.id)).map((s) => s.id);
        if (toDel.length > 0) await supabase.from('pm_template_stages').delete().in('id', toDel);
      }
    }

    if (sourceDb.templateDeliverables && sourceDb.templateDeliverables.length > 0) {
      const validDelivIds = new Set(sourceDb.templateDeliverables.map((d) => d.id));
      const delivRows = sourceDb.templateDeliverables.map((d) => ({
        id: d.id,
        stage_id: d.stage_id,
        name: d.name,
        order_num: d.order || 1,
      }));
      const { error } = await supabase.from('pm_template_deliverables').upsert(delivRows);
      if (error) throw error;

      const { data: supaDelivs } = await supabase.from('pm_template_deliverables').select('id');
      if (supaDelivs) {
        const toDel = supaDelivs.filter((d) => !validDelivIds.has(d.id)).map((d) => d.id);
        if (toDel.length > 0) await supabase.from('pm_template_deliverables').delete().in('id', toDel);
      }
    }

    // 2. 同步项目节点 (先清理 Supabase 中废弃节点，再拓扑排序更新现存节点)
    if (sourceDb.nodes && sourceDb.nodes.length > 0) {
      // 差异删除 Supabase 中存在但本地已删除的节点
      const { data: supaNodes } = await supabase.from('pm_nodes').select('id');
      if (supaNodes) {
        const toDel = supaNodes.filter((n) => !validNodeIds.has(n.id)).map((n) => n.id);
        if (toDel.length > 0) await supabase.from('pm_nodes').delete().in('id', toDel);
      }

      const sortedNodes = sortNodesTopologically(sourceDb.nodes);
      const nodeRows = sortedNodes.map((n) => ({
        id: n.id,
        parent_id: n.parent_id || null,
        name: n.name,
        owner: n.owner,
        order_num: n.order || 1,
        status: n.status || 'in_progress',
        priority: n.priority || 'P1',
        description: n.description || null,
        estimated_duration: n.estimated_duration || null,
        due_date: n.due_date || null,
        created_at: n.created_at || new Date().toISOString(),
      }));
      const { error } = await supabase.from('pm_nodes').upsert(nodeRows);
      if (error) throw error;
    }

    // 3. 同步具体任务
    if (sourceDb.tasks && sourceDb.tasks.length > 0) {
      // 差异删除 Supabase 中存在但本地已删除的任务
      const { data: supaTasks } = await supabase.from('pm_tasks').select('id');
      if (supaTasks) {
        const toDel = supaTasks.filter((t) => !validTaskIds.has(t.id)).map((t) => t.id);
        if (toDel.length > 0) await supabase.from('pm_tasks').delete().in('id', toDel);
      }

      const taskRows = sourceDb.tasks.map((t) => ({
        id: t.id,
        node_id: t.node_id,
        name: t.name,
        owner: t.owner,
        due_date: t.due_date || null,
        estimated_duration: t.estimated_duration || null,
        status: t.status || 'pending',
        has_deliverable: !!t.has_deliverable,
        deliverable_requirement: t.deliverable_requirement || null,
        deliverable_items: t.deliverable_items || [],
        deliverable_submission: t.deliverable_submission || null,
        deliverable_submitted_at: t.deliverable_submitted_at || null,
        deliverable_attachments: t.deliverable_attachments || [],
        done_at: t.done_at || null,
        created_at: t.created_at || new Date().toISOString(),
      }));
      const { error } = await supabase.from('pm_tasks').upsert(taskRows);
      if (error) throw error;
    }

    // 4. 同步团队跟进评论 (清洗孤儿外键保证外键约束完整)
    if (sourceDb.comments && sourceDb.comments.length > 0) {
      const validCommentIds = new Set(sourceDb.comments.map((c) => c.id));
      const { data: supaComments } = await supabase.from('pm_comments').select('id');
      if (supaComments) {
        const toDel = supaComments.filter((c) => !validCommentIds.has(c.id)).map((c) => c.id);
        if (toDel.length > 0) await supabase.from('pm_comments').delete().in('id', toDel);
      }

      const commentRows = sourceDb.comments.map((c) => ({
        id: c.id,
        node_id: c.node_id && validNodeIds.has(c.node_id) ? c.node_id : null,
        task_id: c.task_id && validTaskIds.has(c.task_id) ? c.task_id : null,
        parent_id: c.parent_id && validCommentIds.has(c.parent_id) ? c.parent_id : null,
        author: c.author,
        content: c.content,
        created_at: c.created_at || new Date().toISOString(),
        image_url: c.image_url || null,
        attachments: c.attachments || [],
      }));
      const { error } = await supabase.from('pm_comments').upsert(commentRows);
      if (error) throw error;
    }

    // 5. 同步审计日志 (清洗孤儿外键保证外键约束完整)
    if (sourceDb.activities && sourceDb.activities.length > 0) {
      const validActivityIds = new Set(sourceDb.activities.map((a) => a.id));
      const actRows = sourceDb.activities.map((a) => ({
        id: a.id,
        project_id: a.project_id,
        node_id: a.node_id && validNodeIds.has(a.node_id) ? a.node_id : null,
        task_id: a.task_id && validTaskIds.has(a.task_id) ? a.task_id : null,
        type: a.type,
        title: a.title,
        detail: a.detail || null,
        author: a.author,
        timestamp: a.timestamp || new Date().toISOString(),
        image_url: a.image_url || null,
        attachments: a.attachments || [],
      }));
      const { error } = await supabase.from('pm_activity_logs').upsert(actRows);
      if (error) throw error;
    }

    return { success: true, message: '数据成功同步至 Supabase 关系表' };
  } catch (err: any) {
    console.error('Supabase 关系同步出现异常:', err.message);
    return { success: false, message: err.message };
  }
}

/**
 * 异步从 Supabase 关系表中加载或自动平铺迁移
 */
export async function ensureDbLoaded(forceReload = false): Promise<AppDatabase> {
  // 在 Vercel 环境下，为了保证不同 Serverless 容器和请求之间的数据 100% 实时同步，我们绕过 inMemoryDb 缓存，每次都从 Supabase 重新加载最新数据
  if (inMemoryDb && !forceReload && !process.env.VERCEL) {
    if (!inMemoryDb.activities) inMemoryDb.activities = [];
    return inMemoryDb;
  }

  if (supabase) {
    try {
      // 1. 尝试从关系表 pm_nodes 查询数据
      const { data: nodesData, error: nodesErr } = await supabase
        .from('pm_nodes')
        .select('*')
        .order('order_num', { ascending: true });

      if (!nodesErr && nodesData) {
        if (nodesData.length > 0) {
          // 关系表已有数据，并行读取全部 7 张关系表
          const [tasksRes, tplsRes, stgsRes, delsRes, cmtsRes, actsRes] = await Promise.all([
            supabase.from('pm_tasks').select('*'),
            supabase.from('pm_templates').select('*'),
            supabase.from('pm_template_stages').select('*').order('order_num', { ascending: true }),
            supabase.from('pm_template_deliverables').select('*').order('order_num', { ascending: true }),
            supabase.from('pm_comments').select('*').order('created_at', { ascending: true }),
            supabase.from('pm_activity_logs').select('*').order('timestamp', { ascending: false }),
          ]);

          inMemoryDb = {
            nodes: nodesData.map((n) => ({
              id: n.id,
              parent_id: n.parent_id,
              name: n.name,
              owner: n.owner,
              order: n.order_num,
              status: n.status,
              priority: n.priority,
              description: n.description,
              estimated_duration: n.estimated_duration,
              due_date: n.due_date,
              created_at: n.created_at,
            })),
            tasks: (tasksRes.data || []).map((t) => {
              let deliverable_attachments = Array.isArray(t.deliverable_attachments)
                ? t.deliverable_attachments
                : [];
              if (typeof t.deliverable_attachments === 'string') {
                try {
                  deliverable_attachments = JSON.parse(t.deliverable_attachments);
                } catch {
                  deliverable_attachments = [];
                }
              }

              return {
                id: t.id,
                node_id: t.node_id,
                name: t.name,
                owner: t.owner,
                due_date: t.due_date,
                estimated_duration: t.estimated_duration,
                status: t.status,
                has_deliverable: t.has_deliverable,
                deliverable_requirement: t.deliverable_requirement,
                deliverable_items: t.deliverable_items,
                deliverable_submission: t.deliverable_submission,
                deliverable_submitted_at: t.deliverable_submitted_at,
                deliverable_attachments,
                done_at: t.done_at,
                created_at: t.created_at,
              };
            }),
            templates: (tplsRes.data || []).map((tpl) => ({
              id: tpl.id,
              name: tpl.name,
              description: tpl.description,
              created_at: tpl.created_at,
            })),
            templateStages: (stgsRes.data || []).map((s) => ({
              id: s.id,
              template_id: s.template_id,
              name: s.name,
              order: s.order_num,
            })),
            templateDeliverables: (delsRes.data || []).map((d) => ({
              id: d.id,
              stage_id: d.stage_id,
              name: d.name,
              order: d.order_num,
            })),
            comments: (cmtsRes.data || []).map((c) => {
              let attachments = Array.isArray(c.attachments) ? c.attachments : [];
              if (typeof c.attachments === 'string') {
                try {
                  attachments = JSON.parse(c.attachments);
                } catch {
                  attachments = [];
                }
              }

              // 兼容历史存量数据：如果 attachments 为空但存在 image_url，自动合成标准附件结构
              if ((!attachments || attachments.length === 0) && c.image_url) {
                const nameMatch = c.content?.match(/附带文件[^\n:]*:\s*([^\n,]+)/);
                attachments = [
                  {
                    id: `att_${c.id}`,
                    name: nameMatch ? nameMatch[1].trim() : '存证凭据图片.png',
                    url: c.image_url,
                    type: 'image',
                    uploaded_at: c.created_at || new Date().toISOString(),
                  },
                ];
              }

              const finalImageUrl =
                c.image_url ||
                attachments.find((a: any) => a.type === 'image')?.url ||
                null;

              return {
                id: c.id,
                node_id: c.node_id,
                task_id: c.task_id,
                parent_id: c.parent_id,
                author: c.author,
                content: c.content,
                created_at: c.created_at,
                image_url: finalImageUrl,
                attachments,
              };
            }),
            activities: (actsRes.data || []).map((a) => {
              let attachments = Array.isArray(a.attachments) ? a.attachments : [];
              if (typeof a.attachments === 'string') {
                try {
                  attachments = JSON.parse(a.attachments);
                } catch {
                  attachments = [];
                }
              }
              return {
                id: a.id,
                project_id: a.project_id,
                node_id: a.node_id,
                task_id: a.task_id,
                type: a.type,
                title: a.title,
                detail: a.detail,
                author: a.author,
                timestamp: a.timestamp,
                image_url: a.image_url || null,
                attachments,
              };
            }),
          };

          // 核心对齐与补全机制：如果任务的 deliverable_attachments 为空，但关联的证据链评论（如交付件归档）中包含附件或图片，自动对齐到任务上
          let hasAutoReconciled = false;
          inMemoryDb.tasks.forEach((task) => {
            if (!task.deliverable_attachments || task.deliverable_attachments.length === 0) {
              const taskComments = (inMemoryDb?.comments || []).filter((c) => c.task_id === task.id);
              const recoveredAttachments: any[] = [];

              taskComments.forEach((c) => {
                if (c.attachments && c.attachments.length > 0) {
                  c.attachments.forEach((att: any) => {
                    if (!recoveredAttachments.some((a) => a.url === att.url)) {
                      recoveredAttachments.push(att);
                    }
                  });
                } else if (c.image_url) {
                  if (!recoveredAttachments.some((a) => a.url === c.image_url)) {
                    const nameMatch = c.content?.match(/附带文件[^\n:]*:\s*([^\n,]+)/);
                    recoveredAttachments.push({
                      id: `att_${c.id}`,
                      name: nameMatch ? nameMatch[1].trim() : '存证凭据图片.png',
                      url: c.image_url,
                      type: 'image',
                      uploaded_at: c.created_at,
                    });
                  }
                }
              });

              if (recoveredAttachments.length > 0) {
                task.deliverable_attachments = recoveredAttachments;
                task.has_deliverable = true;
                hasAutoReconciled = true;
              }
            }
          });

          persistDbLocalSync();
          if (hasAutoReconciled) {
            triggerSupabaseSync();
          }
          console.log(`✅ 成功从 Supabase 关系表加载数据 (共 ${inMemoryDb.nodes.length} 个节点)`);
          return inMemoryDb;
        } else {
          // 关系表为空，自动使用本地或默认数据执行安全平铺
          console.log('⚡ 检测到关系表为空，正在初始化关系型数据库...');
          const sourceDb = getDb();
          inMemoryDb = sourceDb;
          await syncLocalStateToSupabase(sourceDb);
          persistDbLocalSync();
          return inMemoryDb;
        }
      } else {
        // 如果关系表尚未创建或报错，直接降级到本地文件系统
        console.warn('Supabase 关系表访问提示:', nodesErr?.message);
        return getDb();
      }
    } catch (e: any) {
      console.warn('连接 Supabase 失败，系统自动降级使用本地文件系统:', e.message);
    }
  }

  return getDb();
}

function persistDbLocalSync(): void {
  if (!inMemoryDb) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(inMemoryDb, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('本地文件持久化失败:', err);
  }
}

let isSyncing = false;
let hasPendingSync = false;

async function triggerSupabaseSync(): Promise<void> {
  if (!supabase || !inMemoryDb) return;

  if (isSyncing) {
    hasPendingSync = true;
    return;
  }

  isSyncing = true;
  hasPendingSync = false;

  try {
    if (inMemoryDb) {
      await syncLocalStateToSupabase(inMemoryDb);
    }
  } catch (err: any) {
    console.error('Supabase 关系型同步触发异常:', err?.message || err);
  } finally {
    isSyncing = false;
    if (hasPendingSync) {
      triggerSupabaseSync();
    }
  }
}

/**
 * 支持关系型表更新及快照备份的持久化函数
 */
export async function persistDb(): Promise<void> {
  if (!inMemoryDb) return;

  // 1. 同步保存本地文件系统备份
  persistDbLocalSync();

  // 2. 队列式安全向 Supabase 关系表同步增量与全量状态
  if (supabase) {
    if (process.env.VERCEL) {
      // 在 Vercel 环境下，直接同步并等待完成，防止 Serverless 进程被冷冻
      await syncLocalStateToSupabase(inMemoryDb);
    } else {
      await triggerSupabaseSync();
    }
  }
}

export async function persistDbAsync(): Promise<void> {
  await persistDb();
}

