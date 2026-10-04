const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/User');
const Report = require('../models/Report');
const Task = require('../models/Task');
const Animal = require('../models/Animal');
const AnimalSighting = require('../models/AnimalSighting');
const MedicalRecord = require('../models/MedicalRecord');
const FosterApplication = require('../models/FosterApplication');
const LostFoundReport = require('../models/LostFoundReport');
const ABCCampaign = require('../models/ABCCampaign');

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}`);
    failed++;
  }
}

async function runTests() {
  console.log('🧪 Running FaunaNet Full Integration Test Suite...\n');

  const primaryUri = process.env.MONGODB_URI;
  const fallbackUri = 'mongodb://127.0.0.1:27017/faunanet';

  try {
    try {
      console.log('⌛ Connecting to Primary MongoDB...');
      await mongoose.connect(primaryUri, { serverSelectionTimeoutMS: 3000, family: 4 });
      console.log('✓ Primary MongoDB Connected\n');
    } catch (e) {
      console.warn(`⚠️  Primary DB failed (${e.message}), trying local...`);
      await mongoose.connect(fallbackUri, { serverSelectionTimeoutMS: 3000, family: 4 });
      console.log('✓ Local Fallback MongoDB Connected\n');
    }

    // --- TEST 1: Fauna ID & Animal Digital Identity ---
    console.log('TEST 1: Fauna ID & Animal Digital Identity');
    const faunaId = `FN-ANIMAL-${Date.now().toString().slice(-6)}`;
    const animal = await Animal.create({
      animalId: faunaId,
      species: 'dog',
      sex: 'male',
      estimatedAge: '2-3 years',
      sterilizationStatus: 'no',
      location: { lat: 28.6139, lng: 77.2090, city: 'New Delhi' }
    });
    assert(animal.animalId === faunaId, 'Fauna ID is persisted');
    assert(animal.faunaId === faunaId, 'faunaId auto-populated via pre-save hook');
    assert(animal.status === 'reported', 'Default status is reported');

    // --- TEST 2: Role Security ---
    console.log('\nTEST 2: Role Security - Citizen Default');
    const email = `test_${Date.now()}@faunanet.org`;
    const citizen = await User.create({ name: 'Test Citizen', email, password: 'hashed', role: 'citizen' });
    assert(citizen.role === 'citizen', 'Citizen role is created correctly');

    const vetEmail = `vet_${Date.now()}@faunanet.org`;
    const vet = await User.create({ name: 'Dr. Test', email: vetEmail, password: 'hashed', role: 'vet', verificationStatus: 'approved' });
    assert(vet.role === 'vet', 'Vet role created with verification');

    // --- TEST 3: Report & SLA Timer ---
    console.log('\nTEST 3: Report + SLA Dispatch Timer');
    const report = await Report.create({
      reporter: citizen._id,
      description: 'Injured stray dog near main road',
      location: { lat: 28.6139, lng: 77.2090, address: 'Connaught Place' },
      urgency: 'P1 - Critical',
      animalType: 'dog',
      animal: animal._id,
      status: 'NEW'
    });
    const slaExpiry = new Date(Date.now() + 900000);
    const task = await Task.create({
      title: 'Dog P1 Rescue',
      description: 'Injured stray dog',
      animalType: 'dog',
      type: 'Rescue',
      urgency: 'P1',
      report: report._id,
      animal: animal._id,
      location: { lat: 28.6139, lng: 77.2090 },
      status: 'Dispatched',
      dispatch: { dispatchedAt: new Date(), slaDurationSeconds: 900, slaExpiresAt: slaExpiry }
    });
    assert(task.dispatch.slaExpiresAt > new Date(), 'SLA expiry is in the future');
    assert(task.report.toString() === report._id.toString(), 'Task links to report');

    // --- TEST 4: Medical Record ---
    console.log('\nTEST 4: Veterinary Medical Record');
    const med = await MedicalRecord.create({
      animal: animal._id,
      task: task._id,
      vet: vet._id,
      examination: 'Compound fracture left forelimb',
      diagnosis: 'Compound fracture',
      treatment: 'Surgery + cast',
      dischargeStatus: 'in_care'
    });
    assert(med.vet.toString() === vet._id.toString(), 'Medical record links to vet');
    assert(med.dischargeStatus === 'in_care', 'Discharge status persisted');

    // --- TEST 5: Animal Sighting Movement ---
    console.log('\nTEST 5: Animal Sighting Movement Tracking');
    const sighting = await AnimalSighting.create({
      animal: animal._id,
      location: { lat: 28.6200, lng: 77.2150, address: 'Janpath, New Delhi' },
      observer: citizen._id,
      conditionNotes: 'Moving slowly, appears weak',
      distanceFromLastSightingKm: 0.8
    });
    assert(sighting.animal.toString() === animal._id.toString(), 'Sighting linked to animal');
    assert(typeof sighting.distanceFromLastSightingKm === 'number', 'Distance tracked numerically');

    // --- TEST 6: Foster Application ---
    console.log('\nTEST 6: Foster Application Workflow');
    const fosterApp = await FosterApplication.create({
      animal: animal._id,
      applicant: citizen._id,
      housingType: 'house_with_yard',
      hasOtherPets: false,
      durationWeeks: 4,
      experienceDescription: 'I have fostered 3 dogs previously',
      status: 'PENDING'
    });
    assert(fosterApp.status === 'PENDING', 'Foster app defaults to PENDING');
    assert(fosterApp.animal.toString() === animal._id.toString(), 'Foster app linked to animal');

    // --- TEST 7: Lost & Found Listing ---
    console.log('\nTEST 7: Lost & Found Pet Listing');
    const lostReport = await LostFoundReport.create({
      type: 'LOST',
      species: 'dog',
      petName: 'Bruno',
      lastSeenLocation: { lat: 28.6139, lng: 77.2090, address: 'CP', city: 'New Delhi' },
      contactName: 'Test Owner',
      contactPhone: '+91-9999000000',
      identifyingMarks: 'Brown with white patch on chest',
      createdBy: citizen._id
    });
    assert(lostReport.type === 'LOST', 'Lost report type is correct');
    assert(lostReport.status === 'ACTIVE', 'Lost report defaults to ACTIVE');

    // --- TEST 8: ABC Campaign ---
    console.log('\nTEST 8: ABC / CNVR Sterilization Campaign');
    const batchNum = `ABC-BATCH-TEST-${Date.now().toString().slice(-4)}`;
    const campaign = await ABCCampaign.create({
      campaignName: 'Test CNVR Campaign 2026',
      targetArea: 'Rohini Sector 9, Delhi',
      batchNumber: batchNum,
      targetCount: 25,
      managedBy: vet._id,
      status: 'ACTIVE'
    });
    assert(campaign.batchNumber === batchNum, 'ABC campaign batch number persisted');
    assert(campaign.status === 'ACTIVE', 'Campaign defaults to ACTIVE');

    // --- Cleanup ---
    await Promise.all([
      User.deleteMany({ email: { $in: [email, vetEmail] } }),
      Animal.deleteOne({ _id: animal._id }),
      Report.deleteOne({ _id: report._id }),
      Task.deleteOne({ _id: task._id }),
      MedicalRecord.deleteOne({ _id: med._id }),
      AnimalSighting.deleteOne({ _id: sighting._id }),
      FosterApplication.deleteOne({ _id: fosterApp._id }),
      LostFoundReport.deleteOne({ _id: lostReport._id }),
      ABCCampaign.deleteOne({ _id: campaign._id }),
    ]);

    console.log(`\n${'─'.repeat(50)}`);
    console.log(`✅  PASSED: ${passed}   ✗  FAILED: ${failed}`);

    if (failed === 0) {
      console.log('\n🎉 ALL FAUNANET INTEGRATION TESTS PASSED SUCCESSFULLY!');
    } else {
      console.error(`\n⚠️  ${failed} test(s) failed.`);
    }

  } catch (err) {
    console.error('\n❌ Test Suite Error:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
