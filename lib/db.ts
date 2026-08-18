import fs from 'fs';
import path from 'path';
import {
  DbNode,
  DbTask,
  DbTemplate,
  DbTemplateStage,
  DbTemplateDeliverable,
  DbComment,
  DbActivityLog,
} from './types';

export interface AppDatabase {
  nodes: DbNode[];
  tasks: DbTask[];
  templates: DbTemplate[];
  templateStages: DbTemplateStage[];
  templateDeliverables: DbTemplateDeliverable[];
  comments: DbComment[];
  activities: DbActivityLog[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'projects.json');

let inMemoryDb: AppDatabase | null = null;

function getInitialDatabase(): AppDatabase {
  const now = new Date().toISOString();

  // 1. 标准流程模板
  const tpl1: DbTemplate = {
    id: 'tpl_software_standard',
    name: '标准软件研发流程模板',
    created_at: now,
  };
  const tplStages1: DbTemplateStage[] = [
    { id: 'stg_1', template_id: tpl1.id, name: '阶段一：需求与方案评审', order: 1 },
    { id: 'stg_2', template_id: tpl1.id, name: '阶段二：核心模块研发', order: 2 },
    { id: 'stg_3', template_id: tpl1.id, name: '阶段三：质量测试与回归', order: 3 },
    { id: 'stg_4', template_id: tpl1.id, name: '阶段四：发布与上线交付', order: 4 },
  ];
  const tplDeliv1: DbTemplateDeliverable[] = [
    { id: 'del_1_1', stage_id: 'stg_1', name: '产品需求规格说明书 (PRD)', order: 1 },
    { id: 'del_1_2', stage_id: 'stg_1', name: '系统架构与技术选型文档', order: 2 },
    { id: 'del_1_3', stage_id: 'stg_1', name: 'UI/UX 高保真交互原型', order: 3 },
    { id: 'del_1_4', stage_id: 'stg_1', name: '数据库表结构设计与迁移脚本', order: 4 },
    { id: 'del_2_1', stage_id: 'stg_2', name: '后端核心业务 API 与数据层开发', order: 1 },
    { id: 'del_2_2', stage_id: 'stg_2', name: '前端界面与组件库封装', order: 2 },
    { id: 'del_2_3', stage_id: 'stg_2', name: '第三方服务与 OAuth 鉴权对接', order: 3 },
    { id: 'del_2_4', stage_id: 'stg_2', name: '单测覆盖率达到 80%+', order: 4 },
    { id: 'del_3_1', stage_id: 'stg_3', name: '测试用例编写与全量功能回归', order: 1 },
    { id: 'del_3_2', stage_id: 'stg_3', name: '压力与安全渗透测试报告', order: 2 },
    { id: 'del_3_3', stage_id: 'stg_3', name: '跨端/多分辨率适配验收', order: 3 },
    { id: 'del_4_1', stage_id: 'stg_4', name: '生产环境配置与灰度发布', order: 1 },
    { id: 'del_4_2', stage_id: 'stg_4', name: '操作手册与技术交接文档', order: 2 },
    { id: 'del_4_3', stage_id: 'stg_4', name: '线上业务监控与告警配置', order: 3 },
  ];

  const tpl2: DbTemplate = {
    id: 'tpl_hardware_trial',
    name: '智能硬件试产与量产流程',
    created_at: now,
  };
  const tplStages2: DbTemplateStage[] = [
    { id: 'hstg_1', template_id: tpl2.id, name: 'EVT（工程验证阶段）', order: 1 },
    { id: 'hstg_2', template_id: tpl2.id, name: 'DVT（设计验证阶段）', order: 2 },
    { id: 'hstg_3', template_id: tpl2.id, name: 'PVT（生产验证阶段）', order: 3 },
  ];
  const tplDeliv2: DbTemplateDeliverable[] = [
    { id: 'hdel_1_1', stage_id: 'hstg_1', name: '原理图与 PCB 打样验证', order: 1 },
    { id: 'hdel_1_2', stage_id: 'hstg_1', name: '结构手板拼装与干涉检查', order: 2 },
    { id: 'hdel_1_3', stage_id: 'hstg_1', name: '核心元器件选型评估', order: 3 },
    { id: 'hdel_2_1', stage_id: 'hstg_2', name: '模具开模与注塑试模', order: 1 },
    { id: 'hdel_2_2', stage_id: 'hstg_2', name: '高低温跌落与可靠性测试', order: 2 },
    { id: 'hdel_2_3', stage_id: 'hstg_2', name: 'EMC/安规预扫测试', order: 3 },
    { id: 'hdel_3_1', stage_id: 'hstg_3', name: '产线治具与自动化烧录工具', order: 1 },
    { id: 'hdel_3_2', stage_id: 'hstg_3', name: '小批量试产直通率统计', order: 2 },
    { id: 'hdel_3_3', stage_id: 'hstg_3', name: '量产作业指导书 (SOP)', order: 3 },
  ];

  // 2. 初始演示项目
  const p1Id = 'proj_ai_service_platform';
  const n1Id = 'node_rag_engine';
  const n2Id = 'node_agent_workbench';
  const n2SubId = 'node_agent_miniprogram';

  const p2Id = 'proj_erp_digital_v2';
  const n3Id = 'node_wms_module';

  const p3Id = 'proj_iso_compliance';
  const n4Id = 'node_security_audit';

  const nodes: DbNode[] = [
    {
      id: p1Id,
      parent_id: null,
      name: 'AI 智能客服中台系统',
      owner: '张总 (项目总监)',
      order: 1,
      status: 'in_progress',
      description: '为集团各业务线构建新一代大模型混合检索问答、坐席辅助与人机协同中台。',
      estimated_duration: '8周 (Q3-Q4)',
      created_at: now,
    },
    {
      id: n1Id,
      parent_id: p1Id,
      name: '智能 RAG 向量知识库',
      owner: '李工 (后端主管)',
      order: 1,
      status: 'in_progress',
      description: '多格式文档解析、分段切片、Embedding 向量化与混合重排召回引擎。',
      estimated_duration: '3周',
      created_at: now,
    },
    {
      id: n2Id,
      parent_id: p1Id,
      name: '全渠道坐席协同工作台',
      owner: '刘工 (前端架构)',
      order: 2,
      status: 'in_progress',
      description: '客服前台实时接管、WebSocket 对话流与智能话术推荐面板。',
      estimated_duration: '4周',
      created_at: now,
    },
    {
      id: n2SubId,
      parent_id: n2Id,
      name: '微信小程序坐席端快速响应版',
      owner: '赵工',
      order: 1,
      status: 'in_progress',
      description: '移动端客服快速回复与工单推送处理。',
      estimated_duration: '2周',
      created_at: now,
    },

    {
      id: p2Id,
      parent_id: null,
      name: '新一代供应链 ERP 数字化升级',
      owner: '孙总 (业务VP)',
      order: 2,
      status: 'in_progress',
      description: '重构仓储与物流调度系统，打通 PDA 扫码作业与波次拣货全链路。',
      estimated_duration: '12周',
      created_at: now,
    },
    {
      id: n3Id,
      parent_id: p2Id,
      name: '智能仓储 WMS 模块',
      owner: '周工',
      order: 1,
      status: 'in_progress',
      description: '库位动态算法、移动 PDA 盘点与拣货流水线。',
      estimated_duration: '5周',
      created_at: now,
    },

    {
      id: p3Id,
      parent_id: null,
      name: '全球合规与 ISO27001 安全认证',
      owner: '钱总 (法务与安全)',
      order: 3,
      status: 'unstarted',
      description: '完成年度数据合规审计、渗透测试与国际标准认证证书换发。',
      estimated_duration: '6周',
      created_at: now,
    },
    {
      id: n4Id,
      parent_id: p3Id,
      name: '安全合规差距分析与策略制定',
      owner: '钱总',
      order: 1,
      status: 'unstarted',
      description: '梳理数据流动图谱与网络隔离策略。',
      estimated_duration: '2周',
      created_at: now,
    },
  ];

  const tasks: DbTask[] = [
    {
      id: 'task_1_1',
      node_id: n1Id,
      name: '企业多格式文档解析器 (PDF/Word/Excel)',
      owner: '李工',
      due_date: '2026-08-10',
      status: 'done',
      has_deliverable: true,
      deliverable_requirement: '交付多格式解析基准测试报告与兼容性说明',
      deliverable_submission: '已提交《多格式文档解析模块测试报告 v1.0》，压测 50MB PDF 解析耗时 1.2s，准确率 99.4%。归档链接: https://doc.corp.internal/parser-v1',
      deliverable_submitted_at: '2026-08-09T14:30:00.000Z',
      done_at: '2026-08-09T14:30:00.000Z',
      created_at: now,
    },
    {
      id: 'task_1_2',
      node_id: n1Id,
      name: '向量数据库混合检索与重排算法优化',
      owner: '王工',
      due_date: '2026-08-15',
      status: 'done',
      has_deliverable: true,
      deliverable_requirement: '交付 Rerank 重排算法召回对比数据表',
      deliverable_submission: '重排模型上线验证完毕，MRR@10 指标提升 27%，已合并至 release/v1 分支。',
      deliverable_submitted_at: '2026-08-14T18:00:00.000Z',
      done_at: '2026-08-14T18:00:00.000Z',
      created_at: now,
    },
    {
      id: 'task_1_3',
      node_id: n1Id,
      name: '高并发知识库语义切片与流式召回接口',
      owner: '李工',
      due_date: '2026-08-25',
      status: 'pending',
      has_deliverable: true,
      deliverable_requirement: '交付 Swagger API 文档与流式 SSE 接口联调凭证',
      deliverable_submission: null,
      deliverable_submitted_at: null,
      done_at: null,
      created_at: now,
    },
    {
      id: 'task_2_1',
      node_id: n2Id,
      name: '人机协作会话流实时接管与打断逻辑',
      owner: '刘工',
      due_date: '2026-08-16',
      status: 'done',
      has_deliverable: false,
      deliverable_requirement: '',
      deliverable_submission: null,
      deliverable_submitted_at: null,
      done_at: '2026-08-16T11:00:00.000Z',
      created_at: now,
    },
    {
      id: 'task_2_2',
      node_id: n2Id,
      name: 'WebSocket 多人实时协同与消息防重',
      owner: '陈工',
      due_date: '2026-08-14',
      status: 'pending',
      has_deliverable: true,
      deliverable_requirement: '交付压测报告与心跳重连机制时序图',
      deliverable_submission: null,
      deliverable_submitted_at: null,
      done_at: null,
      created_at: now,
    },
    {
      id: 'task_2_sub_1',
      node_id: n2SubId,
      name: '企业微信与服务号模板消息推送',
      owner: '赵工',
      due_date: '2026-08-28',
      status: 'pending',
      has_deliverable: false,
      deliverable_requirement: '',
      deliverable_submission: null,
      deliverable_submitted_at: null,
      done_at: null,
      created_at: now,
    },

    {
      id: 'task_3_1',
      node_id: n3Id,
      name: 'PDA 条码扫码出入库流程联调',
      owner: '周工',
      due_date: '2026-08-05',
      status: 'done',
      has_deliverable: true,
      deliverable_requirement: '现场扫码联调视频与验收签字单',
      deliverable_submission: '现场已完成 500 件商品批量出入库盲扫测试，硬件 PDA 兼容通过。',
      deliverable_submitted_at: '2026-08-04T10:00:00.000Z',
      done_at: '2026-08-04T10:00:00.000Z',
      created_at: now,
    },
    {
      id: 'task_3_2',
      node_id: n3Id,
      name: '库位动态分配与波次拣货算法',
      owner: '吴工',
      due_date: '2026-08-12',
      status: 'done',
      has_deliverable: false,
      deliverable_requirement: '',
      deliverable_submission: null,
      deliverable_submitted_at: null,
      done_at: '2026-08-11T16:20:00.000Z',
      created_at: now,
    },

    {
      id: 'task_4_1',
      node_id: n4Id,
      name: '外部第三方安全渗透测试报告归档',
      owner: '钱总',
      due_date: '2026-09-10',
      status: 'pending',
      has_deliverable: true,
      deliverable_requirement: '交付盖章版安全等级评估及漏洞复测报告',
      deliverable_submission: null,
      deliverable_submitted_at: null,
      done_at: null,
      created_at: now,
    },
  ];

  const comments: DbComment[] = [
    { id: 'cmt_1', node_id: p1Id, task_id: null, parent_id: null, author: '张总 (项目总监)', content: '本周请李工团队重点攻坚 RAG 向量切片性能，确保 8 月 25 日前完成联调！', created_at: '2026-08-17T09:00:00.000Z' },
    { id: 'cmt_2', node_id: null, task_id: 'task_2_2', parent_id: null, author: '刘工', content: 'WebSocket 消息防重联调中发现偶发重连丢失，正在排查心跳包机制。', created_at: '2026-08-17T10:15:00.000Z' },
    { id: 'cmt_3', node_id: null, task_id: 'task_2_2', parent_id: 'cmt_2', author: '陈工', content: '已增加 Redis Ack 机制，预计今天下午完成验证。', created_at: '2026-08-17T11:20:00.000Z' },
  ];

  return {
    nodes,
    tasks,
    templates: [tpl1, tpl2],
    templateStages: [...tplStages1, ...tplStages2],
    templateDeliverables: [...tplDeliv1, ...tplDeliv2],
    comments,
    activities: [],
  };
}

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
        persistDb();
      } else if (!Array.isArray(inMemoryDb.activities)) {
        inMemoryDb.activities = [];
      }
    } catch {
      inMemoryDb = getInitialDatabase();
      persistDb();
    }
  } else {
    inMemoryDb = getInitialDatabase();
    persistDb();
  }

  if (!inMemoryDb.activities) inMemoryDb.activities = [];
  return inMemoryDb!;
}

export function persistDb(): void {
  if (!inMemoryDb) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(inMemoryDb, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('Failed to persist database:', err);
  }
}
