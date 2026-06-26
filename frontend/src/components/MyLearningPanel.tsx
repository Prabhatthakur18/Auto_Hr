import React, { useEffect, useState } from 'react';
import { GraduationCap, Loader2, Clock, CheckCircle, PlayCircle, Lock, Download, AlertTriangle, RotateCcw, Check, X, Hourglass } from 'lucide-react';
import { learningApi, type Enrollment } from '../services/api';
import { CourseDetailView } from './CourseDetailView';
import { matchesDateFilter, matchesSearch, type PageFilterState } from '../utils/pageFilters';

const STATUS_BADGE: Record<string, string> = {
  COMPLETED: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
  IN_PROGRESS: 'bg-orange-50 text-[#f46617] border border-orange-100',
  NOT_STARTED: 'bg-slate-50 text-slate-500 border border-slate-100',
  FAILED: 'bg-red-50 text-red-500 border border-red-100',
  NOMINATED: 'bg-blue-50 text-blue-600 border border-blue-100',
  PENDING_APPROVAL: 'bg-amber-50 text-amber-600 border border-amber-100',
  REJECTED: 'bg-slate-50 text-slate-400 border border-slate-100',
};

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const isOverdue = (enrollment: Enrollment) =>
  !!enrollment.dueDate && enrollment.status !== 'COMPLETED' && new Date(enrollment.dueDate) < new Date();

const isCertificateExpired = (enrollment: Enrollment) =>
  !!enrollment.certificate?.expiresAt && new Date(enrollment.certificate.expiresAt) < new Date();

export const MyLearningPanel: React.FC<{ filters?: PageFilterState }> = ({ filters }) => {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeEnrollmentId, setActiveEnrollmentId] = useState<number | null>(null);
  const [downloadingCert, setDownloadingCert] = useState<string | null>(null);
  const [renewingId, setRenewingId] = useState<number | null>(null);
  const [respondingId, setRespondingId] = useState<number | null>(null);

  const loadAll = () => {
    setLoading(true);
    learningApi.getMyEnrollments()
      .then(res => { if (res.data) setEnrollments(res.data.enrollments); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadAll(); }, []);

  const handleDownloadCertificate = async (certificateNumber: string) => {
    setDownloadingCert(certificateNumber);
    try {
      const res = await learningApi.downloadCertificate(certificateNumber);
      if (res.data?.pdfBase64) {
        const link = document.createElement('a');
        link.href = res.data.pdfBase64;
        link.download = `${certificateNumber}.pdf`;
        link.click();
      }
    } catch {
      // non-critical
    } finally {
      setDownloadingCert(null);
    }
  };

  const handleRenew = async (enrollmentId: number) => {
    setRenewingId(enrollmentId);
    try {
      await learningApi.renewEnrollment(enrollmentId);
      loadAll();
    } catch {
      // non-critical
    } finally {
      setRenewingId(null);
    }
  };

  const handleRespond = async (enrollmentId: number, accept: boolean) => {
    setRespondingId(enrollmentId);
    try {
      if (accept) await learningApi.acceptCourseNomination(enrollmentId);
      else await learningApi.declineCourseNomination(enrollmentId);
      loadAll();
    } catch {
      // non-critical
    } finally {
      setRespondingId(null);
    }
  };

  if (activeEnrollmentId) {
    return (
      <CourseDetailView
        enrollmentId={activeEnrollmentId}
        onBack={() => { setActiveEnrollmentId(null); loadAll(); }}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-[#f46617] animate-spin" />
      </div>
    );
  }

  const filteredEnrollments = filters
    ? enrollments.filter(enrollment =>
        matchesSearch(filters.search, [
          enrollment.course?.title,
          enrollment.course?.description,
          enrollment.course?.category,
          enrollment.course?.skillTags,
          enrollment.course?.language,
          enrollment.status,
          enrollment.course?.targetDepartment,
          enrollment.certificate?.certificateNumber,
        ]) && matchesDateFilter(filters, [
          enrollment.createdAt,
          enrollment.dueDate,
          enrollment.startedAt,
          enrollment.completedAt,
          enrollment.certificate?.expiresAt,
        ])
      )
    : enrollments;
  const mandatory = filteredEnrollments.filter(e => e.course?.mandatory);
  const optional = filteredEnrollments.filter(e => !e.course?.mandatory);

  const renderRow = (enrollment: Enrollment) => {
    const overdue = isOverdue(enrollment);
    const certExpired = isCertificateExpired(enrollment);
    return (
      <div
        key={enrollment.id}
        className="bg-white rounded-[24px] border border-orange-100/50 shadow-sm hover:shadow-md transition-all p-5 flex items-center gap-4"
      >
        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
          <GraduationCap className="w-5 h-5 text-[#f46617]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-bold text-slate-800 truncate">{enrollment.course?.title}</h3>
            <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_BADGE[enrollment.status]}`}>
              {enrollment.status.replace('_', ' ')}
            </span>
            {overdue && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-50 text-red-500 border border-red-100 flex-shrink-0">
                <AlertTriangle className="w-2.5 h-2.5" /> Overdue
              </span>
            )}
            {certExpired && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100 flex-shrink-0">
                <AlertTriangle className="w-2.5 h-2.5" /> Certificate Expired
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-400 font-semibold">
            {enrollment.course?.durationMinutes && (
              <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> {enrollment.course.durationMinutes} min</span>
            )}
            {enrollment.dueDate && (
              <span className={overdue ? 'text-red-500' : ''}>Due {fmtDate(enrollment.dueDate)}</span>
            )}
            {enrollment.certificate?.expiresAt && (
              <span className={certExpired ? 'text-amber-600' : ''}>Certificate {certExpired ? 'expired' : 'expires'} {fmtDate(enrollment.certificate.expiresAt)}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {enrollment.certificate && (
            <button
              onClick={() => handleDownloadCertificate(enrollment.certificate!.certificateNumber)}
              disabled={downloadingCert === enrollment.certificate.certificateNumber}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-60 text-emerald-600 text-xs font-bold rounded-xl border border-emerald-100 transition-colors"
            >
              {downloadingCert === enrollment.certificate.certificateNumber ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            </button>
          )}
          {certExpired && (
            <button
              onClick={() => handleRenew(enrollment.id)}
              disabled={renewingId === enrollment.id}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 disabled:opacity-60 text-amber-600 text-xs font-bold rounded-xl border border-amber-100 transition-colors"
            >
              {renewingId === enrollment.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
              Renew
            </button>
          )}
          {enrollment.status === 'NOMINATED' ? (
            <>
              <button
                onClick={() => handleRespond(enrollment.id, true)}
                disabled={respondingId === enrollment.id}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-60 text-emerald-600 text-xs font-bold rounded-xl border border-emerald-100 transition-colors"
              >
                {respondingId === enrollment.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Accept
              </button>
              <button
                onClick={() => handleRespond(enrollment.id, false)}
                disabled={respondingId === enrollment.id}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 disabled:opacity-60 text-slate-500 text-xs font-bold rounded-xl border border-slate-200 transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Decline
              </button>
            </>
          ) : enrollment.status === 'PENDING_APPROVAL' ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
              <Hourglass className="w-3.5 h-3.5" /> Awaiting Approval
            </span>
          ) : enrollment.status === 'REJECTED' ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-slate-50 text-slate-400 border border-slate-200">
              <X className="w-3.5 h-3.5" /> Not Approved
            </span>
          ) : (
            <button
              onClick={() => setActiveEnrollmentId(enrollment.id)}
              className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl justify-center transition-colors ${
                enrollment.status === 'COMPLETED'
                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-100'
                  : 'bg-orange-50 hover:bg-orange-100 text-[#f46617] border border-orange-100'
              }`}
            >
              {enrollment.status === 'COMPLETED' ? <CheckCircle className="w-3.5 h-3.5" /> : <PlayCircle className="w-3.5 h-3.5" />}
              {enrollment.status === 'COMPLETED' ? 'Review' : enrollment.status === 'IN_PROGRESS' ? 'Continue' : 'Start'}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Your assigned and enrolled courses</p>

      {enrollments.length === 0 ? (
        <div className="text-center py-16 text-slate-400 bg-white rounded-3xl border border-orange-100/50 shadow-card">
          <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-50 text-slate-400" />
          <p className="font-semibold">No courses yet</p>
          <p className="text-xs mt-1">Browse the catalog to enroll, or wait for one to be assigned to you.</p>
        </div>
      ) : filteredEnrollments.length === 0 ? (
        <div className="text-center py-16 text-slate-400 bg-white rounded-3xl border border-orange-100/50 shadow-card">
          <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-50 text-slate-400" />
          <p className="font-semibold">No learning records match the filters</p>
        </div>
      ) : (
        <>
          {mandatory.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Mandatory
              </h3>
              <div className="space-y-3">{mandatory.map(renderRow)}</div>
            </div>
          )}
          {optional.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Optional</h3>
              <div className="space-y-3">{optional.map(renderRow)}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
