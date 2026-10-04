const TrainingProgress = require('../models/TrainingProgress');
const TrainingCertificate = require('../models/TrainingCertificate');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { notifyUser } = require('../utils/notifyUser');

// Canonical curriculum definition
const MODULES = [
  {
    id: 'rescue-safety',
    title: 'Emergency Rescue Safety & Humane Handling',
    category: 'rescue',
    difficulty: 'Essential',
    durationMinutes: 15,
    description: 'Learn critical roadside safety, humane handling of injured animals, and transport protocols without endangering yourself or the animal.',
    badgeName: 'Rescue Safety Certified',
    realActionTarget: '/app/tasks',
    realActionLabel: 'Find Rescue Tasks',
    lessons: [
      {
        id: 'rs-1',
        title: 'Roadside Scene Safety & Hazard Assessment',
        content: 'Your safety is step zero. Never run into active traffic to reach an animal. Establish hazard cones or vehicle flashers if safe. In high-speed zones, coordinate with traffic personnel or local rescue units before entering the roadway.',
        safetyNote: 'A responder who becomes a casualty cannot rescue anyone. Ensure the perimeter is physically secure before approaching.'
      },
      {
        id: 'rs-2',
        title: 'Approaching Traumatized or Fearful Animals',
        content: 'Injured animals often bite or scratch out of acute terror, not malice. Avoid direct eye contact. Crouch sideways to minimize your silhouette. Speak in low, calm tones and use a blanket or towel to gently cover the animal’s eyes and prevent thrashing.',
        safetyNote: 'Never muzzle an animal that is vomiting, having respiratory distress, or has thoracic trauma.'
      },
      {
        id: 'rs-3',
        title: 'Humane Immobilization & Transport',
        content: 'Support the spine and pelvis horizontally when lifting. For suspected spinal injury, use a firm stretcher or flat wooden board. Keep the vehicle interior cool, dark, and quiet during transit to the nearest veterinary center.',
        safetyNote: 'Do not administer human analgesics (such as paracetamol or ibuprofen) as they are fatal to canines and felines.'
      }
    ],
    quiz: [
      {
        id: 'q1',
        question: 'When approaching an injured animal on a roadway, what is your primary initial obligation?',
        options: [
          'Run immediately to grab the animal before it moves',
          'Assess scene safety and ensure traffic perimeter is secure before approaching',
          'Offer dry food to coax the animal into running',
          'Take photos for social media verification'
        ],
        correctAnswer: 1,
        explanation: 'Scene safety is mandatory. Responders must never enter live traffic without securing the perimeter.'
      },
      {
        id: 'q2',
        question: 'Why is direct eye contact discouraged when approaching a fearful or injured street animal?',
        options: [
          'Animals are blinded by human stare',
          'Direct eye contact is perceived as a predatory challenge and increases biting risk',
          'Eye contact slows down walking speed',
          'There is no reason, eye contact is recommended'
        ],
        correctAnswer: 1,
        explanation: 'Direct frontal eye contact is perceived by canines as an aggressive challenge, elevating defensive aggression.'
      },
      {
        id: 'q3',
        question: 'Which of the following pain medications is safe to give an injured street dog without a veterinarian?',
        options: [
          'Human Paracetamol / Acetaminophen',
          'Ibuprofen',
          'Aspirin',
          'None — human analgesics can be lethal; wait for veterinary administration'
        ],
        correctAnswer: 3,
        explanation: 'Human NSAIDs and paracetamol cause severe toxicity, acute liver/kidney failure, or death in canines.'
      }
    ]
  },
  {
    id: 'foster-basics',
    title: 'Foster Care Foundations & Home Safety',
    category: 'foster',
    difficulty: 'Beginner',
    durationMinutes: 20,
    description: 'Master the first 48 hours of foster care: home preparation, stress reduction, hygiene, daily welfare tracking, and emergency indicators.',
    badgeName: 'Foster Ready',
    realActionTarget: '/app/foster',
    realActionLabel: 'Browse Foster Animals',
    lessons: [
      {
        id: 'fb-1',
        title: 'The First 48 Hours: Decompression & Safe Quarantine',
        content: 'Rescue animals arrive in an elevated cortisol state. Implement the Rule of Three (3 days to decompress, 3 weeks to learn routine, 3 months to feel at home). Provide a quiet, enclosed room with a warm bed, fresh water, and minimal foot traffic.',
        safetyNote: 'Keep foster animals physically separated from resident pets for at least 7 to 10 days to monitor for incubating infections.'
      },
      {
        id: 'fb-2',
        title: 'Nutrition, Feeding Hygiene & Daily Tracking',
        content: 'Sudden dietary shifts trigger gastrointestinal distress. Feed modest, consistent meals at fixed hours. Log food consumption, water intake, and stool consistency daily in your FaunaNet Foster Dashboard.',
        safetyNote: 'Never feed cooked poultry bones, onions, garlic, chocolate, grapes, or xylitol-sweetened treats.'
      },
      {
        id: 'fb-3',
        title: 'Recognizing Foster Welfare Emergencies',
        content: 'Know when to use the Foster Emergency Beacon: pale gums, persistent vomiting, refusal to drink for >18 hours, sudden lethargy, labored breathing, or severe behavioral distress require immediate veterinary escalation.',
        safetyNote: 'Always maintain your supervising NGO/shelter emergency contact and nearest 24/7 clinic number visibly posted.'
      }
    ],
    quiz: [
      {
        id: 'fq1',
        question: 'What is the recommended protocol when introducing a new foster animal to resident household pets?',
        options: [
          'Put them in the same room immediately so they sort it out',
          'Maintain separate quarantine for 7-10 days to observe health and allow decompression',
          'Feed them side-by-side from the same bowl',
          'Never introduce them under any circumstances forever'
        ],
        correctAnswer: 1,
        explanation: 'A 7-10 day quarantine prevents infectious spread (parvo, kennel cough) and allows gradual sensory acclimatization.'
      },
      {
        id: 'fq2',
        question: 'Which symptom in a foster puppy or dog demands urgent veterinary escalation rather than waiting?',
        options: [
          'Sleeping for 2 hours after a meal',
          'Hesitation to play with a new toy',
          'Pale/white gums, repeated vomiting, or acute lethargy',
          'Sniffing around the perimeter of the room'
        ],
        correctAnswer: 2,
        explanation: 'Pale gums and repeated vomiting are signs of hypovolemic shock, internal hemorrhage, or severe dehydration requiring immediate care.'
      }
    ]
  },
  {
    id: 'lost-found-sentinel',
    title: 'Lost & Found Verification & Safe Reunions',
    category: 'lost_found',
    difficulty: 'Essential',
    durationMinutes: 12,
    description: 'Learn how to accurately report lost/found pets, record verified sightings, protect finders from scams, and safely verify true guardianship.',
    badgeName: 'Lost & Found Sentinel',
    realActionTarget: '/app/lost-found',
    realActionLabel: 'Explore Lost & Found',
    lessons: [
      {
        id: 'lf-1',
        title: 'Listing Precision & Key Photographic Markers',
        content: 'Clear photographs of unique markings (fur patterns, paw coloration, notch in ear, tail length) expedite matching. Note whether the pet has a collar, microchip, or unique behavioral response to its name.',
        safetyNote: 'Never publish exact house numbers publicly. Always use approximate landmark or neighborhood boundaries.'
      },
      {
        id: 'lf-2',
        title: 'Verifying True Guardianship & Preventing Scams',
        content: 'Before handing over a found pet, request unshared proof: past photographs spanning months, veterinary vaccination records, or unique features that were intentionally omitted from the public poster.',
        safetyNote: 'Never pay upfront "courier fees" or "holding fees" demanded by unknown phone callers claiming to have your lost pet.'
      }
    ],
    quiz: [
      {
        id: 'lq1',
        question: 'Why should public lost & found posters omit at least one distinctive physical marker?',
        options: [
          'To save space on the digital image',
          'So the finder can use that hidden detail to verify genuine owners against fraudulent claimants',
          'Because cameras cannot capture fine details',
          'To test the pet’s memory'
        ],
        correctAnswer: 1,
        explanation: 'Withholding a specific identifying marker enables the finder to verify the legitimate owner without exposing details to scammers.'
      },
      {
        id: 'lq2',
        question: 'What is the safest protocol for scheduling a physical pet reunion handover?',
        options: [
          'A dark alleyway at midnight alone',
          'Transfer money online first before seeing the animal',
          'Meet during daylight in a secure, public area or reputable veterinary clinic',
          'Leave the animal unattended in a crate on the sidewalk'
        ],
        correctAnswer: 2,
        explanation: 'Public, well-lit venues or veterinary clinics offer safety, microchip scanner access, and witness security for both parties.'
      }
    ]
  },
  {
    id: 'wildlife-awareness',
    title: 'Wildlife Encounters & Non-Contact Safety',
    category: 'wildlife',
    difficulty: 'Intermediate',
    durationMinutes: 15,
    description: 'Protocol for safely documenting urban wildlife (monkeys, birds of prey, reptiles) without illegal handling or zoonotic exposure.',
    badgeName: 'Wildlife Awareness Advocate',
    realActionTarget: '/app/map',
    realActionLabel: 'View Wildlife Cases on Map',
    lessons: [
      {
        id: 'wl-1',
        title: 'Urban Wildlife Coexistence & Legal Framework',
        content: 'Wildlife species are protected under strict conservation statutes (e.g. Wildlife Protection Act). It is illegal for unauthorized citizens to capture, keep, or treat wild animals without certified forest department jurisdiction.',
        safetyNote: 'Maintain a minimum 10-meter distance. Never corner a wild animal or attempt physical capture.'
      },
      {
        id: 'wl-2',
        title: 'Zoonotic Risk Awareness & Rabies Prevention',
        content: 'Mammalian wildlife can transmit rabies and other dangerous zoonoses. Any bite, scratch, or direct mucosal exposure requires immediate copious wound washing with soap and running water for 15 minutes, followed by urgent medical post-exposure prophylaxis (PEP).',
        safetyNote: 'Educational guidance only. For active wildlife distress, notify registered wildlife NGOs or government forest emergency units immediately.'
      }
    ],
    quiz: [
      {
        id: 'wq1',
        question: 'What is the immediate first-aid requirement following any potential bite or scratch from a suspected rabid animal?',
        options: [
          'Bandage tightly and wait 48 hours to see if symptoms appear',
          'Immediately wash the wound under running water with soap for 15 minutes, then seek emergency medical PEP',
          'Apply turmeric paste and avoid water',
          'Drink hot tea and rest'
        ],
        correctAnswer: 1,
        explanation: 'Immediate copious washing with soap and water mechanically reduces viral load; urgent medical PEP is lifesaving.'
      }
    ]
  }
];

// GET /api/training/modules - List all learning modules
exports.getModules = async (req, res) => {
  try {
    const modulesWithProgress = await Promise.all(MODULES.map(async (m) => {
      let progress = null;
      if (req.user) {
        progress = await TrainingProgress.findOne({ user: req.user._id, moduleId: m.id });
      }
      return {
        id: m.id,
        title: m.title,
        category: m.category,
        difficulty: m.difficulty,
        durationMinutes: m.durationMinutes,
        description: m.description,
        badgeName: m.badgeName,
        lessonCount: m.lessons.length,
        questionCount: m.quiz.length,
        realActionTarget: m.realActionTarget,
        realActionLabel: m.realActionLabel,
        isCompleted: progress?.status === 'completed',
        bestScore: progress?.bestScore || 0,
        completedLessons: progress?.completedLessons || []
      };
    }));

    res.json(modulesWithProgress);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch training modules.' });
  }
};

// GET /api/training/modules/:id - Get full module with lessons and quiz
exports.getModuleDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const moduleData = MODULES.find(m => m.id === id);
    if (!moduleData) return res.status(404).json({ message: 'Training module not found.' });

    let progress = null;
    let certificate = null;
    if (req.user) {
      progress = await TrainingProgress.findOne({ user: req.user._id, moduleId: id });
      if (progress?.certificate) {
        certificate = await TrainingCertificate.findById(progress.certificate);
      }
    }

    res.json({
      ...moduleData,
      progress: progress ? {
        status: progress.status,
        completedLessons: progress.completedLessons,
        bestScore: progress.bestScore,
        completedAt: progress.completedAt
      } : null,
      certificate
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch module details.' });
  }
};

// POST /api/training/modules/:id/progress - Mark lesson completed
exports.completeLesson = async (req, res) => {
  try {
    const { id } = req.params;
    const { lessonId } = req.body;

    const moduleData = MODULES.find(m => m.id === id);
    if (!moduleData) return res.status(404).json({ message: 'Module not found.' });

    let progress = await TrainingProgress.findOne({ user: req.user._id, moduleId: id });
    if (!progress) {
      progress = new TrainingProgress({
        user: req.user._id,
        moduleId: id,
        status: 'in_progress',
        completedLessons: []
      });
    }

    if (lessonId && !progress.completedLessons.includes(lessonId)) {
      progress.completedLessons.push(lessonId);
    }
    progress.status = progress.completedLessons.length >= moduleData.lessons.length ? 'in_progress' : 'enrolled';
    await progress.save();

    res.json({ message: 'Lesson progress saved.', progress });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to update lesson progress.' });
  }
};

// POST /api/training/modules/:id/submit-quiz - Submit quiz answers & award certificate upon passing
exports.submitQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const { answers } = req.body; // e.g. { q1: 1, q2: 1, q3: 3 }

    const moduleData = MODULES.find(m => m.id === id);
    if (!moduleData) return res.status(404).json({ message: 'Module not found.' });

    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ message: 'Quiz answers required.' });
    }

    let correctCount = 0;
    const totalQuestions = moduleData.quiz.length;
    const questionResults = moduleData.quiz.map((q) => {
      const selected = answers[q.id];
      const isCorrect = selected === q.correctAnswer;
      if (isCorrect) correctCount++;
      return {
        questionId: q.id,
        selectedAnswer: selected,
        correctAnswer: q.correctAnswer,
        isCorrect,
        explanation: q.explanation
      };
    });

    const scorePercentage = Math.round((correctCount / totalQuestions) * 100);
    const passed = scorePercentage >= 75;

    let progress = await TrainingProgress.findOne({ user: req.user._id, moduleId: id });
    if (!progress) {
      progress = new TrainingProgress({
        user: req.user._id,
        moduleId: id,
        completedLessons: moduleData.lessons.map(l => l.id)
      });
    }

    progress.quizAttempts.push({
      score: scorePercentage,
      totalQuestions,
      passed,
      timestamp: new Date()
    });

    if (scorePercentage > progress.bestScore) {
      progress.bestScore = scorePercentage;
    }

    let certificate = null;
    if (passed && progress.status !== 'completed') {
      progress.status = 'completed';
      progress.completedAt = new Date();

      certificate = await TrainingCertificate.create({
        user: req.user._id,
        userName: req.user.name,
        moduleId: id,
        moduleTitle: moduleData.title,
        category: moduleData.category,
        score: scorePercentage,
        badgeAwarded: moduleData.badgeName
      });

      progress.certificate = certificate._id;

      // Update User profile stats & badges
      await User.findByIdAndUpdate(req.user._id, {
        $inc: { trustScore: 10, points: 50 },
        $addToSet: {
          trainingCompleted: {
            moduleId: moduleData.lessons.length,
            completedAt: new Date()
          }
        }
      });

      await AuditLog.create({
        actor: req.user._id,
        action: 'TRAINING_MODULE_COMPLETED',
        targetType: 'TrainingCertificate',
        targetId: certificate._id.toString(),
        metadata: { moduleId: id, score: scorePercentage, certificateId: certificate.certificateId }
      });

      await notifyUser(req, {
        recipient: req.user._id,
        title: '🎓 Training Certificate Earned!',
        message: `Congratulations! You passed "${moduleData.title}" with a score of ${scorePercentage}%. Certificate ID: ${certificate.certificateId}.`,
        type: 'training',
        link: '/app/training',
      });
    }
    await progress.save();

    res.json({
      passed,
      score: scorePercentage,
      correctCount,
      totalQuestions,
      questionResults,
      certificate,
      realActionTarget: moduleData.realActionTarget,
      realActionLabel: moduleData.realActionLabel
    });
  } catch (error) {
    console.error('Submit quiz error:', error);
    res.status(500).json({ message: error.message || 'Failed to evaluate quiz.' });
  }
};

// GET /api/training/certificates - List user's certificates
exports.getMyCertificates = async (req, res) => {
  try {
    const certs = await TrainingCertificate.find({ user: req.user._id })
      .sort({ issuedAt: -1 });
    res.json(certs);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch certificates.' });
  }
};

// GET /api/training/certificates/verify/:certId - Public verification endpoint
exports.verifyCertificate = async (req, res) => {
  try {
    const { certId } = req.params;
    const cert = await TrainingCertificate.findOne({ certificateId: certId })
      .populate('user', 'name');

    if (!cert) return res.status(404).json({ verified: false, message: 'Certificate record not found.' });

    res.json({
      verified: true,
      certificateId: cert.certificateId,
      recipientName: cert.userName,
      moduleTitle: cert.moduleTitle,
      category: cert.category,
      score: cert.score,
      issuedAt: cert.issuedAt,
      badgeAwarded: cert.badgeAwarded,
      disclaimer: cert.disclaimer
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to verify certificate.' });
  }
};
