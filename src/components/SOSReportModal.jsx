import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Camera, CheckCircle, Loader, MapPin, Send, X } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export default function SOSReportModal({ onClose }) {
  const { addReport, triageReport, loading } = useAppContext();
  const fileInputRef = useRef(null);
  const [photo, setPhoto] = useState(null);
  const [coords, setCoords] = useState(null);
  const [gpsState, setGpsState] = useState('detecting');
  const [note, setNote] = useState('');
  const [triage, setTriage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fileInputRef.current?.click();

    if (!navigator.geolocation) {
      setGpsState('manual');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          source: 'gps',
          confirmed: true,
        });
        setGpsState('ready');
      },
      () => setGpsState('manual'),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  useEffect(() => {
    let active = true;
    triageReport({ description: note, animalType: 'wildlife', urgency: 'High' })
      .then((result) => {
        if (active) setTriage(result);
      })
      .catch(() => {
        if (active) setTriage({ triageLabel: 'Responder Review Required', triagePriority: 'High' });
      });
    return () => {
      active = false;
    };
  }, [note, triageReport]);

  const handlePhoto = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPhoto(await fileToBase64(file));
  };

  const submitSOS = async () => {
    setError(null);
    if (!photo) {
      setError('Add one live photo before dispatching.');
      fileInputRef.current?.click();
      return;
    }
    if (!coords) {
      setError('GPS is not ready. Use the full report flow to place a rescue pin manually.');
      return;
    }

    setSubmitting(true);
    try {
      await addReport({
        animalType: 'wildlife',
        urgency: triage?.triagePriority || 'High',
        description: note.trim() || 'SOS emergency report from one-touch rescue flow.',
        images: [photo],
        location: coords,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'SOS dispatch failed.');
      setSubmitting(false);
    }
  };

  return (
    <div className="emergency-overlay" onClick={(event) => event.target.className === 'emergency-overlay' && onClose()}>
      <section className="sos-modal animate-slide-up" aria-label="One touch SOS">
        <button className="sos-close" type="button" onClick={onClose}><X size={20} /></button>
        <header>
          <div className="sos-icon"><AlertTriangle size={30} /></div>
          <div>
            <h2>SOS Rescue Dispatch</h2>
            <p>{triage?.triageLabel || 'AI triage preparing...'}</p>
          </div>
        </header>

        <div className="sos-status-grid">
          <div className={photo ? 'ready' : ''}>
            <Camera size={18} />
            <span>{photo ? 'Photo attached' : 'Camera opening'}</span>
          </div>
          <div className={gpsState === 'ready' ? 'ready' : ''}>
            {gpsState === 'detecting' ? <Loader size={18} className="spin" /> : <MapPin size={18} />}
            <span>{gpsState === 'ready' ? `GPS ready ±${Math.round(coords.accuracy || 0)}m` : 'GPS detecting'}</span>
          </div>
          <div className={triage ? 'ready' : ''}>
            {triage ? <CheckCircle size={18} /> : <Loader size={18} className="spin" />}
            <span>{triage?.triagePriority || 'Triage'}</span>
          </div>
        </div>

        {photo && <img className="sos-preview" src={photo} alt="Emergency upload preview" />}

        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Optional: injury, landmark, immediate risk"
          rows={3}
        />

        {error && <div className="sos-error">{error}</div>}

        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} hidden />

        <button className="sos-submit" type="button" onClick={submitSOS} disabled={submitting || loading}>
          {submitting || loading ? <Loader size={22} className="spin" /> : <Send size={22} />}
          Dispatch Emergency
        </button>
      </section>
    </div>
  );
}
