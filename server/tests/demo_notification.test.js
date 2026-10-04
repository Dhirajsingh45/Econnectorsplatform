/**
 * Test: Notification and Demo Session Reset Backend Verification
 */
require('dotenv').config({ path: 'server/.env' });
const mongoose = require('mongoose');
const Report = require('../models/Report');
const Task = require('../models/Task');
const Animal = require('../models/Animal');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const User = require('../models/User');
const adminController = require('../controllers/adminController');
const notificationController = require('../controllers/notificationController');

async function runTests() {
  console.log('🧪 Starting Notification & Demo Reset Backend Verification...');
  
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/faunanet';
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 3000 }).catch(async () => {
    console.log('Connecting to local MongoDB fallback...');
    await mongoose.connect('mongodb://127.0.0.1:27017/faunanet');
  });
  console.log('Connected to MongoDB.');

  try {
    // 1. Test Demo Session Tagging & Reset
    console.log('\n--- 1. Testing Demo Session Isolation & Purge ---');
    const testSessionId = `FN-DEMO-UNITTEST-${Date.now()}`;
    
    // Create test user if needed
    let testUser = await User.findOne({ email: 'test_admin@faunanet.local' });
    if (!testUser) {
      testUser = await User.create({
        name: 'Test Admin',
        email: 'test_admin@faunanet.local',
        password: 'Password123!',
        role: 'admin'
      });
    }

    const testAnimal = await Animal.create({
      animalId: `TEST-${Date.now().toString().slice(-4)}`,
      species: 'dog',
      status: 'critical',
      isDemo: true,
      demoSessionId: testSessionId
    });

    const testReport = await Report.create({
      reporter: testUser._id,
      animalType: 'dog',
      description: 'Demo test injured dog',
      urgency: 'Critical',
      priorityLevel: 'P1',
      location: { lat: 28.61, lng: 77.20 },
      isDemo: true,
      demoSessionId: testSessionId
    });

    const testTask = await Task.create({
      title: 'Emergency Dog Rescue',
      description: 'Demo test rescue operation',
      type: 'Rescue',
      report: testReport._id,
      animalType: 'dog',
      urgency: 'P1',
      location: { lat: 28.61, lng: 77.20 },
      status: 'Reported',
      isDemo: true,
      demoSessionId: testSessionId
    });

    console.log(`Created demo records tagged with ${testSessionId}`);
    
    // Verify records exist
    const countBefore = await Task.countDocuments({ demoSessionId: testSessionId });
    if (countBefore !== 1) throw new Error('Demo task not found before reset');

    // Simulate resetDemoSession controller call
    const mockReq = {
      user: testUser,
      body: { demoSessionId: testSessionId }
    };
    let jsonOutput = null;
    const mockRes = {
      json: (data) => { jsonOutput = data; },
      status: (code) => ({ json: (data) => { jsonOutput = { code, ...data }; } })
    };

    await adminController.resetDemoSession(mockReq, mockRes);

    const countAfter = await Task.countDocuments({ demoSessionId: testSessionId });
    const animalCountAfter = await Animal.countDocuments({ demoSessionId: testSessionId });
    const reportCountAfter = await Report.countDocuments({ demoSessionId: testSessionId });

    if (countAfter !== 0 || animalCountAfter !== 0 || reportCountAfter !== 0) {
      throw new Error('Demo records were not purged properly!');
    }
    console.log('✅ PASSED: Demo session records purged cleanly from Task, Animal, and Report collections.');

    // 2. Test Notifications
    console.log('\n--- 2. Testing Notifications System ---');
    const testNotif = await Notification.create({
      recipient: testUser._id,
      title: 'Automated Dispatch Alert',
      message: 'A volunteer has accepted the P1 incident in your sector.',
      type: 'dispatch',
      read: false,
      link: '/app/tasks'
    });

    const fetchReq = { user: testUser };
    let notifsList = null;
    const fetchRes = {
      json: (data) => { notifsList = data; },
      status: () => ({ json: () => {} })
    };

    await notificationController.getNotifications(fetchReq, fetchRes);
    const list = Array.isArray(notifsList) ? notifsList : (notifsList?.notifications || []);
    const found = list.find(n => n._id.toString() === testNotif._id.toString());
    if (!found) throw new Error('Created notification not found in getNotifications');
    console.log('✅ PASSED: Notifications retrieved successfully for user.');

    // Clean up test notification
    await Notification.findByIdAndDelete(testNotif._id);
    console.log('✅ PASSED: Notification cleanup completed.');

    console.log('\n🎉 ALL BACKEND VERIFICATION TESTS PASSED SUCCESSFULLY!\n');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runTests();
