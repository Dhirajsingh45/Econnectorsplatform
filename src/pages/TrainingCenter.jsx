import { useState, useEffect } from 'react';
import { 
  BookOpen, Award, CheckCircle2, Lock, Play, Shield, 
  HelpCircle, ChevronRight, ArrowLeft, RefreshCw, ExternalLink, 
  AlertTriangle, Sparkles, Check, X, Printer, Share2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { trainingService } from '../services/api';
import { useAppContext } from '../context/AppContext';
import './TrainingCenter.css';

export default function TrainingCenter() {
  const { currentUser, refreshCurrentUser } = useAppContext();
  const [modules, setModules] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('curriculum'); // 'curriculum' | 'certificates'

  // Active Learning / Quiz State
  const [activeModule, setActiveModule] = useState(null);
  const [currentLessonIdx, setCurrentLessonIdx] = useState(0);
  const [quizMode, setQuizMode] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);

  // Certificate Preview Modal
  const [viewCert, setViewCert] = useState(null);
  const [copiedCert, setCopiedCert] = useState(false);

  const fetchTrainingData = async () => {
    setLoading(true);
    try {
      const [modulesData, certsData] = await Promise.all([
        trainingService.getModules().catch(() => []),
        currentUser ? trainingService.getMyCertificates().catch(() => []) : Promise.resolve([])
      ]);
      setModules(Array.isArray(modulesData) ? modulesData : []);
      setCertificates(Array.isArray(certsData) ? certsData : []);
    } catch (err) {
      console.error('Failed to load training data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrainingData();
  }, [currentUser]);

  const openModule = async (moduleId) => {
    try {
      const fullModule = await trainingService.getModuleDetail(moduleId);
      setActiveModule(fullModule);
      setCurrentLessonIdx(0);
      setQuizMode(false);
      setSelectedAnswers({});
      setQuizResult(null);
    } catch (err) {
      alert('Unable to load module content: ' + err.message);
    }
  };

  const handleLessonComplete = async (lessonId) => {
    if (!currentUser) return;
    try {
      await trainingService.completeLesson(activeModule.id, lessonId);
    } catch (err) {
      console.error('Failed to save lesson progress:', err);
    }
  };

  const handleNextLesson = () => {
    const currentLesson = activeModule.lessons[currentLessonIdx];
    handleLessonComplete(currentLesson.id);

    if (currentLessonIdx + 1 < activeModule.lessons.length) {
      setCurrentLessonIdx(currentLessonIdx + 1);
    } else {
      setQuizMode(true);
    }
  };

  const handleSelectAnswer = (qId, optionIdx) => {
    if (quizResult) return; // Prevent changing after evaluation
    setSelectedAnswers(prev => ({ ...prev, [qId]: optionIdx }));
  };

  const handleSubmitQuiz = async () => {
    if (Object.keys(selectedAnswers).length < activeModule.quiz.length) {
      alert('Please answer all questions before submitting.');
      return;
    }

    setSubmittingQuiz(true);
    try {
      const result = await trainingService.submitQuiz(activeModule.id, selectedAnswers);
      setQuizResult(result);
      fetchTrainingData();
      if (refreshCurrentUser) refreshCurrentUser();
    } catch (err) {
      alert(err.message || 'Failed to grade quiz.');
    } finally {
      setSubmittingQuiz(false);
    }
  };

  const completedCount = modules.filter(m => m.isCompleted).length;
  const progressPercent = modules.length ? Math.round((completedCount / modules.length) * 100) : 0;

  return (
    <div className="training-academy-container animate-fade-in">
      {/* Header Banner */}
      <header className="training-hero glass-panel">
        <div className="training-hero-content">
          <div className="flex items-center gap-sm">
            <span className="badge badge-normal text-xs uppercase tracking-wider">Community Response Academy</span>
            <span className="verified-pill">EVIDENCE-BASED PROTOCOLS</span>
          </div>
          <h1 className="training-hero-title">FaunaNet Training Academy</h1>
          <p className="training-hero-subtitle">
            Equipping citizen responders, foster parents, and volunteers with humane rescue standards, 
            safety protocols, and animal handling fundamentals. Complete interactive scenarios and quizzes 
            to unlock platform capabilities and earn verified community badges.
          </p>

          <div className="training-stats-bar">
            <div className="training-stat-item">
              <span className="stat-num text-accent">{progressPercent}%</span>
              <span className="stat-desc">Curriculum Completed</span>
            </div>
            <div className="stat-separator" />
            <div className="training-stat-item">
              <span className="stat-num text-teal">{completedCount} / {modules.length}</span>
              <span className="stat-desc">Modules Certified</span>
            </div>
            <div className="stat-separator" />
            <div className="training-stat-item">
              <span className="stat-num text-green">{certificates.length}</span>
              <span className="stat-desc">Issued Records</span>
            </div>
          </div>
        </div>

        <div className="training-hero-actions">
          <div className="xp-badge-box glass-panel">
            <Award size={24} className="text-accent" />
            <div>
              <span className="xp-num">{currentUser?.trustScore || 0}</span>
              <span className="xp-lbl">Trust Score</span>
            </div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={fetchTrainingData} title="Sync Academy Records">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="training-tabs">
        <button 
          className={`training-tab-btn ${activeTab === 'curriculum' ? 'active' : ''}`}
          onClick={() => setActiveTab('curriculum')}
        >
          📚 Training Modules ({modules.length})
        </button>
        <button 
          className={`training-tab-btn ${activeTab === 'certificates' ? 'active' : ''}`}
          onClick={() => setActiveTab('certificates')}
        >
          🎖️ Completion Records & Badges ({certificates.length})
        </button>
      </div>

      {/* TAB 1: CURRICULUM GRID */}
      {activeTab === 'curriculum' && (
        <section className="modules-grid-section">
          {loading ? (
            <div className="training-loading glass-panel">
              <RefreshCw size={24} className="spin text-accent mb-sm" />
              <p>Loading interactive learning modules and safety curricula...</p>
            </div>
          ) : (
            <div className="modules-cards-grid">
              {modules.map((module, idx) => {
                const isLocked = idx > 0 && !modules[idx - 1].isCompleted && !module.isCompleted;

                return (
                  <div key={module.id} className={`module-card glass-panel ${module.isCompleted ? 'card-completed' : isLocked ? 'card-locked' : 'card-available'}`}>
                    <div className="module-card-header">
                      <span className={`cat-tag cat-${module.category}`}>{module.category?.toUpperCase()}</span>
                      <div className="flex items-center gap-xs">
                        {module.isCompleted ? (
                          <span className="cert-pill"><CheckCircle2 size={12} /> Certified</span>
                        ) : isLocked ? (
                          <span className="lock-pill"><Lock size={12} /> Locked</span>
                        ) : (
                          <span className="time-pill">{module.durationMinutes} min</span>
                        )}
                      </div>
                    </div>

                    <h3 className="module-title">{module.title}</h3>
                    <p className="module-desc">{module.description}</p>

                    <div className="module-specs">
                      <span>{module.lessonCount} Interactive Lessons</span>
                      <span>·</span>
                      <span>{module.questionCount} Scenario Questions</span>
                    </div>

                    <div className="module-badge-reward">
                      <Award size={14} className="text-accent mr-xs" />
                      <span>Earns: <strong>{module.badgeName}</strong></span>
                    </div>

                    <div className="module-action-area">
                      {isLocked ? (
                        <button className="btn btn-outline btn-sm w-full opacity-60" disabled>
                          <Lock size={14} /> Complete Prerequisite to Unlock
                        </button>
                      ) : (
                        <button 
                          className="btn btn-primary btn-sm w-full"
                          onClick={() => openModule(module.id)}
                        >
                          <Play size={14} /> {module.isCompleted ? 'Review Module & Quiz' : 'Start Learning'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* TAB 2: CERTIFICATES & COMPLETION RECORDS */}
      {activeTab === 'certificates' && (
        <section className="certificates-section">
          {certificates.length === 0 ? (
            <div className="cert-empty-card glass-panel text-center p-xl">
              <Award size={48} className="text-muted mx-auto mb-sm opacity-40" />
              <h3>No Completion Records Yet</h3>
              <p className="text-muted text-sm max-w-md mx-auto mb-md">
                Pass any course quiz with a 75% score or higher to earn an official FaunaNet Volunteer 
                Completion Record and digital profile badge.
              </p>
              <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('curriculum')}>
                Start First Course
              </button>
            </div>
          ) : (
            <div className="certs-grid">
              {certificates.map(cert => (
                <div key={cert._id} className="cert-card glass-panel">
                  <div className="cert-header">
                    <span className="cert-id-tag mono">{cert.certificateId}</span>
                    <span className="badge badge-low text-xs">Score: {cert.score}%</span>
                  </div>

                  <h3 className="cert-title">{cert.moduleTitle}</h3>
                  <p className="cert-user text-xs text-muted">Issued to: <strong>{cert.userName}</strong></p>
                  <p className="cert-date text-xs text-muted">Awarded: {new Date(cert.issuedAt).toLocaleDateString()}</p>

                  <div className="cert-badge-row">
                    <Award size={16} className="text-accent" />
                    <span className="text-xs font-bold text-accent">{cert.badgeAwarded}</span>
                  </div>

                  <p className="cert-disclaimer-snippet text-xs text-muted mt-sm">
                    {cert.disclaimer}
                  </p>

                  <button 
                    className="btn btn-outline btn-sm w-full mt-md"
                    onClick={() => setViewCert(cert)}
                  >
                    View Official Record
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* INTERACTIVE LEARNING & QUIZ MODAL */}
      {activeModule && (
        <div className="form-overlay" onClick={() => setActiveModule(null)}>
          <div className="form-container modal-wide modal-course" onClick={(e) => e.stopPropagation()}>
            <div className="course-header">
              <div>
                <div className="flex items-center gap-xs">
                  <span className="cat-tag text-xs">{activeModule.category?.toUpperCase()}</span>
                  <span className="text-xs text-muted">· {activeModule.difficulty}</span>
                </div>
                <h2 className="course-modal-title">{activeModule.title}</h2>
              </div>
              <button className="close-btn" onClick={() => setActiveModule(null)}>×</button>
            </div>

            {/* Content Area: Lesson vs Quiz */}
            <div className="course-body">
              {!quizMode ? (
                /* LESSON MODE */
                <div className="lesson-container animate-fade-in">
                  <div className="lesson-nav-bar">
                    <span className="lesson-stepper">
                      Lesson {currentLessonIdx + 1} of {activeModule.lessons.length}
                    </span>
                    <span className="lesson-topic">{activeModule.lessons[currentLessonIdx].title}</span>
                  </div>

                  <div className="lesson-text-content">
                    <p>{activeModule.lessons[currentLessonIdx].content}</p>
                  </div>

                  {activeModule.lessons[currentLessonIdx].safetyNote && (
                    <div className="safety-alert-box">
                      <Shield size={18} className="text-accent flex-shrink-0" />
                      <div>
                        <strong>Mandatory Safety Protocol:</strong>
                        <p className="text-xs mt-xs">{activeModule.lessons[currentLessonIdx].safetyNote}</p>
                      </div>
                    </div>
                  )}

                  <div className="lesson-footer flex justify-between mt-lg">
                    {currentLessonIdx > 0 ? (
                      <button 
                        className="btn btn-outline btn-sm"
                        onClick={() => setCurrentLessonIdx(currentLessonIdx - 1)}
                      >
                        Previous Lesson
                      </button>
                    ) : <div />}

                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={handleNextLesson}
                    >
                      {currentLessonIdx + 1 < activeModule.lessons.length ? 'Next Lesson →' : 'Proceed to Quiz →'}
                    </button>
                  </div>
                </div>
              ) : (
                /* QUIZ MODE */
                <div className="quiz-container animate-fade-in">
                  <div className="quiz-banner">
                    <h3>Scenario Knowledge Check</h3>
                    <p className="text-xs text-muted">Pass score: 75%. Answer all scenarios based on humane safety protocols.</p>
                  </div>

                  <div className="questions-list">
                    {activeModule.quiz.map((q, qIdx) => {
                      const qResult = quizResult?.questionResults?.find(r => r.questionId === q.id);

                      return (
                        <div key={q.id} className="question-card glass-panel">
                          <h4 className="question-text">
                            {qIdx + 1}. {q.question}
                          </h4>

                          <div className="options-group">
                            {q.options.map((opt, optIdx) => {
                              const isSelected = selectedAnswers[q.id] === optIdx;
                              let optClass = '';
                              if (quizResult) {
                                if (optIdx === q.correctAnswer) optClass = 'opt-correct';
                                else if (isSelected && !qResult?.isCorrect) optClass = 'opt-wrong';
                              } else if (isSelected) {
                                optClass = 'opt-selected';
                              }

                              return (
                                <button 
                                  key={optIdx}
                                  type="button"
                                  className={`option-btn ${optClass}`}
                                  onClick={() => handleSelectAnswer(q.id, optIdx)}
                                  disabled={!!quizResult}
                                >
                                  <span className="opt-letter">{String.fromCharCode(65 + optIdx)}</span>
                                  <span className="opt-label">{opt}</span>
                                  {quizResult && optIdx === q.correctAnswer && <Check size={16} className="text-green ml-auto" />}
                                  {quizResult && isSelected && !qResult?.isCorrect && <X size={16} className="text-danger ml-auto" />}
                                </button>
                              );
                            })}
                          </div>

                          {qResult && (
                            <div className={`explanation-box ${qResult.isCorrect ? 'bg-green-soft' : 'bg-red-soft'}`}>
                              <strong>Explanation:</strong> {qResult.explanation}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Quiz Results Summary & Platform CTA */}
                  {quizResult ? (
                    <div className={`quiz-score-summary glass-panel ${quizResult.passed ? 'border-passed' : 'border-failed'}`}>
                      <div className="flex items-center gap-md">
                        {quizResult.passed ? (
                          <div className="cert-burst-icon">🎉</div>
                        ) : (
                          <div className="fail-icon">⚠️</div>
                        )}
                        <div>
                          <h3>{quizResult.passed ? 'Module Passed & Certified!' : 'Score Under 75% Threshold'}</h3>
                          <p className="text-xs text-muted">
                            You scored {quizResult.score}% ({quizResult.correctCount} of {quizResult.totalQuestions} scenarios correct).
                          </p>
                        </div>
                      </div>

                      {quizResult.passed && (
                        <div className="real-action-box mt-md">
                          <p className="text-xs font-bold text-accent uppercase tracking-wider mb-xs">
                            Apply Your Skills in Real Welfare Scenarios:
                          </p>
                          <Link 
                            to={quizResult.realActionTarget || '/app/tasks'} 
                            className="btn btn-primary btn-sm"
                            onClick={() => setActiveModule(null)}
                          >
                            <ExternalLink size={14} /> {quizResult.realActionLabel || 'Proceed to Platform'}
                          </Link>
                        </div>
                      )}

                      {!quizResult.passed && (
                        <button 
                          className="btn btn-outline btn-sm mt-md"
                          onClick={() => {
                            setQuizResult(null);
                            setSelectedAnswers({});
                          }}
                        >
                          Retry Knowledge Check
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex justify-end gap-sm mt-lg">
                      <button 
                        type="button" 
                        className="btn btn-outline btn-sm"
                        onClick={() => setQuizMode(false)}
                      >
                        Review Lessons
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-primary btn-sm"
                        onClick={handleSubmitQuiz}
                        disabled={submittingQuiz}
                      >
                        {submittingQuiz ? 'Grading Responses...' : 'Submit Answers for Certification'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* OFFICIAL VERIFIABLE RECORD MODAL */}
      {viewCert && (
        <div className="form-overlay" onClick={() => setViewCert(null)}>
          <div className="form-container cert-modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="cert-frame">
              <div className="cert-inner-border">
                <div className="cert-top-seal">
                  <Shield size={32} className="text-accent" />
                  <span className="seal-text">FAUNANET ACADEMY CERTIFIED</span>
                </div>

                <h1 className="cert-main-heading">Record of Completion</h1>
                <p className="cert-presented">This document records that</p>
                <h2 className="cert-recipient-name">{viewCert.userName}</h2>
                <p className="cert-has-completed">has successfully completed the instructional module and safety evaluation for</p>
                <h3 className="cert-course-name">{viewCert.moduleTitle}</h3>

                <div className="cert-meta-grid">
                  <div>
                    <label>EVALUATION SCORE</label>
                    <span>{viewCert.score}%</span>
                  </div>
                  <div>
                    <label>VERIFIABLE RECORD ID</label>
                    <span className="mono">{viewCert.certificateId}</span>
                  </div>
                  <div>
                    <label>DATE ISSUED</label>
                    <span>{new Date(viewCert.issuedAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* QR Code and Verification Row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(0,0,0,0.25)', borderRadius: '10px', padding: '0.75rem 1rem', margin: '1rem 0', textAlign: 'left' }}>
                  <div style={{ background: '#fff', borderRadius: '8px', padding: '4px', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <QRCodeSVG 
                      value={`${typeof window !== 'undefined' ? window.location.origin : ''}/certificate/${viewCert.certificateId}`} 
                      size={75} 
                      level="H" 
                    />
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#A0AEC0' }}>
                    <div style={{ color: '#F7FAFC', fontWeight: 600, marginBottom: '2px' }}>
                      Cryptographically Verifiable Credential
                    </div>
                    <div>Scan with any smartphone or share link to verify authenticity on the FaunaNet Academy ledger.</div>
                  </div>
                </div>

                <footer className="cert-disclaimer-box">
                  <p>{viewCert.disclaimer}</p>
                </footer>

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '1.25rem', flexWrap: 'wrap' }}>
                  <button 
                    type="button"
                    className="btn btn-outline btn-sm" 
                    onClick={() => {
                      const url = `${window.location.origin}/certificate/${viewCert.certificateId}`;
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(url);
                        setCopiedCert(true);
                        setTimeout(() => setCopiedCert(false), 2000);
                      }
                    }}
                  >
                    <Share2 size={14} /> {copiedCert ? 'Copied Link!' : 'Share Link'}
                  </button>
                  <button 
                    type="button"
                    className="btn btn-outline btn-sm" 
                    onClick={() => window.print()}
                  >
                    <Printer size={14} /> Print Certificate
                  </button>
                  <a 
                    href={`/certificate/${viewCert.certificateId}`} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="btn btn-primary btn-sm flex items-center gap-xs"
                  >
                    <ExternalLink size={14} /> Public View
                  </a>
                  <button 
                    type="button"
                    className="btn btn-ghost btn-sm" 
                    onClick={() => setViewCert(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
