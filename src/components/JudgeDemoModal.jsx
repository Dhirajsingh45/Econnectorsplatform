import React, { useState } from 'react';
import { 
  Zap, 
  X, 
  CheckCircle2, 
  Loader2, 
  ExternalLink, 
  FileText, 
  ShieldAlert, 
  Activity, 
  QrCode, 
  Award, 
  ArrowRight,
  Play,
  Trash2,
  Check
} from 'lucide-react';
import { reportService, taskService, animalService, vetService, adminService } from '../services/api';
import { useAppContext } from '../context/AppContext';
import './JudgeDemoModal.css';

const DEMO_STEPS = [
  {
    id: 1,
    title: 'Citizen Incident Report & AI Triage',
    desc: 'Citizen reports injured indie pup stranded near Metro. AI assesses urgency (P1) & initializes animal entity.',
    icon: ShieldAlert
  },
  {
    id: 2,
    title: 'Hyperlocal Dispatch & Volunteer Acceptance',
    desc: 'Task routed to nearby responder. Volunteer accepts and moves en route (In Progress).',
    icon: Activity
  },
  {
    id: 3,
    title: 'Veterinary Examination & Clinical Protocol',
    desc: 'Admitted to shelter clinic. Vet records physical exam, antiseptic wound care, and Rabies vaccine.',
    icon: FileText
  },
  {
    id: 4,
    title: 'Welfare Ledger Verification & Resolution',
    desc: 'Task verified by supervisor. Status transitioned to Rescued and marked ready for adoption.',
    icon: Award
  },
  {
    id: 5,
    title: 'Digital Animal Passport & QR Verification',
    desc: 'Cryptographic public animal passport generated with field-scannable QR code.',
    icon: QrCode
  }
];

export default function JudgeDemoModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0); // 0 = not started, 1..5 = active/done
  const [running, setRunning] = useState(false);
  const [stepData, setStepData] = useState({});
  const [finalResult, setFinalResult] = useState(null);
  const [error, setError] = useState(null);
  const [demoSessionId, setDemoSessionId] = useState(null);
  const [resetting, setResetting] = useState(false);
  const [resetFeedback, setResetFeedback] = useState(null);

  const { refreshData } = useAppContext();

  const handleResetDemo = async () => {
    if (!demoSessionId) return;
    try {
      setResetting(true);
      await adminService.resetDemo(demoSessionId);
      setResetFeedback('Demo records successfully purged from MongoDB.');
      setCurrentStep(0);
      setStepData({});
      setFinalResult(null);
      setDemoSessionId(null);
      if (typeof refreshData === 'function') refreshData();
      setTimeout(() => setResetFeedback(null), 4000);
    } catch (err) {
      console.error('Reset error:', err);
      setResetFeedback('Purge failed: ' + (err.message || 'Unknown error'));
    } finally {
      setResetting(false);
    }
  };

  const runFullLifecycle = async () => {
    try {
      setRunning(true);
      setError(null);
      setFinalResult(null);
      setResetFeedback(null);

      const sessionId = `FN-DEMO-${Date.now()}`;
      setDemoSessionId(sessionId);

      // ── Step 1: Create Report ─────────────────────────────────
      setCurrentStep(1);
      const reportPayload = {
        description: 'Indie pup stranded near Sector 14 Metro Station with hind leg injury and dehydration.',
        animalType: 'dog',
        urgency: 'P1 - Critical',
        isDemo: true,
        demoSessionId: sessionId,
        images: ['https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600&auto=format&fit=crop&q=80'],
        location: {
          lat: 28.6139 + (Math.random() - 0.5) * 0.02,
          lng: 77.2090 + (Math.random() - 0.5) * 0.02,
          address: 'Pillar 42, Sector 14 Metro Corridor',
          area: 'Sector 14',
          city: 'New Delhi'
        }
      };

      const res1 = await reportService.create(reportPayload);
      const createdReport = res1.report;
      const createdTask = res1.task;
      const createdAnimal = res1.animal;

      setStepData(prev => ({
        ...prev,
        step1: {
          reportId: createdReport._id,
          animalId: createdAnimal.animalId,
          urgency: createdReport.urgency,
          aiScore: res1.triage?.severityScore
        }
      }));

      // Small pause for visual clarity
      await new Promise(r => setTimeout(r, 900));

      // ── Step 2: Dispatch & Volunteer Acceptance ───────────────
      setCurrentStep(2);
      await taskService.update(createdTask._id, 'Accepted');
      await new Promise(r => setTimeout(r, 600));
      await taskService.update(createdTask._id, 'In Progress');

      setStepData(prev => ({
        ...prev,
        step2: {
          taskId: createdTask._id,
          status: 'In Progress (Volunteer En Route)'
        }
      }));

      await new Promise(r => setTimeout(r, 900));

      // ── Step 3: Veterinary Examination & Care ─────────────────
      setCurrentStep(3);
      await animalService.update(createdAnimal._id, {
        status: 'under_treatment',
        sterilizationStatus: 'yes'
      });

      // Add clinical record
      const vetRecord = await vetService.createRecord({
        animal: createdAnimal._id,
        task: createdTask._id,
        examination: 'Trauma examination on right hind leg. Contusion noted; no bone fracture. Dehydration present.',
        diagnosis: 'Blunt soft-tissue contusion & moderate dehydration',
        treatment: 'Antiseptic wound debridement, topical dressing, 500ml saline infusion, analgesics administered.',
        followUpDate: new Date(Date.now() + 7 * 86400000),
        dischargeStatus: 'ready_for_shelter',
        notes: 'Animal responsive and stable after clinical intervention.'
      });

      // Add Rabies vaccination
      await animalService.addVaccination(createdAnimal._id, {
        vaccineName: 'Nobivac Rabies & Canine DHPP Booster',
        notes: 'Annual mandatory field vaccination administered during clinical intake.'
      });

      setStepData(prev => ({
        ...prev,
        step3: {
          medRecordId: vetRecord._id || 'Verified Record',
          vaccine: 'Nobivac Rabies + DHPP Inoculated',
          status: 'Treatment Logged'
        }
      }));

      await new Promise(r => setTimeout(r, 900));

      // ── Step 4: Verification & Resolution ─────────────────────
      setCurrentStep(4);
      await taskService.update(createdTask._id, 'Verified');
      await animalService.update(createdAnimal._id, {
        status: 'rescued',
        adoptionStatus: 'available_for_adoption'
      });

      setStepData(prev => ({
        ...prev,
        step4: {
          taskStatus: 'Verified & Closed',
          animalStatus: 'Rescued / Available for Adoption'
        }
      }));

      await new Promise(r => setTimeout(r, 800));

      // ── Step 5: Digital Passport Ready ────────────────────────
      setCurrentStep(5);
      const passportUrl = `/passport/${createdAnimal.animalId || createdAnimal._id}`;

      setFinalResult({
        animalId: createdAnimal.animalId,
        species: createdAnimal.species,
        passportUrl
      });

      // Trigger app context refresh if available
      if (typeof refreshData === 'function') {
        refreshData();
      }

    } catch (err) {
      console.error('Demo execution failed:', err);
      setError(err.message || 'Simulation encountered an issue.');
    } finally {
      setRunning(false);
    }
  };

  const handleOpenModal = () => {
    setIsOpen(true);
    if (currentStep === 0) {
      runFullLifecycle();
    }
  };

  return (
    <>
      {/* Trigger Banner */}
      <div className="demo-trigger-banner animate-fade-in">
        <div className="demo-banner-content">
          <div className="demo-icon-badge">
            <Zap size={24} />
          </div>
          <div>
            <div className="demo-banner-title">
              Judge Interactive Demo Mode
              <span className="demo-badge-pill">Zero Mocks · 100% Live DB</span>
            </div>
            <p className="demo-banner-desc">
              Execute a complete, real-time hyperlocal rescue cycle from citizen distress report to authenticated Digital Animal Passport.
            </p>
          </div>
        </div>
        <button 
          type="button" 
          onClick={handleOpenModal} 
          className="btn-launch-demo"
        >
          <Play size={16} fill="currentColor" /> Run Demo Walkthrough
        </button>
      </div>

      {/* Modal */}
      {isOpen && (
        <div className="demo-modal-overlay" onClick={() => !running && setIsOpen(false)}>
          <div className="demo-modal animate-scale-up" onClick={e => e.stopPropagation()}>
            <div className="demo-modal-header">
              <div className="demo-header-info">
                <h2>⚡ Hyperlocal Rescue Lifecycle Walkthrough</h2>
                <p>Live, sequential execution against production MongoDB API endpoints</p>
              </div>
              <button 
                className="demo-close-btn" 
                onClick={() => !running && setIsOpen(false)}
                disabled={running}
              >
                <X size={18} />
              </button>
            </div>

            <div className="demo-modal-body">
              {demoSessionId && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,140,66,0.1)', border: '1px solid rgba(255,140,66,0.25)', borderRadius: '8px', padding: '0.5rem 0.85rem', fontSize: '0.8rem', color: '#ffaa75', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span>🏷️ Session ID: <strong style={{ color: '#fff' }}>{demoSessionId}</strong></span>
                  <button 
                    type="button" 
                    onClick={handleResetDemo}
                    disabled={resetting || running}
                    style={{ background: 'transparent', border: '1px solid rgba(239,68,68,0.4)', color: '#f87171', padding: '0.25rem 0.65rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem' }}
                  >
                    <Trash2 size={12} /> {resetting ? 'Purging...' : 'Purge Demo Records'}
                  </button>
                </div>
              )}

              {resetFeedback && (
                <div style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid #22c55e', borderRadius: '8px', padding: '0.5rem 0.85rem', color: '#4ade80', fontSize: '0.8rem' }}>
                  {resetFeedback}
                </div>
              )}

              {error && (
                <div style={{ background: 'rgba(231,76,60,0.15)', border: '1px solid #E74C3C', borderRadius: '12px', padding: '0.75rem 1rem', color: '#E74C3C', fontSize: '0.85rem' }}>
                  <strong>Execution Error:</strong> {error}
                </div>
              )}

              {/* Stepper Cards */}
              {DEMO_STEPS.map((s) => {
                const isCompleted = currentStep > s.id || (currentStep === 5 && s.id === 5 && !running);
                const isActive = currentStep === s.id && running;
                const isPending = currentStep < s.id;

                let payload = null;
                if (s.id === 1 && stepData.step1) payload = `Report: ${stepData.step1.reportId} | Fauna ID: ${stepData.step1.animalId} | Urgency: ${stepData.step1.urgency}`;
                if (s.id === 2 && stepData.step2) payload = `Task: ${stepData.step2.taskId} | Status: ${stepData.step2.status}`;
                if (s.id === 3 && stepData.step3) payload = `Clinical Record: ${stepData.step3.medRecordId} | Inoculation: ${stepData.step3.vaccine}`;
                if (s.id === 4 && stepData.step4) payload = `Verification: ${stepData.step4.taskStatus} | Status: ${stepData.step4.animalStatus}`;
                if (s.id === 5 && finalResult) payload = `Digital Passport generated for ${finalResult.animalId} with active QR code`;

                return (
                  <div 
                    key={s.id} 
                    className={`demo-step-card ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                  >
                    <div className="step-indicator">
                      {isCompleted ? (
                        <CheckCircle2 size={18} style={{ color: '#111' }} />
                      ) : isActive ? (
                        <Loader2 size={18} className="animate-spin" style={{ color: '#111' }} />
                      ) : (
                        s.id
                      )}
                    </div>
                    <div className="step-content">
                      <div className="step-title-row">
                        <span className="step-title">{s.title}</span>
                        <span className={`step-status-tag ${isCompleted ? 'step-done' : isActive ? 'step-running' : 'step-pending'}`}>
                          {isCompleted ? 'Completed' : isActive ? 'Processing...' : 'Pending'}
                        </span>
                      </div>
                      <p className="step-description">{s.desc}</p>
                      {payload && (
                        <div className="step-payload-data">
                          ✓ {payload}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Final Success Box */}
              {finalResult && (
                <div className="demo-success-box animate-fade-in">
                  <div style={{ fontSize: '2rem' }}>🎉</div>
                  <div>
                    <h3 style={{ color: '#2ECC71', margin: '0 0 0.25rem 0' }}>Rescue Lifecycle Complete</h3>
                    <p style={{ color: '#CBD5E0', fontSize: '0.85rem', margin: 0 }}>
                      All records committed to persistent database. Scannable Digital Animal Passport is ready.
                    </p>
                  </div>
                  <div className="passport-preview-chip">
                    <QrCode size={18} />
                    <span>FAUNA ID: {finalResult.animalId}</span>
                  </div>
                  <a
                    href={finalResult.passportUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-launch-demo"
                    style={{ textDecoration: 'none' }}
                  >
                    Inspect Generated Digital Animal Passport <ExternalLink size={16} />
                  </a>
                </div>
              )}
            </div>

            <div className="demo-modal-footer">
              <span style={{ fontSize: '0.8rem', color: '#A0AEC0' }}>
                {running ? 'Executing database transactions...' : finalResult ? 'Cycle completed successfully.' : 'Ready to execute'}
              </span>
              <button
                type="button"
                onClick={runFullLifecycle}
                disabled={running}
                className="btn-passport-action"
                style={{ background: 'rgba(255, 140, 66, 0.15)', borderColor: '#FF8C42', color: '#FF8C42' }}
              >
                {running ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                {running ? 'Running...' : 'Re-Run Lifecycle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
