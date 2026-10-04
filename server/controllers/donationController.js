const Donation = require('../models/Donation');
const AuditLog = require('../models/AuditLog');

exports.createDonation = async (req, res) => {
  try {
    const { amount, currency, donorName, donorEmail, isAnonymous, caseId, campaign, providerTransactionId } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Valid donation amount is required.' });
    }

    const transactionId = providerTransactionId || `TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const donation = await Donation.create({
      transactionId,
      amount: Number(amount),
      currency: currency || 'INR',
      donor: req.user ? req.user._id : null,
      donorName: donorName || (req.user ? req.user.name : 'Anonymous Donor'),
      donorEmail: donorEmail || (req.user ? req.user.email : ''),
      isAnonymous: Boolean(isAnonymous),
      caseId: caseId || null,
      campaign: campaign || 'General Rescue Operations',
      paymentStatus: 'COMPLETED',
      provider: process.env.PAYMENT_PROVIDER_KEY ? 'Stripe' : 'Direct Verification'
    });

    await AuditLog.create({
      actor: req.user ? req.user._id : null,
      action: 'DONATION_RECEIVED',
      targetType: 'Donation',
      targetId: donation._id.toString(),
      metadata: { amount, currency, transactionId }
    });

    res.status(201).json(donation);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to process donation record.' });
  }
};

exports.getDonations = async (req, res) => {
  try {
    const donations = await Donation.find()
      .populate('donor', 'name email')
      .populate('caseId', 'title urgency')
      .sort({ createdAt: -1 })
      .limit(100);

    const totalRaised = donations.reduce((sum, d) => sum + (d.paymentStatus === 'COMPLETED' ? d.amount : 0), 0);

    res.json({ totalRaised, count: donations.length, donations });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch donations.' });
  }
};
