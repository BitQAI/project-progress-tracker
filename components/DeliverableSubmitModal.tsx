'use client';

import React, { useState, useMemo, useRef } from 'react';
import { DbTask, FileAttachment, AttachmentType } from '@/lib/types';
import { getTodayBeijingString } from '@/lib/date-utils';
import { safeFetchJson } from '@/lib/fetch-utils';
import { AttachmentPreviewModal } from './AttachmentPreviewModal';
import {
  FileCheck,
  X,
  AlertCircle,
  Link2,
  Calendar,
  CheckCircle2,
  Clock,
  UploadCloud,
  FileCode,
  FileText,
  Image as ImageIcon,
  Trash2,
  Eye,
  Loader2,
  Paperclip,
} from 'lucide-react';

interface DeliverableSubmitModalProps {
  isOpen: boolean;
  task: DbTask | null;
  onClose: () => void;
  onSubmitSuccess: (
    taskId: string,
    submissionText: string,
    doneDate: string,
    attachments?: FileAttachment[]
  ) => Promise<void>;
}

export function DeliverableSubmitModal({
  isOpen,
  task,
  onClose,
  onSubmitSuccess,
}: DeliverableSubmitModalProps) {
  if (!isOpen || !task) return null;

  return (
    <DeliverableSubmitModalContent
      key={task.id}
      task={task}
      onClose={onClose}
      onSubmitSuccess={onSubmitSuccess}
    />
  );
}

function DeliverableSubmitModalContent({
  task,
  onClose,
  onSubmitSuccess,
}: {
  task: DbTask;
  onClose: () => void;
  onSubmitSuccess: (
    taskId: string,
    submissionText: string,
    doneDate: string,
    attachments?: FileAttachment[]
  ) => Promise<void>;
}) {
  const todayStr = useMemo(() => getTodayBeijingString(), []);
  const [submission, setSubmission] = useState(task.deliverable_submission || '');
  const [doneDate, setDoneDate] = useState(() => {
    return task.done_at ? task.done_at.split('T')[0] : todayStr;
  });
  const [attachments, setAttachments] = useState<FileAttachment[]>(task.deliverable_attachments || []);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [previewAttachment, setPreviewAttachment] = useState<FileAttachment | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 计算所选完成时间相较于计划截止日的差异
  const completionDiff = useMemo(() => {
    if (!doneDate || !task.due_date) return null;
    const dDone = new Date(doneDate + 'T00:00:00');
    const dDue = new Date(task.due_date + 'T00:00:00');
    const diffMs = dDone.getTime() - dDue.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        label: `提前 ${Math.abs(diffDays)} 天完工`,
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      };
    } else if (diffDays === 0) {
      return {
        label: '按期完工',
        badgeClass: 'bg-teal-100 text-teal-800 border-teal-200',
      };
    } else {
      return {
        label: `延期 ${diffDays} 天完工`,
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
      };
    }
  }, [doneDate, task.due_date]);

  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }, []);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setErrorMsg('');

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        const res = await safeFetchJson<any>('/api/qiniu/upload', {
          method: 'POST',
          body: formData,
        });
        if (!res.ok || !res.data?.ok) {
          throw new Error(res.error || res.data?.error || `上传「${file.name}」失败`);
        }
        const data = res.data;
        const newAttachment: FileAttachment = {
          id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: data.name || file.name,
          url: data.url,
          type: (data.type as AttachmentType) || 'other',
          size: data.size || file.size,
          uploaded_at: new Date().toISOString(),
        };
        return newAttachment;
      });

      const results = await Promise.all(uploadPromises);
      setAttachments((prev) => [...prev, ...results]);
    } catch (err: any) {
      console.error('Upload error:', err);
      setErrorMsg(err.message || '上传文件失败');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (attId: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== attId));
  };

  const getFormatIcon = (type: AttachmentType) => {
    switch (type) {
      case 'image':
        return <ImageIcon className="h-4 w-4 text-sky-500" />;
      case 'md':
        return <FileCode className="h-4 w-4 text-emerald-500" />;
      case 'pdf':
        return <FileText className="h-4 w-4 text-rose-500" />;
      default:
        return <FileText className="h-4 w-4 text-zinc-500" />;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (task.has_deliverable && !submission.trim() && attachments.length === 0) {
      setErrorMsg('该任务设置了交付件要求，请填写交付成果内容或上传附件（图片/MD/PDF）');
      return;
    }
    if (!doneDate) {
      setErrorMsg('请选择实际完成日期');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await onSubmitSuccess(task.id, submission.trim(), doneDate, attachments);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || '提交失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-2xs animate-in fade-in duration-150">
        <div
          id="modal-submit-deliverable"
          role="dialog"
          aria-modal="true"
          className="w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl space-y-4 max-h-[92vh] overflow-y-auto"
        >
          <div className="flex items-start justify-between border-b border-zinc-150 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900">
                  {task.has_deliverable ? '交付件归档与完工确认' : '确认任务已完成'}
                </h3>
                <p className="text-xs text-zinc-500">
                  记录任务实际完工时间、成果结论与附件留档
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* 任务基本信息摘要 */}
          <div className="rounded-xl border border-zinc-150 bg-zinc-50/80 p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-zinc-800 text-sm">{task.name}</span>
              <span className="rounded bg-zinc-200/80 px-2 py-0.5 text-[11px] text-zinc-700">
                负责人: {task.owner}
              </span>
            </div>
            <div className="flex items-center gap-4 text-zinc-600 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                <span>计划截止日期: {task.due_date || '未排期'}</span>
              </div>
              {task.estimated_duration && (
                <div className="flex items-center gap-1.5 text-zinc-500">
                  <Clock className="h-3.5 w-3.5 text-zinc-400" />
                  <span>预估周期: {task.estimated_duration}</span>
                </div>
              )}
            </div>
            {task.deliverable_requirement && (
              <div className="flex items-start gap-1.5 text-emerald-800 bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-100">
                <Link2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-emerald-600" />
                <div className="flex-1 min-w-0">
                  <strong className="font-semibold">交付件规范要求:</strong>
                  <p className="mt-0.5 whitespace-pre-wrap leading-relaxed">
                    {task.deliverable_requirement}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 提交表单 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 实际完成时间设置 */}
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-zinc-500" />
                  实际完成时间 <span className="text-red-500">*</span>
                </label>
                {completionDiff && (
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold border ${completionDiff.badgeClass}`}>
                    {completionDiff.label}
                  </span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <input
                  type="date"
                  required
                  id="input-task-done-date"
                  value={doneDate}
                  onChange={(e) => setDoneDate(e.target.value)}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />

                {/* 快捷填入按钮 */}
                <div className="flex items-center gap-1.5 flex-wrap text-xs">
                  <button
                    type="button"
                    onClick={() => setDoneDate(todayStr)}
                    className={`rounded-md px-2 py-1 text-[11px] font-medium border transition-colors ${
                      doneDate === todayStr
                        ? 'bg-zinc-900 text-white border-zinc-900'
                        : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                    }`}
                  >
                    今天
                  </button>
                  {task.due_date && (
                    <button
                      type="button"
                      onClick={() => setDoneDate(task.due_date!)}
                      className={`rounded-md px-2 py-1 text-[11px] font-medium border transition-colors ${
                        doneDate === task.due_date
                          ? 'bg-zinc-900 text-white border-zinc-900'
                          : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                      }`}
                    >
                      计划截止日 ({task.due_date})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setDoneDate(yesterdayStr)}
                    className={`rounded-md px-2 py-1 text-[11px] font-medium border transition-colors ${
                      doneDate === yesterdayStr
                        ? 'bg-zinc-900 text-white border-zinc-900'
                        : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                    }`}
                  >
                    昨天
                  </button>
                </div>
              </div>
            </div>

            {/* 交付件 / 完工成果说明 */}
            <div>
              <label className="block text-xs font-bold uppercase text-zinc-700 mb-1">
                {task.has_deliverable ? (
                  <>
                    交付成果说明 / 结论 / 在线链接 {attachments.length === 0 && <span className="text-red-500">*</span>}
                  </>
                ) : (
                  <>完工成果备注 / 验收说明 (可选)</>
                )}
              </label>
              <textarea
                rows={3}
                id="input-deliverable-submission"
                placeholder={
                  task.has_deliverable
                    ? '例如：已完成架构方案评审，测试用例通过率 100%，已附带架构图与规范报告...'
                    : '可填写本次完工的核心结论、相关链接或协作备注...'
                }
                value={submission}
                onChange={(e) => {
                  setSubmission(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                className="w-full rounded-xl border border-zinc-200 p-3 text-xs leading-relaxed text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>

            {/* 交付件附件上传区 (图片 / MD / PDF) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                  <Paperclip className="h-3.5 w-3.5 text-zinc-500" />
                  交付成果附件归档 (支持 图片 / Markdown / PDF)
                </label>
                <span className="text-3xs text-zinc-500">已添加 {attachments.length} 个文件</span>
              </div>

              {/* 上传拖拽与选择入口 */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleFileUpload(e.dataTransfer.files);
                }}
                className={`flex flex-col items-center justify-center p-3.5 rounded-xl border-2 border-dashed border-zinc-200 hover:border-emerald-500 bg-zinc-50/50 hover:bg-emerald-50/20 cursor-pointer transition-all ${
                  isUploading ? 'opacity-60 pointer-events-none' : ''
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/svg+xml,.md,.markdown,text/markdown,text/plain,.pdf,application/pdf"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files)}
                />
                <div className="flex items-center gap-2 text-zinc-600">
                  {isUploading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                  ) : (
                    <UploadCloud className="h-5 w-5 text-emerald-600" />
                  )}
                  <span className="text-xs font-medium text-zinc-700">
                    {isUploading ? '正在上传附件至七牛云...' : '点击或拖拽上传交付成果文件'}
                  </span>
                </div>
                <p className="text-3xs text-zinc-400 mt-1">
                  支持 JPG/PNG 图片、Markdown (.md)、PDF 文档 (单文件最大 30MB)
                </p>
              </div>

              {/* 已上传附件卡片列表 */}
              {attachments.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs hover:bg-zinc-100/70 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white border border-zinc-200 shadow-2xs">
                          {getFormatIcon(att.type)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-zinc-800 truncate max-w-xs">{att.name}</p>
                          <p className="text-3xs text-zinc-400">
                            {formatFileSize(att.size)} • {att.type.toUpperCase()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setPreviewAttachment(att)}
                          className="p-1.5 text-zinc-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="在线预览"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(att.id)}
                          className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="移除附件"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {errorMsg && (
              <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 p-2.5 rounded-lg">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-150">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting || isUploading}
                className="rounded-lg border border-zinc-200 px-3.5 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                暂不完成
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isUploading}
                id="btn-submit-deliverable-done"
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition-all disabled:opacity-50"
              >
                <FileCheck className="h-3.5 w-3.5" />
                <span>{isSubmitting ? '正在归档...' : '确认归档并完成'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* 统一附件在线预览模态框 */}
      {previewAttachment && (
        <AttachmentPreviewModal
          isOpen={!!previewAttachment}
          attachment={previewAttachment}
          attachmentList={attachments}
          onSelectAttachment={(a) => setPreviewAttachment(a)}
          onClose={() => setPreviewAttachment(null)}
        />
      )}
    </>
  );
}

