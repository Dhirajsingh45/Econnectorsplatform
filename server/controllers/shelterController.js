const Shelter = require('../models/Shelter');
const Asset = require('../models/Asset');
const Animal = require('../models/Animal');
const AuditLog = require('../models/AuditLog');

// ── Shelter Capacity Operations ──────────────────────────────────────────
exports.getShelters = async (req, res) => {
  try {
    const shelters = await Shelter.find().populate('managedBy', 'name email phone');

    // Dynamically calculate actual occupancy count from database
    const results = await Promise.all(shelters.map(async (shelter) => {
      const occupiedCount = await Animal.countDocuments({
        currentOrganization: shelter.organization || null,
        status: { $in: ['under_treatment', 'recovering', 'available_for_adoption'] }
      });

      const quarantineCount = await Animal.countDocuments({
        currentOrganization: shelter.organization || null,
        status: 'under_treatment'
      });

      return {
        ...shelter.toObject(),
        occupiedCount,
        availableSpaces: Math.max(shelter.capacityTotal - occupiedCount, 0),
        quarantineCount
      };
    }));

    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch shelters.' });
  }
};

exports.createShelter = async (req, res) => {
  try {
    const { name, capacityTotal, quarantineCapacity, location, supportedSpecies } = req.body;
    if (!name || !capacityTotal) {
      return res.status(400).json({ message: 'Shelter name and total capacity are required.' });
    }

    const shelter = await Shelter.create({
      name,
      capacityTotal: Number(capacityTotal),
      quarantineCapacity: Number(quarantineCapacity || 5),
      location: location || null,
      supportedSpecies: supportedSpecies || [],
      managedBy: req.user._id
    });

    await AuditLog.create({
      actor: req.user._id,
      action: 'SHELTER_CREATED',
      targetType: 'Shelter',
      targetId: shelter._id.toString(),
      metadata: { name, capacityTotal }
    });

    res.status(201).json(shelter);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to create shelter.' });
  }
};

// ── Asset Inventory Operations ────────────────────────────────────────────
exports.getAssets = async (req, res) => {
  try {
    const { type, status } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;

    const assets = await Asset.find(filter)
      .populate('owner', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ updatedAt: -1 });

    res.json(assets);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch assets.' });
  }
};

exports.createAsset = async (req, res) => {
  try {
    const { name, type, status, notes } = req.body;
    if (!name || !type) {
      return res.status(400).json({ message: 'Asset name and type are required.' });
    }

    const assetCode = `${type.slice(0, 1).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    const asset = await Asset.create({
      assetCode,
      name: name.trim(),
      type,
      status: status || 'Available',
      owner: req.user._id,
      notes: notes || ''
    });

    await AuditLog.create({
      actor: req.user._id,
      action: 'ASSET_REGISTERED',
      targetType: 'Asset',
      targetId: asset._id.toString(),
      metadata: { assetCode, name, type }
    });

    res.status(201).json(asset);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to register asset.' });
  }
};

exports.updateAsset = async (req, res) => {
  try {
    const { status, assignedTo, notes } = req.body;
    const asset = await Asset.findById(req.params.id);
    if (!asset) return res.status(404).json({ message: 'Asset not found.' });

    if (status) asset.status = status;
    if (assignedTo !== undefined) asset.assignedTo = assignedTo;
    if (notes !== undefined) asset.notes = notes;
    asset.lastUsed = new Date();

    await asset.save();
    res.json(asset);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to update asset.' });
  }
};
