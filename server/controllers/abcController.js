const ABCCampaign = require('../models/ABCCampaign');
const Animal = require('../models/Animal');
const AuditLog = require('../models/AuditLog');

exports.getCampaigns = async (req, res) => {
  try {
    const campaigns = await ABCCampaign.find()
      .populate('managedBy', 'name email')
      .populate('animalsProcessed.animal', 'animalId species photographs location')
      .sort({ createdAt: -1 });

    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch ABC campaigns.' });
  }
};

exports.createCampaign = async (req, res) => {
  try {
    const { campaignName, targetArea, targetCount } = req.body;
    if (!campaignName || !targetArea) {
      return res.status(400).json({ message: 'Campaign name and target area are required.' });
    }

    const batchNumber = `ABC-BATCH-${Date.now().toString().slice(-6)}`;

    const campaign = await ABCCampaign.create({
      campaignName: campaignName.trim(),
      targetArea: targetArea.trim(),
      batchNumber,
      targetCount: Number(targetCount || 50),
      managedBy: req.user._id
    });

    await AuditLog.create({
      actor: req.user._id,
      action: 'ABC_CAMPAIGN_CREATED',
      targetType: 'ABCCampaign',
      targetId: campaign._id.toString(),
      metadata: { batchNumber, campaignName }
    });

    res.status(201).json(campaign);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to create ABC campaign.' });
  }
};

exports.processAnimal = async (req, res) => {
  try {
    const { animalId, status, releaseLocation } = req.body;
    const campaign = await ABCCampaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ message: 'ABC Campaign not found.' });

    const animal = await Animal.findOne({ $or: [{ _id: animalId }, { animalId }] });
    if (!animal) return res.status(404).json({ message: 'Animal not found.' });

    const now = new Date();
    let entry = campaign.animalsProcessed.find(a => a.animal.toString() === animal._id.toString());

    if (!entry) {
      entry = {
        animal: animal._id,
        capturedAt: now,
        status: status || 'captured',
        veterinarian: req.user._id
      };
      campaign.animalsProcessed.push(entry);
    } else {
      entry.status = status || entry.status;
    }

    if (status === 'sterilized') {
      entry.sterilizedAt = now;
      animal.sterilizationStatus = 'yes';
      animal.status = 'sterilized';
    } else if (status === 'vaccinated') {
      entry.vaccinatedAt = now;
      animal.vaccinationRecords.push({
        vaccineName: 'Rabies (ABC Campaign)',
        dateAdministered: now,
        administeredBy: req.user._id,
        notes: `CNVR Batch #${campaign.batchNumber}`
      });
    } else if (status === 'released') {
      entry.releasedAt = now;
      entry.releaseLocation = releaseLocation || animal.location;
      animal.status = 'released';
    }

    await animal.save();
    await campaign.save();

    await AuditLog.create({
      actor: req.user._id,
      action: `ABC_ANIMAL_${(status || 'PROCESSED').toUpperCase()}`,
      targetType: 'ABCCampaign',
      targetId: campaign._id.toString(),
      metadata: { animalId: animal.animalId, batchNumber: campaign.batchNumber }
    });

    res.json(campaign);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to process ABC animal status.' });
  }
};
