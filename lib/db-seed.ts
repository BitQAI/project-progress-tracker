import {
  DbNode,
  DbTask,
  DbTemplate,
  DbTemplateStage,
  DbTemplateDeliverable,
  DbComment,
  AppDatabase,
} from './types';

export function getInitialDatabase(): AppDatabase {
  const now = new Date().toISOString();

  // 1. 唯一且深度完整的标准流程模板：企业中长期战略规划与组织变革一体化咨询标准方案
  const tplMaster: DbTemplate = {
    id: 'tpl_consulting_master',
    name: '企业中长期战略规划与组织变革一体化咨询标准方案',
    description: '适用于中大型集团或高成长企业，涵盖企业战略诊断、主营业务组合、年度战略地图解码(BSC)、集团管控模式重塑、部门职责厘清、定岗定编测算及全套岗位说明书(JD)编制的端到端深度交付标准流程。',
    created_at: now,
  };

  const tplStages: DbTemplateStage[] = [
    { id: 'stg_1', template_id: tplMaster.id, name: '阶段一：战略诊断、内外部环境分析与标杆对标', order: 1 },
    { id: 'stg_2', template_id: tplMaster.id, name: '阶段二：中长期战略设计与主干业务组合规划', order: 2 },
    { id: 'stg_3', template_id: tplMaster.id, name: '阶段三：战略解码与平衡计分卡(BSC)量化分解', order: 3 },
    { id: 'stg_4', template_id: tplMaster.id, name: '阶段四：集团管控模式重塑与中心组织架构重构', order: 4 },
    { id: 'stg_5', template_id: tplMaster.id, name: '阶段五：岗位定岗定编与岗位说明书(JD)库建设', order: 5 },
  ];

  const tplDeliverables: DbTemplateDeliverable[] = [
    // 阶段一 任务与子任务
    { id: 'del_1_1', stage_id: 'stg_1', parent_id: null, name: '宏观政策环境(PEST)与行业竞争态势分析', order: 1 },
    { id: 'del_1_1_sub1', stage_id: 'stg_1', parent_id: 'del_1_1', name: 'PEST 宏观政策导向及行业准入壁垒分析', order: 1 },
    { id: 'del_1_1_sub2', stage_id: 'stg_1', parent_id: 'del_1_1', name: '行业前五标杆企业商业模式与多维财务对标', order: 2, has_deliverable: true, deliverable_requirement: '交付《标杆企业商业模式与多维对标报告》' },

    { id: 'del_1_2', stage_id: 'stg_1', parent_id: null, name: '企业内部核心资源审计与骨干访谈', order: 2 },
    { id: 'del_1_2_sub1', stage_id: 'stg_1', parent_id: 'del_1_2', name: '高管及中层管理骨干一对一访谈与核心痛点归集', order: 1 },
    { id: 'del_1_2_sub2', stage_id: 'stg_1', parent_id: 'del_1_2', name: '内部关键业务流程断点与核心能力缺口审计', order: 2, has_deliverable: true, deliverable_requirement: '交付《企业资源审计评估与内部痛点审计清单》' },

    { id: 'del_1_3', stage_id: 'stg_1', parent_id: null, name: '战略定位机会(SWOT)交叉矩阵提炼与诊断汇报', order: 3 },
    { id: 'del_1_3_sub1', stage_id: 'stg_1', parent_id: 'del_1_3', name: 'SO/ST/WO/WT 多重交叉战略组合推演与方向锁定', order: 1 },
    { id: 'del_1_3_sub2', stage_id: 'stg_1', parent_id: 'del_1_3', name: '第一阶段战略诊断与核心课题向董事会汇报', order: 2, has_deliverable: true, deliverable_requirement: '交付《第一阶段战略诊断与核心课题汇报PPT（加盖审计章）》' },

    // 阶段二 任务与子任务
    { id: 'del_2_1', stage_id: 'stg_2', parent_id: null, name: '集团使命、愿景、核心价值观确立', order: 1 },
    { id: 'del_2_1_sub1', stage_id: 'stg_2', parent_id: 'del_2_1', name: '企业文化精神提炼与三年/五年愿景指标设计', order: 1 },

    { id: 'del_2_2', stage_id: 'stg_2', parent_id: null, name: '三曲线主干业务组合与新增长极规划', order: 2 },
    { id: 'del_2_2_sub1', stage_id: 'stg_2', parent_id: 'del_2_2', name: '第一曲线（现金流主业）效率提升与数字化重构方案', order: 1 },
    { id: 'del_2_2_sub2', stage_id: 'stg_2', parent_id: 'del_2_2', name: '第二曲线（高成长新星）市场渗透与组织配称方案', order: 2 },
    { id: 'del_2_2_sub3', stage_id: 'stg_2', parent_id: 'del_2_2', name: '第三曲线（前瞻孵化）创新机制与投融资布局手册', order: 3, has_deliverable: true, deliverable_requirement: '交付《三曲线业务组合与中长期发展布局大纲手册》' },

    { id: 'del_2_3', stage_id: 'stg_2', parent_id: null, name: '区域布局与战略总体规划案最终提报', order: 3 },
    { id: 'del_2_3_sub1', stage_id: 'stg_2', parent_id: 'del_2_3', name: '核心区域与下沉市场开拓路线图及销售网络配称', order: 1 },
    { id: 'del_2_3_sub2', stage_id: 'stg_2', parent_id: 'del_2_3', name: '中长期战略总体规划案向董事会最终提报', order: 2, has_deliverable: true, deliverable_requirement: '交付《企业中长期战略总体规划白皮书与商业计划书》' },

    // 阶段三 任务与子任务
    { id: 'del_3_1', stage_id: 'stg_3', parent_id: null, name: '集团年度战略地图(Strategy Map)绘制', order: 1 },
    { id: 'del_3_1_sub1', stage_id: 'stg_3', parent_id: 'del_3_1', name: '财务、客户、内部流程、学习与成长四维度归因因果链设计', order: 1 },
    { id: 'del_3_1_sub2', stage_id: 'stg_3', parent_id: 'del_3_1', name: '20 大核心战略议题指标关联矩阵绘制', order: 2, has_deliverable: true, deliverable_requirement: '交付《集团年度高保真战略地图（四维度高清大图）》' },

    { id: 'del_3_2', stage_id: 'stg_3', parent_id: null, name: '平衡计分卡(BSC)指标解码与大表建立', order: 2 },
    { id: 'del_3_2_sub1', stage_id: 'stg_3', parent_id: 'del_3_2', name: '集团级平衡计分卡 KPI 及 OKR 目标量化设定', order: 1 },
    { id: 'del_3_2_sub2', stage_id: 'stg_3', parent_id: 'del_3_2', name: '各核心中心/部门平衡计分卡指标(BSC一卡)承接分解', order: 2, has_deliverable: true, deliverable_requirement: '交付《各中心/部门平衡计分卡指标量化分解承载底表》' },

    { id: 'del_3_3', stage_id: 'stg_3', parent_id: null, name: '战略任务规划、控制塔建立与资源配置', order: 3 },
    { id: 'del_3_3_sub1', stage_id: 'stg_3', parent_id: 'del_3_3', name: '核心变革任务专项行动方案编制与预算测算', order: 1 },
    { id: 'del_3_3_sub2', stage_id: 'stg_3', parent_id: 'del_3_3', name: '战略控制塔(Control Tower)警报阈值与复盘机制建立', order: 2, has_deliverable: true, deliverable_requirement: '交付《集团中长期战略执行年度控制塔与关键行动指引方案》' },

    // 阶段四 任务与子任务
    { id: 'del_4_1', stage_id: 'stg_4', parent_id: null, name: '总部与分子公司战略/运营/财务管控模式界定', order: 1 },
    { id: 'del_4_1_sub1', stage_id: 'stg_4', parent_id: 'del_4_1', name: '总部功能定位及分子公司授权审批底表设计', order: 1 },
    { id: 'del_4_1_sub2', stage_id: 'stg_4', parent_id: 'del_4_1', name: '集团三大管控模式（财务、战略、运营型）适用性匹配论证报告', order: 2, has_deliverable: true, deliverable_requirement: '交付《集团总部与子公司管控定位边界重塑及管控大纲》' },

    { id: 'del_4_2', stage_id: 'stg_4', parent_id: null, name: '集团组织架构设计与汇报线理顺', order: 2 },
    { id: 'del_4_2_sub1', stage_id: 'stg_4', parent_id: 'del_4_2', name: '高层管理团队分工、决策机制与治理架构图绘制', order: 1 },
    { id: 'del_4_2_sub2', stage_id: 'stg_4', parent_id: 'del_4_2', name: '新版部门组织框图、核心定位与人员定级方案', order: 2, has_deliverable: true, deliverable_requirement: '交付《高保真集团组织架构及汇报关系大图》' },

    { id: 'del_4_3', stage_id: 'stg_4', parent_id: null, name: '跨部门职责界面及权责边界厘清', order: 3 },
    { id: 'del_4_3_sub1', stage_id: 'stg_4', parent_id: 'del_4_3', name: '多部门协同难点流程（如跨区域采购、联合营销等）RACIS模型权责表编制', order: 1, has_deliverable: true, deliverable_requirement: '交付《集团各中心部门职责界限及多中心联合权责边界矩阵(RACIS)》' },

    // 阶段五 任务与子任务
    { id: 'del_5_1', stage_id: 'stg_5', parent_id: null, name: '岗位序列划分、职级发展通道及定员标准设计', order: 1 },
    { id: 'del_5_1_sub1', stage_id: 'stg_5', parent_id: 'del_5_1', name: '管理、专业、销售、生产多序列职级阶梯与发展双通道设计', order: 1 },
    { id: 'del_5_1_sub2', stage_id: 'stg_5', parent_id: 'del_5_1', name: '岗位价值评估(IPE模型)要素设计与权重确定', order: 2, has_deliverable: true, deliverable_requirement: '交付《岗位价值评估体系要素与职级序列大纲》' },

    { id: 'del_5_2', stage_id: 'stg_5', parent_id: null, name: '各岗定岗定编测算与平滑套入', order: 2 },
    { id: 'del_5_2_sub1', stage_id: 'stg_5', parent_id: 'del_5_2', name: '各部门工作饱和度、岗位工作量测算及对标测算', order: 1 },
    { id: 'del_5_2_sub2', stage_id: 'stg_5', parent_id: 'del_5_2', name: '薪酬成本测算、年度招聘编制控制与预算分配模型', order: 2, has_deliverable: true, deliverable_requirement: '交付《全岗位名册、人员编制精细化测算套编表(Excel)》' },

    { id: 'del_5_3', stage_id: 'stg_5', parent_id: null, name: '企业级标准岗位说明书(JD)数据库编制', order: 3 },
    { id: 'del_5_3_sub1', stage_id: 'stg_5', parent_id: 'del_5_3', name: '全岗位工作职责、任职资格、关键绩效考核指标(KPI)提炼', order: 1 },
    { id: 'del_5_3_sub2', stage_id: 'stg_5', parent_id: 'del_5_3', name: '各中心/部门骨干标准《岗位说明书 (JD)》归档', order: 2, has_deliverable: true, deliverable_requirement: '交付《全员各序列标准岗位说明书(JD)数据库手册》' },
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
    templates: [tplMaster],
    templateStages: tplStages,
    templateDeliverables: tplDeliverables,
    comments,
    activities: [],
  };
}
