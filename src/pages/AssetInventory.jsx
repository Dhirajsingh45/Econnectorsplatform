import { useState, useEffect } from 'react';
import { Truck, Package, Bed, Plus, MoreVertical, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { shelterService } from '../services/api';
import { useAppContext } from '../context/AppContext';
import './AssetInventory.css';

export default function AssetInventory() {
  const { t } = useTranslation();
  const { currentUser } = useAppContext();
  const [assets, setAssets] = useState([]);
  const [shelters, setShelters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [assetName, setAssetName] = useState('');
  const [assetType, setAssetType] = useState('Vehicle');
  const [assetStatus, setAssetStatus] = useState('Available');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [assetsData, sheltersData] = await Promise.all([
        shelterService.getAssets(),
        shelterService.getShelters()
      ]);
      setAssets(Array.isArray(assetsData) ? assetsData : []);
      setShelters(Array.isArray(sheltersData) ? sheltersData : []);
    } catch (err) {
      console.error('Failed to fetch asset inventory:', err);
      setError('Unable to fetch shelter and asset data from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRegisterAsset = async (e) => {
    e.preventDefault();
    if (!assetName || !assetType) {
      alert('Asset name and category type are required.');
      return;
    }

    setSubmitting(true);
    try {
      await shelterService.createAsset({
        name: assetName,
        type: assetType,
        status: assetStatus
      });
      setShowModal(false);
      setAssetName('');
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to register asset.');
    } finally {
      setSubmitting(false);
    }
  };

  const vehicleCount = assets.filter(a => a.type === 'Vehicle').length;
  const availableVehicles = assets.filter(a => a.type === 'Vehicle' && a.status === 'Available').length;
  const medKitCount = assets.filter(a => a.type === 'Medical').length;

  const totalCapacity = shelters.reduce((acc, s) => acc + (s.capacityTotal || 0), 0);
  const totalOccupied = shelters.reduce((acc, s) => acc + (s.occupiedCount || 0), 0);
  const freeBeds = Math.max(totalCapacity - totalOccupied, 0);

  return (
    <div className="asset-inventory animate-fade-in">
      <header className="mb-lg flex justify-between items-center">
        <div>
          <h1 className="pixel-font text-accent">Shelter & Resource Management</h1>
          <p className="text-muted text-xs">
            Operational Assets: {assets.length} items • Shelter Spaces: {freeBeds}/{totalCapacity} free
          </p>
        </div>
        <div className="flex gap-sm">
          <button className="btn btn-outline btn-sm" onClick={fetchData}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
            <Plus size={16} /> REGISTER NEW ASSET
          </button>
        </div>
      </header>

      {/* Dynamic database statistics */}
      <div className="stats-strip mb-lg">
        <div className="stat-card glass-panel">
          <Truck size={20} className="text-primary" />
          <div className="info">
            <span className="val">{availableVehicles}/{vehicleCount}</span>
            <span className="lab">VEHICLES AVAIL.</span>
          </div>
        </div>
        <div className="stat-card glass-panel">
          <Package size={20} className="text-accent" />
          <div className="info">
            <span className="val">{medKitCount}</span>
            <span className="lab">MED KITS</span>
          </div>
        </div>
        <div className="stat-card glass-panel">
          <Bed size={20} className="text-primary" />
          <div className="info">
            <span className="val">{freeBeds}/{totalCapacity}</span>
            <span className="lab">FREE SHELTER BEDS</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="empty-board p-xl text-center">
          <p>Loading real database asset inventory...</p>
        </div>
      ) : error ? (
        <div className="error-alert mb-lg">{error}</div>
      ) : assets.length === 0 ? (
        <div className="asset-list glass-panel p-xl text-center">
          <p className="text-muted">No assets registered in the database yet. Click "REGISTER NEW ASSET" above to add real equipment or vehicles.</p>
        </div>
      ) : (
        <div className="asset-list glass-panel">
          <table className="inventory-table">
            <thead>
              <tr>
                <th>CODE</th>
                <th>RESOURCE NAME</th>
                <th>CATEGORY</th>
                <th>STATUS</th>
                <th>LAST ACTIVITY</th>
              </tr>
            </thead>
            <tbody>
              {assets.map(asset => (
                <tr key={asset._id}>
                  <td className="text-muted">#{asset.assetCode}</td>
                  <td className="font-bold">{asset.name}</td>
                  <td><span className="type-tag">{asset.type}</span></td>
                  <td>
                    <span className={`status-pill ${asset.status === 'Available' ? 'available' : 'in-use'}`}>
                      {asset.status === 'Available' ? <Check size={12} /> : <AlertCircle size={12} />}
                      {asset.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="text-xs text-muted">
                    {asset.updatedAt ? new Date(asset.updatedAt).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Asset Register Modal */}
      {showModal && (
        <div className="form-overlay" onClick={() => setShowModal(false)}>
          <div className="form-container" onClick={(e) => e.stopPropagation()}>
            <form className="report-form" onSubmit={handleRegisterAsset}>
              <div className="form-header">
                <h2>Register New Asset / Resource</h2>
                <button type="button" className="close-btn" onClick={() => setShowModal(false)}>×</button>
              </div>

              <div className="form-body">
                <div className="field-group">
                  <label>Resource Name</label>
                  <input 
                    className="form-select" 
                    placeholder="e.g. Rapid Rescue Ambulance #1, Surgical Kit B"
                    value={assetName}
                    onChange={(e) => setAssetName(e.target.value)}
                    required 
                  />
                </div>

                <div className="field-group">
                  <label>Category</label>
                  <select 
                    className="form-select" 
                    value={assetType}
                    onChange={(e) => setAssetType(e.target.value)}
                  >
                    <option value="Vehicle">Vehicle / Ambulance</option>
                    <option value="Medical">Medical Kit / Equipment</option>
                    <option value="Infrastructure">Infrastructure / Recovery Bed</option>
                    <option value="Equipment">Safety / Transport Equipment</option>
                  </select>
                </div>

                <div className="field-group">
                  <label>Initial Status</label>
                  <select 
                    className="form-select" 
                    value={assetStatus}
                    onChange={(e) => setAssetStatus(e.target.value)}
                  >
                    <option value="Available">Available</option>
                    <option value="In Use">In Use</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>
              </div>

              <div className="form-footer">
                <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
                  {submitting ? 'Registering...' : 'Save Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
