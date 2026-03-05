import React, { useState, useCallback } from 'react';
import { AppBar, IconButton, Paper, Typography, Button, Box } from '@mui/material';
import PalBox from './components/PalBox';
import PalStore from './components/PalStore';
import RecordVitalModal from './components/RecordVitalModal';
import { SHIRTS, BACKGROUNDS, HATS } from './data/cosmetics';
import { isVitalInNormalRange } from './utils/vitalThresholds';

const POINTS_PER_VITAL = 10;

const CONGRATULATING_MESSAGES = [
  "That's a great reading! You're taking such good care of us both!",
  "Nice! Your numbers look healthy. Keep it up!",
  "You're doing great — that's right in the healthy range!",
  "Awesome! Every reading you take keeps us both on track.",
  "You're the best! Thanks for looking after your health today.",
];

const REASSURING_MESSAGES = [
  "Thanks for checking in. If you're ever concerned, your care team is here to help.",
  "It's okay — tracking helps. Share this with your doctor so you can stay on top of things.",
  "You're doing the right thing by logging it. Keep following your care plan.",
  "Remember, one reading doesn't tell the whole story. Keep tracking and talk to your care team if needed.",
  "We're glad you're paying attention. Your care team can help you understand what's best for you.",
];

const CLICK_MESSAGES = [
  "Thanks For Taking Care of Me!",
  "You're the best! Thanks for looking after your health today.",
  "Awesome! Every reading you take keeps us both on track.",
  "You're the best! Thanks for looking after your health today.",
] 

function App() {
  const [points, setPoints] = useState(0);
  const [palMessage, setPalMessage] = useState(null);
  const [storeOpen, setStoreOpen] = useState(false);
  const [equippedShirtId, setEquippedShirtId] = useState('default');
  const [equippedBackgroundId, setEquippedBackgroundId] = useState('default');
  const [ownedShirtIds, setOwnedShirtIds] = useState(['default']);
  const [ownedBackgroundIds, setOwnedBackgroundIds] = useState(['default']);
  const [ownedHatIds, setOwnedHatIds] = useState(['none']);
  const [equippedHatId, setEquippedHatId] = useState('none');
  const [vitalModalOpen, setVitalModalOpen] = useState(false);
  const [vitalModalType, setVitalModalType] = useState(null);
  const [vitalReadings, setVitalReadings] = useState({
    bloodPressure: null,
    bloodOxygen: null,
    weight: null,
    heartRate: null,
  });

  const openVitalModal = useCallback((type) => {
    setVitalModalType(type);
    setVitalModalOpen(true);
  }, []);

  const closeVitalModal = useCallback(() => {
    setVitalModalOpen(false);
    setVitalModalType(null);
  }, []);

  const showVitalMessage = useCallback((readings, type) => {
    const inRange = isVitalInNormalRange(type, readings);
    const messages = inRange ? CONGRATULATING_MESSAGES : REASSURING_MESSAGES;
    const message = messages[Math.floor(Math.random() * messages.length)];
    setPalMessage(message);
    setTimeout(() => setPalMessage(null), 5000);
  }, []);

  const showRandomClickMessage = useCallback(() => {
    const message = CLICK_MESSAGES[Math.floor(Math.random() * CLICK_MESSAGES.length)];
    setPalMessage(message);
    setTimeout(() => setPalMessage(null), 5000);
  }, []);

  const handleVitalRecorded = useCallback((readings, type) => {
    setVitalReadings((prev) => ({ ...prev, [type]: readings }));
    setPoints((p) => p + POINTS_PER_VITAL);
    showVitalMessage(readings, type);
    closeVitalModal();
  }, [showVitalMessage, closeVitalModal]);

  const buyShirt = useCallback((id) => {
    const item = SHIRTS.find((s) => s.id === id);
    if (!item || item.cost === 0 || points < item.cost) return;
    setPoints(points - item.cost);
    setOwnedShirtIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setEquippedShirtId(id);
  }, [points]);

  const buyBackground = useCallback((id) => {
    const item = BACKGROUNDS.find((b) => b.id === id);
    if (!item || item.cost === 0 || points < item.cost) return;
    setPoints(points - item.cost);
    setOwnedBackgroundIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setEquippedBackgroundId(id);
  }, [points]);

  const equipShirt = useCallback((id) => {
    if (ownedShirtIds.includes(id)) setEquippedShirtId(id);
  }, [ownedShirtIds]);

  const equipBackground = useCallback((id) => {
    if (ownedBackgroundIds.includes(id)) setEquippedBackgroundId(id);
  }, [ownedBackgroundIds]);

  const buyHat = useCallback((id) => {
    const item = HATS.find((h) => h.id === id);
    if (!item || item.cost === 0 || points < item.cost) return;
    setPoints(points - item.cost);
    setOwnedHatIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setEquippedHatId(id);
  }, [points]);

  const equipHat = useCallback((id) => {
    if (ownedHatIds.includes(id)) setEquippedHatId(id);
  }, [ownedHatIds]);

  return (
    <div className="App">
      <Paper style={{ padding: '16px', minHeight: '100vh' }}>
        <AppBar position="static" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <IconButton edge="start" onClick={() => setStoreOpen(true)} aria-label="Pal Store" style={{ color: 'white' }}>
            <Typography variant="button">Pal Store</Typography>
          </IconButton>
          <Typography variant="h6">Points: {points}</Typography>
        </AppBar>

        <Typography variant="h4" gutterBottom style={{ marginTop: 16 }}>
          Welcome to My Health Pal
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Your pal has the same health conditions as you and is here to help you follow your care plan. Take your vitals to earn points and make your pal happy — then spend points in the store on cosmetics for your pal!
        </Typography>

        <Paper style={{ marginBottom: 24 }} key="Pal-box">
          <PalBox
            message={palMessage}
            equippedShirtId={equippedShirtId}
            equippedBackgroundId={equippedBackgroundId}
            equippedHatId={equippedHatId}
            vitalReadings={vitalReadings}
            onPalClick={showRandomClickMessage}
          />
        </Paper>

        <Typography variant="subtitle1" gutterBottom fontWeight="medium">
          Record your vitals (+{POINTS_PER_VITAL} points each)
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <Button variant="contained" color="primary" onClick={() => openVitalModal('bloodPressure')}>
            Blood Pressure
          </Button>
          <Button variant="contained" color="primary" onClick={() => openVitalModal('bloodOxygen')}>
            Blood Oxygen
          </Button>
          <Button variant="contained" color="primary" onClick={() => openVitalModal('weight')}>
            Weight
          </Button>
          <Button variant="contained" color="primary" onClick={() => openVitalModal('heartRate')}>
            Heart Rate
          </Button>
        </Box>
      </Paper>

      <RecordVitalModal
        open={vitalModalOpen}
        onClose={closeVitalModal}
        vitalType={vitalModalType}
        onSubmit={(readings) => handleVitalRecorded(readings, vitalModalType)}
      />

      <PalStore
        open={storeOpen}
        onClose={() => setStoreOpen(false)}
        points={points}
        ownedShirtIds={ownedShirtIds}
        ownedBackgroundIds={ownedBackgroundIds}
        ownedHatIds={ownedHatIds}
        equippedShirtId={equippedShirtId}
        equippedBackgroundId={equippedBackgroundId}
        equippedHatId={equippedHatId}
        onBuyShirt={buyShirt}
        onBuyBackground={buyBackground}
        onBuyHat={buyHat}
        onEquipShirt={equipShirt}
        onEquipBackground={equipBackground}
        onEquipHat={equipHat}
      />
    </div>
  );
}

export default App;
