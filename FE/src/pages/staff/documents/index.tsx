import { FC, useEffect, useState, useMemo } from 'react';
import { Flex, Input, Modal, Form, Select, Alert, Spin, Tag, message } from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  FileDoneOutlined,
  ReloadOutlined,
  UploadOutlined,
} from '@ant-design/icons';

import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/Button';
import { ClearanceGate } from '@/components/ui/ClearanceGate';
import { DocumentRow, type DocumentStatus } from '@/components/ui/DocumentRow';
import { StatTile } from '@/components/ui/StatTile';
import { clearanceApi } from '@/apis/clearance';
import type {
  ChecklistItem,
  ClearanceStatus,
  DocumentVersion,
  ReviewDocumentRequest,
  DocumentUploadRequest,
} from '@/interfaces';

// Default mock Job ID for local exploration if no job is selected yet
const DEFAULT_JOB_ID = '00000000-0000-0000-0000-000000000001';

const DocumentsPage: FC = () => {
  const [activeTab, setActiveTab] = useState<'pending' | 'checklist'>('pending');
  const [jobId, setJobId] = useState<string>(DEFAULT_JOB_ID);
  const [jobCodeInput, setJobCodeInput] = useState<string>('CBRT-2026-001');

  // Data states
  const [pendingReviews, setPendingReviews] = useState<DocumentVersion[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [clearanceStatus, setClearanceStatus] = useState<ClearanceStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [gateEvaluating, setGateEvaluating] = useState<boolean>(false);

  // Review Modal state
  const [reviewingVersion, setReviewingVersion] = useState<DocumentVersion | null>(null);
  const [reviewForm] = Form.useForm<ReviewDocumentRequest>();
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);

  // Upload Modal state
  const [uploadingItem, setUploadingItem] = useState<ChecklistItem | null>(null);
  const [uploadForm] = Form.useForm<DocumentUploadRequest>();
  const [submittingUpload, setSubmittingUpload] = useState<boolean>(false);

  // Load Pending Reviews
  const fetchPendingReviews = async () => {
    try {
      setLoading(true);
      const res = await clearanceApi.getPendingReviews();
      setPendingReviews(res.data);
    } catch {
      // Graceful fallback for mock/demo mode
      setPendingReviews([]);
    } finally {
      setLoading(false);
    }
  };

  // Load Checklist & Clearance Status for the current job
  const fetchJobData = async (targetJobId: string) => {
    try {
      setLoading(true);
      const [checklistRes, statusRes] = await Promise.allSettled([
        clearanceApi.getChecklist(targetJobId),
        clearanceApi.getClearanceStatus(targetJobId),
      ]);

      if (checklistRes.status === 'fulfilled') {
        setChecklist(checklistRes.value.data);
      } else {
        setChecklist([]);
      }

      if (statusRes.status === 'fulfilled') {
        setClearanceStatus(statusRes.value.data);
      } else {
        setClearanceStatus(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchPendingReviews();
    void fetchJobData(jobId);
  }, [jobId]);

  // Handle Clearance Gate re-evaluation
  const handleEvaluateGate = async () => {
    try {
      setGateEvaluating(true);
      const res = await clearanceApi.evaluateClearanceGate(jobId);
      setClearanceStatus(res.data);
      if (res.data.clearanceReady) {
        message.success('Cổng thông quan đã MỞ (Clear to depart)!');
      } else {
        message.warning('Chuyến đi chưa đủ điều kiện thông quan. Vui lòng kiểm tra các mục còn thiếu.');
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      message.error(e?.response?.data?.message || 'Không thể kiểm tra cổng thông quan.');
    } finally {
      setGateEvaluating(false);
    }
  };

  // Handle Review submission (Approve / Reject)
  const handleReviewSubmit = async (values: ReviewDocumentRequest) => {
    if (!reviewingVersion) return;
    try {
      setSubmittingReview(true);
      await clearanceApi.reviewDocument(reviewingVersion.id, values);
      message.success(`Đã thẩm định tài liệu thành công: ${values.review}`);
      setReviewingVersion(null);
      reviewForm.resetFields();
      void fetchPendingReviews();
      void fetchJobData(jobId);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      message.error(e?.response?.data?.message || 'Lỗi khi duyệt tài liệu.');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Handle Upload submission
  const handleUploadSubmit = async (values: DocumentUploadRequest) => {
    if (!uploadingItem) return;
    try {
      setSubmittingUpload(true);
      await clearanceApi.uploadDocumentVersion(uploadingItem.id, values);
      message.success('Đã tải lên phiên bản mới thành công!');
      setUploadingItem(null);
      uploadForm.resetFields();
      void fetchJobData(jobId);
      void fetchPendingReviews();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      message.error(e?.response?.data?.message || 'Lỗi khi tải lên tài liệu.');
    } finally {
      setSubmittingUpload(false);
    }
  };

  // Map Checklist item to DocumentRow status
  const mapItemStatus = (item: ChecklistItem): DocumentStatus => {
    if (item.status === 'CLEARED') return 'cleared';
    if (item.validity === 'RED') return 'red';
    if (item.validity === 'AMBER') return 'amber';
    if (item.status === 'IN_REVIEW') return 'review';
    return 'required';
  };

  // Calculate metrics
  const stats = useMemo(() => {
    const total = checklist.length;
    const cleared = checklist.filter((i) => i.status === 'CLEARED').length;
    const inReview = checklist.filter((i) => i.status === 'IN_REVIEW').length;
    const issues = checklist.filter((i) => i.validity === 'RED' || i.validity === 'AMBER').length;
    return { total, cleared, inReview, issues };
  }, [checklist]);

  return (
    <Flex vertical gap={28} className="max-w-[1240px] pb-16">
      <PageHeader
        title="Documents & Clearance"
        summary="Chuyên viên Thủ tục & Kiểm dịch: thẩm định hồ sơ y tế, tiêm chủng, hộ chiếu và kiểm tra tính hợp lệ trước khi cấp phép xuất cảnh."
        right={
          <Flex gap={8}>
            <Button
              variant="secondary"
              size="sm"
              leadingIcon="history"
              onClick={() => {
                void fetchPendingReviews();
                void fetchJobData(jobId);
              }}
            >
              Làm mới
            </Button>
          </Flex>
        }
      />

      {/* Clearance Gate Section */}
      <ClearanceGate
        state={clearanceStatus?.clearanceReady ? 'clear' : 'locked'}
        title={
          clearanceStatus?.clearanceReady
            ? `Cổng thông quan ĐÃ MỞ (Job ${clearanceStatus.jobCode ?? jobCodeInput})`
            : `Cổng thông quan ĐANG KHÓA (Job ${clearanceStatus?.jobCode ?? jobCodeInput})`
        }
        action={
          <Button
            variant="secondary"
            size="sm"
            disabled={gateEvaluating}
            onClick={handleEvaluateGate}
          >
            <ReloadOutlined spin={gateEvaluating} className="mr-1" /> Kiểm tra lại cổng
          </Button>
        }
      >
        {clearanceStatus?.clearanceReady ? (
          'Tất cả giấy tờ kiểm dịch bắt buộc đã đạt chuẩn GREEN và thời gian cách ly kiểm dịch hoàn tất. Chuyến xe được phép xuất phát.'
        ) : clearanceStatus?.outstandingIssues && clearanceStatus.outstandingIssues.length > 0 ? (
          <ul className="m-0 list-disc pl-4 text-[13px] text-bad">
            {clearanceStatus.outstandingIssues.map((issue, idx) => (
              <li key={idx}>{issue}</li>
            ))}
          </ul>
        ) : (
          'Còn các giấy tờ pháp lý cần chuyên viên kiểm tra và phê duyệt trước khi mở cổng khởi hành.'
        )}
      </ClearanceGate>

      {/* KPI Stat Tiles */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile
          tone="neutral"
          value={stats.total}
          label="Tổng giấy tờ yêu cầu"
          lead={`Chuyến đi: ${clearanceStatus?.jobCode ?? jobCodeInput}`}
        />
        <StatTile
          tone="ok"
          value={stats.cleared}
          label="Đã thông quan (Cleared)"
          lead={`${stats.cleared}/${stats.total} mục đạt chuẩn`}
        />
        <StatTile
          tone="info"
          value={pendingReviews.length}
          label="Đang chờ chuyên viên duyệt"
          lead="Trong hộp thư kiểm duyệt"
          onClick={() => setActiveTab('pending')}
        />
        <StatTile
          tone={stats.issues > 0 ? 'bad' : 'neutral'}
          value={stats.issues}
          label="Cảnh báo hạn / Vi phạm"
          lead={stats.issues > 0 ? 'Cần bổ sung/cấp lại' : 'Không có vi phạm'}
        />
      </div>

      {/* Tabs navigation */}
      <Flex gap={12} className="border-b border-line pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          className={`cursor-pointer border-b-2 px-4 py-2 text-[14px] font-medium transition-colors ${
            activeTab === 'pending'
              ? 'border-gold text-ink'
              : 'border-transparent text-ink-3 hover:text-ink'
          }`}
        >
          <ClockCircleOutlined className="mr-2" />
          Hộp thư chờ duyệt ({pendingReviews.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('checklist')}
          className={`cursor-pointer border-b-2 px-4 py-2 text-[14px] font-medium transition-colors ${
            activeTab === 'checklist'
              ? 'border-gold text-ink'
              : 'border-transparent text-ink-3 hover:text-ink'
          }`}
        >
          <FileDoneOutlined className="mr-2" />
          Checklist hồ sơ theo Chuyến ({checklist.length})
        </button>
      </Flex>

      {/* Tab 1: Pending Reviews Inbox */}
      {activeTab === 'pending' && (
        <Flex vertical gap={16}>
          <Flex justify="space-between" align="center">
            <span className="type-h3 text-ink">Danh sách chứng từ cần thẩm định</span>
            <span className="text-[13px] text-ink-3">
              Chỉ Chuyên viên thủ tục mới có quyền phê duyệt hoặc từ chối
            </span>
          </Flex>

          {loading ? (
            <Flex justify="center" className="py-10">
              <Spin tip="Đang tải danh sách chờ duyệt..." />
            </Flex>
          ) : pendingReviews.length === 0 ? (
            <Alert
              type="success"
              showIcon
              message="Hộp thư kiểm duyệt trống"
              description="Hiện không có phiên bản tài liệu nào đang chờ duyệt. Tất cả hồ sơ đã được xử lý."
            />
          ) : (
            <div className="overflow-hidden rounded-lg border border-line bg-card">
              {pendingReviews.map((ver) => (
                <div
                  key={ver.id}
                  className="flex flex-col gap-3 border-b border-line p-5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <Flex vertical gap={4} className="flex-1">
                    <Flex gap={8} align="center">
                      <Tag color="processing">v{ver.versionNo}</Tag>
                      <span className="font-semibold text-ink">
                        {ver.fileName || 'Tài liệu đính kèm'}
                      </span>
                      {ver.issuer && <span className="text-ink-3">· Cấp bởi: {ver.issuer}</span>}
                    </Flex>
                    <div className="text-[13px] text-ink-2">
                      {ver.sampledOn && <span>Lấy mẫu: {ver.sampledOn} | </span>}
                      {ver.issuedOn && <span>Cấp ngày: {ver.issuedOn} | </span>}
                      {ver.validUntil && <span>Hết hạn: {ver.validUntil}</span>}
                    </div>
                    <span className="text-[12px] text-ink-3">
                      Tải lên bởi: {ver.uploadedByName ?? 'Khách hàng'} (
                      {new Date(ver.uploadedAt).toLocaleString('vi-VN')})
                    </span>
                  </Flex>

                  <Flex gap={8} align="center">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setReviewingVersion(ver);
                        reviewForm.setFieldsValue({ review: 'APPROVED' });
                      }}
                    >
                      <CheckCircleOutlined className="mr-1" /> Duyệt đạt
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        setReviewingVersion(ver);
                        reviewForm.setFieldsValue({ review: 'REJECTED' });
                      }}
                    >
                      <ExclamationCircleOutlined className="mr-1" /> Từ chối
                    </Button>
                  </Flex>
                </div>
              ))}
            </div>
          )}
        </Flex>
      )}

      {/* Tab 2: Job Checklist */}
      {activeTab === 'checklist' && (
        <Flex vertical gap={16}>
          <Flex gap={16} align="end" wrap="wrap">
            <Flex vertical gap={4}>
              <label htmlFor="job-id-input" className="text-[13px] text-ink-2">
                Mã chuyến đi (Job Code / ID)
              </label>
              <Input
                id="job-id-input"
                value={jobCodeInput}
                onChange={(e) => setJobCodeInput(e.target.value)}
                placeholder="VD: CBRT-2026-001"
                style={{ width: 280 }}
              />
            </Flex>
            <Button
              variant="secondary"
              onClick={() => {
                setJobId(jobCodeInput);
                void fetchJobData(jobCodeInput);
              }}
            >
              Xem Checklist
            </Button>
          </Flex>

          {loading ? (
            <Flex justify="center" className="py-10">
              <Spin tip="Đang tải danh mục checklist..." />
            </Flex>
          ) : checklist.length === 0 ? (
            <Alert
              type="info"
              showIcon
              message="Chưa có dữ liệu checklist cho chuyến đi này"
              description="Hãy kiểm tra lại mã chuyến đi (Job ID/Code) hoặc tạo mới một chuyến đi đã được phê duyệt."
            />
          ) : (
            <div className="overflow-hidden rounded-lg border border-line bg-card">
              {checklist.map((item) => (
                <DocumentRow
                  key={item.id}
                  status={mapItemStatus(item)}
                  document={
                    <span>
                      {item.documentTypeName}{' '}
                      {item.horseName && (
                        <span className="font-normal text-ink-3">({item.horseName})</span>
                      )}
                    </span>
                  }
                  rule={
                    item.ruleDescription ||
                    `Quy tắc: ${item.ruleKind ?? 'PRESENCE_ONLY'} (${item.mandatory ? 'Bắt buộc' : 'Tùy chọn'})`
                  }
                  result={item.validityNote || 'Chưa kiểm tra'}
                  holder={item.holder ? `Bên giữ: ${item.holder}` : undefined}
                  version={
                    item.currentVersion ? (
                      `v${item.currentVersion.versionNo} · ${new Date(
                        item.currentVersion.uploadedAt,
                      ).toLocaleDateString('vi-VN')}`
                    ) : (
                      <span className="text-bad">Chưa nộp</span>
                    )
                  }
                  actions={
                    <Flex gap={6}>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setUploadingItem(item);
                          uploadForm.resetFields();
                        }}
                      >
                        <UploadOutlined /> Nộp bản mới
                      </Button>
                      {item.currentVersion && item.currentVersion.review === 'PENDING' && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            setReviewingVersion(item.currentVersion ?? null);
                            reviewForm.setFieldsValue({ review: 'APPROVED' });
                          }}
                        >
                          Duyệt
                        </Button>
                      )}
                    </Flex>
                  }
                />
              ))}
            </div>
          )}
        </Flex>
      )}

      {/* Modal Duyệt Hồ Sơ */}
      <Modal
        title={`Thẩm định hồ sơ (v${reviewingVersion?.versionNo})`}
        open={Boolean(reviewingVersion)}
        onCancel={() => setReviewingVersion(null)}
        footer={null}
        destroyOnClose
      >
        <Form
          form={reviewForm}
          layout="vertical"
          onFinish={handleReviewSubmit}
          initialValues={{ review: 'APPROVED' }}
          className="mt-4"
        >
          <Form.Item name="review" label="Quyết định thẩm định" rules={[{ required: true }]}>
            <Select
              options={[
                { label: 'Phê duyệt đạt chuẩn (APPROVED)', value: 'APPROVED' },
                { label: 'Từ chối (REJECTED)', value: 'REJECTED' },
              ]}
            />
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prev, curr) => prev.review !== curr.review}
          >
            {({ getFieldValue }) =>
              getFieldValue('review') === 'REJECTED' ? (
                <Form.Item
                  name="rejectReason"
                  label="Lý do từ chối (bắt buộc thông báo cho khách hàng)"
                  rules={[{ required: true, message: 'Vui lòng điền lý do từ chối hồ sơ' }]}
                >
                  <Input.TextArea
                    rows={3}
                    placeholder="VD: Bản scan mờ, sai số vi mạch của ngựa, hoặc giấy xét nghiệm quá hạn..."
                  />
                </Form.Item>
              ) : null
            }
          </Form.Item>

          <Flex justify="end" gap={8} className="mt-6">
            <Button variant="secondary" onClick={() => setReviewingVersion(null)}>
              Hủy
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={submittingReview}
            >
              {submittingReview ? 'Đang lưu...' : 'Xác nhận quyết định'}
            </Button>
          </Flex>
        </Form>
      </Modal>

      {/* Modal Tải lên phiên bản tài liệu mới */}
      <Modal
        title={`Tải lên tài liệu: ${uploadingItem?.documentTypeName ?? ''}`}
        open={Boolean(uploadingItem)}
        onCancel={() => setUploadingItem(null)}
        footer={null}
        destroyOnClose
      >
        <Form form={uploadForm} layout="vertical" onFinish={handleUploadSubmit} className="mt-4">
          <Form.Item
            name="fileId"
            label="Mã file lưu trữ (File ID)"
            initialValue="00000000-0000-0000-0000-000000000001"
            rules={[{ required: true, message: 'Vui lòng cung cấp file ID' }]}
          >
            <Input placeholder="Nhập UUID của file đã tải lên" />
          </Form.Item>

          <Form.Item name="issuer" label="Cơ quan / Đơn vị cấp">
            <Input placeholder="VD: Chi cục Chăn nuôi & Thú y, PVI Insurance..." />
          </Form.Item>

          <Flex gap={12}>
            <Form.Item name="sampledOn" label="Ngày lấy mẫu (nếu có)" className="flex-1">
              <Input type="date" />
            </Form.Item>
            <Form.Item name="issuedOn" label="Ngày cấp chứng nhận" className="flex-1">
              <Input type="date" />
            </Form.Item>
          </Flex>

          <Form.Item name="validUntil" label="Ngày hết hạn (nếu có)">
            <Input type="date" />
          </Form.Item>

          <Flex justify="end" gap={8} className="mt-6">
            <Button variant="secondary" onClick={() => setUploadingItem(null)}>
              Hủy
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={submittingUpload}
            >
              {submittingUpload ? 'Đang gửi...' : 'Tải lên phiên bản mới'}
            </Button>
          </Flex>
        </Form>
      </Modal>
    </Flex>
  );
};

export default DocumentsPage;
