const assert = require('assert');
const mongoose = require('mongoose');
require('dotenv').config({ path: 'server/.env' });

const Animal = require('../models/Animal');
const MedicalRecord = require('../models/MedicalRecord');
const User = require('../models/User');
const RescueLog = require('../models/RescueLog');

async function testPassport() {
  console.log('🧪 Running Digital Animal Passport Verification Test...');

  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/faunanet';
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 4000 }).catch(async () => {
    await mongoose.connect('mongodb://127.0.0.1:27017/faunanet');
  });

  try {
    // 1. Create a Vet user with private contact details
    const vet = await User.create({
      name: 'Dr. Sarah Connor',
      email: 'sarah.vet.private@example.com',
      phone: '+91 98765 43210',
      password: 'hashedpassword',
      role: 'vet',
      verificationStatus: 'approved'
    });

    // 2. Create Animal with vaccination record
    const faunaId = `FN-PASSPORT-${Date.now().toString().slice(-6)}`;
    const animal = await Animal.create({
      animalId: faunaId,
      species: 'dog',
      breed: 'Indie Hound',
      estimatedAge: '1.5 years',
      sex: 'female',
      sterilizationStatus: 'yes',
      status: 'rescued',
      location: { city: 'New Delhi', area: 'Sector 14' },
      vaccinationRecords: [{
        vaccineName: 'Anti-Rabies Prophylaxis',
        dateAdministered: new Date(),
        administeredBy: vet._id,
        notes: 'Administered during field rescue'
      }]
    });

    // 3. Create Medical Record
    const med = await MedicalRecord.create({
      animal: animal._id,
      vet: vet._id,
      examination: 'Trauma inspection - right leg contusion',
      diagnosis: 'Soft tissue contusion',
      treatment: 'Analgesic injection & dressing',
      dischargeStatus: 'ready_for_shelter'
    });

    // 4. Create RescueLog
    await RescueLog.create({
      animalDigitalId: faunaId,
      animalType: 'dog',
      zone: 'Sector 14',
      statusTimeline: [
        { status: 'Reported', note: 'Distress call from citizen' },
        { status: 'In Progress', note: 'Responder on scene' },
        { status: 'Rescued', note: 'Safely transported to partner clinic' }
      ]
    });

    // 5. Test controller logic directly
    const animalController = require('../controllers/animalController');

    let responseData = null;
    let statusCode = 200;

    const mockReq = { params: { id: faunaId } };
    const mockRes = {
      status: (c) => { statusCode = c; return mockRes; },
      json: (d) => { responseData = d; return mockRes; }
    };

    await animalController.getAnimalPassport(mockReq, mockRes);

    assert(statusCode === 200, 'Status code should be 200');
    assert(responseData && responseData.success === true, 'Response must be success: true');
    assert(responseData.passport, 'Response must contain passport object');
    assert(responseData.passport.animalId === faunaId, 'Passport animalId matches');
    assert(responseData.passport.species === 'dog', 'Passport species matches');
    assert(responseData.passport.vaccinationRecords.length === 1, 'Vaccination record present');
    assert(responseData.passport.medicalHistory.length === 1, 'Medical record present');
    assert(responseData.passport.timeline.length >= 4, 'Consolidated timeline contains events');

    // Verify PII Protection: ensure private phone and email are NOT exposed in public passport
    const serialized = JSON.stringify(responseData.passport);
    assert(!serialized.includes('sarah.vet.private@example.com'), 'Vet email must not be exposed in passport');
    assert(!serialized.includes('+91 98765 43210'), 'Vet phone must not be exposed in passport');
    assert(serialized.includes('Dr. Sarah Connor'), 'Vet public professional name is correctly presented');

    console.log('✅ PASSED: Digital Animal Passport endpoint verified!');
    console.log('✅ PASSED: PII privacy protections confirmed — zero contact leaks in public ledger.');

    // Cleanup
    await Promise.all([
      User.deleteOne({ _id: vet._id }),
      Animal.deleteOne({ _id: animal._id }),
      MedicalRecord.deleteOne({ _id: med._id }),
      RescueLog.deleteOne({ animalDigitalId: faunaId })
    ]);

  } finally {
    await mongoose.connection.close();
  }
}

testPassport().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
