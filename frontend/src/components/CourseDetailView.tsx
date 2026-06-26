import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, CheckCircle, Circle, Lock,
  Loader2, Download, Award,
} from 'lucide-react';
import { learningApi, type EnrollmentDetail, type CourseModule } from '../services/api';
import { QuizPlayer } from './QuizPlayer';
import { LeaderboardPanel } from './LeaderboardPanel';
import { VideoEmbedPlayer } from './VideoEmbedPlayer';

interface CourseDetailViewProps {
  enrollmentId: number;
  onBack: () => void;
}

const HEARTBEAT_INTERVAL_MS = 15_000;
const WATCH_THRESHOLD = 0.8;

export const CourseDetailView: React.FC<CourseDetailViewProps> = ({ enrollmentId, onBack }) => {
  const [enrollment, setEnrollment] = useState<EnrollmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeModuleId, setActiveModuleId] = useState<number | null>(null);
  const [downloadingCertificateNumber, setDownloadingCertificateNumber] = useState<string | null>(null);
  const [watchedRatio, setWatchedRatio] = useState(0);
  const timeSpentAccumulator = useRef(0);
  const totalTimeSpentSeconds = useRef(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleDownloadCertificate = async (certificateNumber: string) => {
    setDownloadingCertificateNumber(certificateNumber);
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
      setDownloadingCertificateNumber(null);
    }
  };

  const loadEnrollment = () => {
    setLoading(true);
    learningApi.getEnrollment(enrollmentId)
      .then(res => {
        if (res.data) {
          setEnrollment(res.data.enrollment);
          if (!activeModuleId && res.data.enrollment.course.modules.length > 0) {
            const firstIncomplete = res.data.enrollment.course.modules.find(m => {
              const p = res.data!.enrollment.moduleProgress.find(mp => mp.moduleId === m.id);
              return !p || p.status !== 'COMPLETED';
            });
            setActiveModuleId((firstIncomplete || res.data.enrollment.course.modules[0]).id);
          }
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadEnrollment(); }, [enrollmentId]);

  const activeModule = enrollment?.course.modules.find(m => m.id === activeModuleId) || null;
  const progressFor = (moduleId: number) => enrollment?.moduleProgress.find(p => p.moduleId === moduleId);
  const courseCertificate = enrollment?.certificates.find(c => c.moduleId === null) ?? null;
  const certificateForModule = (moduleId: number) => enrollment?.certificates.find(c => c.moduleId === moduleId) ?? null;

  const sendHeartbeat = async (positionSeconds?: number, pageViewed?: number, markComplete = false) => {
    if (!activeModule) return;
    const delta = timeSpentAccumulator.current;
    timeSpentAccumulator.current = 0;
    try {
      await learningApi.postProgress(enrollmentId, {
        moduleId: activeModule.id,
        lastPositionSeconds: positionSeconds,
        lastPageViewed: pageViewed,
        timeSpentDeltaSeconds: delta,
        markComplete,
      });
      if (markComplete) loadEnrollment();
    } catch {
      // non-critical, will retry on next heartbeat
    }
  };

  // Reset watch tracking when switching modules; seed elapsed time from prior progress (documents resume their ratio)
  useEffect(() => {
    if (!activeModule) return;
    const progress = progressFor(activeModule.id);
    totalTimeSpentSeconds.current = progress?.timeSpentSeconds ?? 0;
    if (activeModule.contentType === 'DOCUMENT') {
      const targetSeconds = (activeModule.durationMinutes ?? 0) * 60;
      setWatchedRatio(targetSeconds > 0 ? Math.min(1, totalTimeSpentSeconds.current / targetSeconds) : 1);
    } else {
      setWatchedRatio(0);
    }
  }, [activeModule?.id]);

  // Heartbeat timer for video and document modules
  useEffect(() => {
    if (!activeModule || activeModule.contentType === 'QUIZ') return;
    const interval = setInterval(() => {
      timeSpentAccumulator.current += HEARTBEAT_INTERVAL_MS / 1000;
      totalTimeSpentSeconds.current += HEARTBEAT_INTERVAL_MS / 1000;
      if (activeModule.contentType === 'DOCUMENT') {
        const targetSeconds = (activeModule.durationMinutes ?? 0) * 60;
        setWatchedRatio(targetSeconds > 0 ? Math.min(1, totalTimeSpentSeconds.current / targetSeconds) : 1);
        sendHeartbeat();
      } else if (activeModule.contentType === 'VIDEO_FILE') {
        const position = videoRef.current?.currentTime;
        sendHeartbeat(position ? Math.floor(position) : undefined);
      }
      // VIDEO_EMBED progress/heartbeat is driven by VideoEmbedPlayer's onProgress callback instead
    }, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [activeModule?.id]);

  // Resume video position once loaded
  const handleVideoLoaded = () => {
    const progress = activeModule && progressFor(activeModule.id);
    if (progress?.lastPositionSeconds && videoRef.current) {
      videoRef.current.currentTime = progress.lastPositionSeconds;
    }
  };

  const handleVideoTimeUpdate = () => {
    const video = videoRef.current;
    if (video && video.duration > 0) {
      setWatchedRatio(Math.min(1, video.currentTime / video.duration));
    }
  };

  const lastEmbedHeartbeatAt = useRef(0);
  const handleEmbedProgress = (ratio: number, currentTimeSeconds: number) => {
    setWatchedRatio(Math.min(1, ratio));
    const now = Date.now();
    if (now - lastEmbedHeartbeatAt.current >= HEARTBEAT_INTERVAL_MS) {
      lastEmbedHeartbeatAt.current = now;
      timeSpentAccumulator.current += HEARTBEAT_INTERVAL_MS / 1000;
      sendHeartbeat(Math.floor(currentTimeSeconds));
    }
  };

  const handleMarkModuleComplete = () => {
    if (watchedRatio < WATCH_THRESHOLD) return;
    sendHeartbeat(videoRef.current?.currentTime ? Math.floor(videoRef.current.currentTime) : undefined, undefined, true);
  };

  const renderModuleIcon = (module: CourseModule) => {
    const progress = progressFor(module.id);
    if (progress?.status === 'COMPLETED') return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    if (enrollment?.course.navigationMode === 'SEQUENTIAL') {
      const idx = enrollment.course.modules.findIndex(m => m.id === module.id);
      const priorIncomplete = enrollment.course.modules.slice(0, idx).some(m => {
        const p = progressFor(m.id);
        return !p || p.status !== 'COMPLETED';
      });
      if (priorIncomplete) return <Lock className="w-4 h-4 text-slate-300" />;
    }
    return <Circle className="w-4 h-4 text-slate-300" />;
  };

  const isModuleLocked = (module: CourseModule): boolean => {
    if (enrollment?.course.navigationMode !== 'SEQUENTIAL') return false;
    const idx = enrollment.course.modules.findIndex(m => m.id === module.id);
    return enrollment.course.modules.slice(0, idx).some(m => {
      const p = progressFor(m.id);
      return !p || p.status !== 'COMPLETED';
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-[#f46617] animate-spin" />
      </div>
    );
  }

  if (!enrollment) return null;

  const { course } = enrollment;

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Catalog
      </button>

      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">{course.title}</h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-0.5">
            {enrollment.status === 'COMPLETED' ? 'Completed' : enrollment.status === 'IN_PROGRESS' ? 'In Progress' : 'Not Started'}
          </p>
        </div>
        {courseCertificate && (
          <button
            onClick={() => handleDownloadCertificate(courseCertificate.certificateNumber)}
            disabled={downloadingCertificateNumber === courseCertificate.certificateNumber}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-60 text-emerald-600 text-xs font-bold rounded-2xl border border-emerald-100 transition-colors"
          >
            {downloadingCertificateNumber === courseCertificate.certificateNumber ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Download Certificate
          </button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-5">
        {/* Module list */}
        <div className="lg:w-[30%] space-y-2 order-2 lg:order-1">
          {course.modules.map((module, i) => {
            const locked = isModuleLocked(module);
            return (
              <button
                key={module.id}
                disabled={locked}
                onClick={() => setActiveModuleId(module.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border text-left transition-all ${
                  activeModuleId === module.id
                    ? 'bg-orange-50 border-orange-200'
                    : locked
                      ? 'bg-slate-50 border-slate-100 cursor-not-allowed opacity-60'
                      : 'bg-white border-orange-100/50 hover:border-orange-200'
                }`}
              >
                <span className="text-xs font-bold text-slate-400 w-4">{i + 1}</span>
                {renderModuleIcon(module)}
                <span className="flex-1 text-sm font-semibold text-slate-700 truncate">{module.title}</span>
              </button>
            );
          })}

          {course.enableRanking && <LeaderboardPanel courseId={course.id} />}
        </div>

        {/* Content viewer */}
        <div className="lg:w-[70%] order-1 lg:order-2">
          {activeModule && (
            <div className="bg-white rounded-[24px] border border-orange-100/50 shadow-sm p-5 space-y-4">
              <h3 className="text-base font-bold text-slate-800">{activeModule.title}</h3>

              {(activeModule.contentType === 'VIDEO_FILE' || activeModule.contentType === 'VIDEO_EMBED') && (
                <div className="aspect-video rounded-2xl overflow-hidden bg-slate-900">
                  {activeModule.contentType === 'VIDEO_FILE' ? (
                    <video
                      ref={videoRef}
                      src={activeModule.contentUrl || undefined}
                      controls
                      onLoadedMetadata={handleVideoLoaded}
                      onTimeUpdate={handleVideoTimeUpdate}
                      className="w-full h-full"
                    />
                  ) : activeModule.contentUrl ? (
                    <VideoEmbedPlayer
                      url={activeModule.contentUrl}
                      initialPositionSeconds={progressFor(activeModule.id)?.lastPositionSeconds}
                      onProgress={handleEmbedProgress}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-sm">Unable to load video</div>
                  )}
                </div>
              )}

              {activeModule.contentType === 'DOCUMENT' && activeModule.contentUrl && (
                <div className="rounded-2xl overflow-hidden border border-slate-100" style={{ height: '60vh' }}>
                  <iframe src={activeModule.contentUrl} className="w-full h-full" title={activeModule.title} />
                </div>
              )}

              {activeModule.contentType === 'QUIZ' && activeModule.quiz && (
                <QuizPlayer
                  enrollmentId={enrollmentId}
                  quiz={activeModule.quiz}
                  onPassed={loadEnrollment}
                />
              )}

              {activeModule.contentType !== 'QUIZ' && progressFor(activeModule.id)?.status !== 'COMPLETED' && (
                <div className="space-y-2">
                  {watchedRatio < WATCH_THRESHOLD && (
                    <>
                      <div className="w-full h-1.5 bg-orange-50 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#f46617] rounded-full transition-all duration-500"
                          style={{ width: `${Math.round(watchedRatio * 100)}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-slate-400 font-semibold">
                        {activeModule.contentType === 'DOCUMENT' ? 'Spend' : 'Watch'} {Math.round(WATCH_THRESHOLD * 100)}% to unlock — {Math.round(watchedRatio * 100)}% so far
                      </p>
                    </>
                  )}
                  <button
                    onClick={handleMarkModuleComplete}
                    disabled={watchedRatio < WATCH_THRESHOLD}
                    title={watchedRatio < WATCH_THRESHOLD ? `Watch ${Math.round(WATCH_THRESHOLD * 100)}% to unlock` : undefined}
                    className="btn-orange px-4 py-2.5 text-xs font-bold rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <CheckCircle className="w-4 h-4" /> Mark as Complete
                  </button>
                </div>
              )}

              {progressFor(activeModule.id)?.status === 'COMPLETED' && certificateForModule(activeModule.id) && (
                <button
                  onClick={() => handleDownloadCertificate(certificateForModule(activeModule.id)!.certificateNumber)}
                  disabled={downloadingCertificateNumber === certificateForModule(activeModule.id)!.certificateNumber}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-60 text-emerald-600 text-xs font-bold rounded-2xl border border-emerald-100 transition-colors"
                >
                  {downloadingCertificateNumber === certificateForModule(activeModule.id)!.certificateNumber
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Award className="w-4 h-4" />}
                  Download Module Certificate
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
