import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  HelpCircle, AlertTriangle, Search, Heart, Shield, 
  Stethoscope, Users, ChevronDown, ChevronUp, PhoneCall, ExternalLink 
} from 'lucide-react';
import './HelpCenter.css';

const FAQS = [
  {
    category: 'emergency',
    title: 'What should I do if I find a critically injured stray animal?',
    content: 'Ensure your personal safety first. Open Ecoconnect and submit an Emergency Report with exact GPS location and clear photos. If the animal is on a busy road, place safe barricades or caution cones without cornering the animal. Our automated triage will route the case to the nearest available emergency responder within minutes.'
  },
  {
    category: 'emergency',
    title: 'How does the automated AI triage categorize urgency?',
    content: 'Ecoconnect evaluates keywords and description metrics in real-time. Severe physical trauma, active hemorrhage, vehicle collision, and unconsciousness trigger P1 Critical with 15-minute dispatch SLAs. High-risk fractures or deep lacerations trigger P2 High. Mild lameness or skin infections trigger P3 Normal.'
  },
  {
    category: 'lost_found',
    title: 'How does the Lost & Found image matching work?',
    content: 'When you upload a photo of a lost or found animal, Ecoconnect compares facial features, coat patterns, ear notches, and species markings against existing community records and active reports to detect potential matches.'
  },
  {
    category: 'volunteer',
    title: 'How do I become a verified responder or volunteer?',
    content: 'Go to your Profile page and select "Request Official Verification". Fill in your credentials, handling experience, and any NGO/clinic affiliations. Administrators verify volunteer credentials and dispatch readiness within 24-48 hours.'
  },
  {
    category: 'foster',
    title: 'What support does Ecoconnect provide to foster homes?',
    content: 'Through our Foster Hub and Shelter Asset Inventory, partner NGOs and shelters provide medical supplies, food rations, and veterinary checkup access for animals in temporary foster care until permanent adoption.'
  },
  {
    category: 'adoption',
    title: 'What is the Ecoconnect Digital Passport?',
    content: 'Every rescued animal receives an immutable Digital Passport containing medical records, rabies vaccinations, sterilization status, and rescue history. Public-safe versions (free of sensitive rescuer PII) are shareable for adoption and municipal verification.'
  },
];

export default function HelpCenter() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [openIdx, setOpenIdx] = useState(null);
  const navigate = useNavigate();

  const toggleAccordion = (idx) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  const filteredFaqs = FAQS.filter(faq => {
    const matchesCategory = activeCategory === 'all' || faq.category === activeCategory;
    const matchesSearch = !searchQuery || 
      faq.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      faq.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="help-page animate-fade-in">
      <div className="help-hero glass-panel">
        <h1 className="help-title">
          <HelpCircle className="text-primary inline-icon" size={32} /> Help & Resource Center
        </h1>
        <p className="help-subtitle">
          Operational protocols, emergency guidelines, and step-by-step guides for citizens, responders, and shelters.
        </p>

        <div className="help-search-box">
          <Search size={18} className="search-icon" />
          <input 
            type="text"
            placeholder="Search help topics, protocols, SLAs, or guidelines..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Emergency Hotline Banner */}
      <div className="emergency-banner glass-panel">
        <div className="emergency-banner-left">
          <AlertTriangle className="text-danger" size={28} />
          <div>
            <h4>Critical Animal Distress in Progress?</h4>
            <p>Don't wait for email tickets. File a live P1 rescue report immediately for instant SLA volunteer dispatch.</p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/app/tasks')}>
          Report Emergency Incident
        </button>
      </div>

      {/* Categories Bar */}
      <div className="help-categories">
        <button 
          className={`category-pill ${activeCategory === 'all' ? 'active' : ''}`}
          onClick={() => setActiveCategory('all')}
        >
          All Topics
        </button>
        <button 
          className={`category-pill ${activeCategory === 'emergency' ? 'active' : ''}`}
          onClick={() => setActiveCategory('emergency')}
        >
          Emergency Protocol
        </button>
        <button 
          className={`category-pill ${activeCategory === 'lost_found' ? 'active' : ''}`}
          onClick={() => setActiveCategory('lost_found')}
        >
          Lost & Found
        </button>
        <button 
          className={`category-pill ${activeCategory === 'volunteer' ? 'active' : ''}`}
          onClick={() => setActiveCategory('volunteer')}
        >
          Volunteers & Dispatch
        </button>
        <button 
          className={`category-pill ${activeCategory === 'foster' ? 'active' : ''}`}
          onClick={() => setActiveCategory('foster')}
        >
          Foster Program
        </button>
        <button 
          className={`category-pill ${activeCategory === 'adoption' ? 'active' : ''}`}
          onClick={() => setActiveCategory('adoption')}
        >
          Adoption & Passports
        </button>
      </div>

      {/* Accordion List */}
      <div className="faqs-list">
        {filteredFaqs.length === 0 ? (
          <div className="no-results glass-panel">
            <p>No matching guides found for "{searchQuery}". Try a different keyword.</p>
          </div>
        ) : (
          filteredFaqs.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div key={idx} className={`faq-card glass-panel ${isOpen ? 'open' : ''}`}>
                <button className="faq-question-btn" onClick={() => toggleAccordion(idx)}>
                  <span className="faq-q-text">{faq.title}</span>
                  {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                {isOpen && (
                  <div className="faq-answer">
                    <p>{faq.content}</p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Quick Navigation Cards */}
      <div className="quick-help-grid">
        <div className="quick-card glass-panel" onClick={() => navigate('/app/tasks')}>
          <Shield className="text-primary" size={24} />
          <h4>Rescue Board</h4>
          <p>View real-time dispatch queue and volunteer assignments.</p>
        </div>
        <div className="quick-card glass-panel" onClick={() => navigate('/app/lost-found')}>
          <Search className="text-teal" size={24} />
          <h4>Lost & Found</h4>
          <p>Search or report missing pets with photo recognition.</p>
        </div>
        <div className="quick-card glass-panel" onClick={() => navigate('/app/foster')}>
          <Heart className="text-gold" size={24} />
          <h4>Foster Hub</h4>
          <p>Register as a foster home or browse animals needing care.</p>
        </div>
        <div className="quick-card glass-panel" onClick={() => navigate('/app/impact')}>
          <Users className="text-green" size={24} />
          <h4>Live Transparency</h4>
          <p>Inspect verifiable statistics and resolution metrics.</p>
        </div>
      </div>
    </div>
  );
}
