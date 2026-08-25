import { getDb, persistDb } from './db';
import { DbTemplate, TemplateWithStages } from './types';

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

export async function getTemplates(): Promise<TemplateWithStages[]> {
  const db = getDb();
  const templates: DbTemplate[] = [...db.templates].sort((a, b) =>
    b.created_at.localeCompare(a.created_at)
  );

  const result: TemplateWithStages[] = [];

  for (const tpl of templates) {
    const stages = db.templateStages
      .filter((s) => s.template_id === tpl.id)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    const stagesList: TemplateWithStages['stages'] = stages.map((stg) => {
      const deliverables = db.templateDeliverables
        .filter((d) => d.stage_id === stg.id)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      return {
        ...stg,
        deliverables,
      };
    });

    result.push({
      ...tpl,
      stages: stagesList,
    });
  }

  return result;
}

export async function createTemplate(
  name: string,
  stages: {
    name: string;
    tasks?: {
      name: string;
      has_deliverable?: boolean;
      deliverable_requirement?: string;
      subtasks?: {
        name: string;
        has_deliverable?: boolean;
        deliverable_requirement?: string;
      }[];
    }[];
    deliverables?: string[];
  }[]
): Promise<string> {
  const db = getDb();
  const tplId = generateId('tpl');
  const now = new Date().toISOString();

  db.templates.push({
    id: tplId,
    name,
    created_at: now,
  });

  stages.forEach((stage, sIdx) => {
    const stageId = generateId('stg');
    db.templateStages.push({
      id: stageId,
      template_id: tplId,
      name: stage.name,
      order: sIdx + 1,
    });

    let orderCounter = 1;

    if (stage.tasks && stage.tasks.length > 0) {
      stage.tasks.forEach((task) => {
        const taskId = generateId('del');
        db.templateDeliverables.push({
          id: taskId,
          stage_id: stageId,
          parent_id: null,
          name: task.name,
          order: orderCounter++,
          has_deliverable: task.has_deliverable === true,
          deliverable_requirement: task.deliverable_requirement || '',
        });

        if (task.subtasks && task.subtasks.length > 0) {
          task.subtasks.forEach((subtask) => {
            db.templateDeliverables.push({
              id: generateId('del'),
              stage_id: stageId,
              parent_id: taskId,
              name: subtask.name,
              order: orderCounter++,
              has_deliverable: subtask.has_deliverable === true,
              deliverable_requirement: subtask.deliverable_requirement || '',
            });
          });
        }
      });
    } else if (stage.deliverables && stage.deliverables.length > 0) {
      stage.deliverables.forEach((delName, dIdx) => {
        db.templateDeliverables.push({
          id: generateId('del'),
          stage_id: stageId,
          parent_id: null,
          name: delName,
          order: dIdx + 1,
          has_deliverable: false,
          deliverable_requirement: '',
        });
      });
    }
  });

  await persistDb();
  return tplId;
}

export async function deleteTemplate(templateId: string): Promise<void> {
  const db = getDb();
  const stages = db.templateStages.filter((s) => s.template_id === templateId);
  const stageIds = new Set(stages.map((s) => s.id));

  db.templateDeliverables = db.templateDeliverables.filter((d) => !stageIds.has(d.stage_id));
  db.templateStages = db.templateStages.filter((s) => s.template_id !== templateId);
  db.templates = db.templates.filter((t) => t.id !== templateId);

  await persistDb();
}
