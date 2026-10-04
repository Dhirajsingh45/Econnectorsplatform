const Report = require('../models/Report');
const Task = require('../models/Task');
const Animal = require('../models/Animal');
const Shelter = require('../models/Shelter');
const ABCCampaign = require('../models/ABCCampaign');
const AdoptionApplication = require('../models/AdoptionApplication');

exports.getPublicStats = async (req, res) => {
  try {
    const [
      totalReports,
      totalRescuesCompleted,
      totalAdopted,
      totalSterilized,
      totalShelters
    ] = await Promise.all([
      Report.countDocuments(),
      Task.countDocuments({ status: { $in: ['Completed', 'Verified'] } }),
      Animal.countDocuments({ status: 'adopted' }),
      Animal.countDocuments({ sterilizationStatus: 'yes' }),
      Shelter.countDocuments()
    ]);

    res.json({
      totalReports,
      totalRescuesCompleted,
      totalAdopted,
      totalSterilized,
      totalShelters,
      dataTimestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch public statistics.' });
  }
};

exports.getWelfareHotspots = async (req, res) => {
  try {
    const reports = await Report.find(
      { 'location.lat': { $exists: true }, 'location.lng': { $exists: true } },
      'location urgency animalType status createdAt'
    ).limit(300);

    const hotspots = reports.map(r => ({
      id: r._id,
      lat: r.location.lat,
      lng: r.location.lng,
      weight: r.urgency === 'P1' || r.urgency === 'Critical' ? 1.0 : r.urgency === 'P2' || r.urgency === 'High' ? 0.7 : 0.4,
      animalType: r.animalType,
      urgency: r.urgency
    }));

    res.json(hotspots);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to calculate welfare hotspots.' });
  }
};

exports.getMunicipalOverview = async (req, res) => {
  try {
    const [
      totalAnimals,
      sterilizedCount,
      vaccinatedCount,
      shelterList,
      activeCampaigns
    ] = await Promise.all([
      Animal.countDocuments(),
      Animal.countDocuments({ sterilizationStatus: 'yes' }),
      Animal.countDocuments({ 'vaccinationRecords.0': { $exists: true } }),
      Shelter.find(),
      ABCCampaign.find({ status: 'ACTIVE' })
    ]);

    const totalShelterCapacity = shelterList.reduce((sum, s) => sum + (s.capacityTotal || 0), 0);
    const sterilizationCoveragePercent = totalAnimals > 0 ? Math.round((sterilizedCount / totalAnimals) * 100) : 0;
    const vaccinationCoveragePercent = totalAnimals > 0 ? Math.round((vaccinatedCount / totalAnimals) * 100) : 0;

    res.json({
      totalAnimalsTracked: totalAnimals,
      sterilizedCount,
      sterilizationCoveragePercent,
      vaccinatedCount,
      vaccinationCoveragePercent,
      totalShelterCapacity,
      activeABCCampaignsCount: activeCampaigns.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch municipal overview.' });
  }
};
