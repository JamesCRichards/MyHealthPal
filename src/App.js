import React, { useState, useCallback } from 'react';
import { AppBar, IconButton, Paper, Typography, Button } from '@mui/material';
import PalBox from './components/PalBox';
import PalStore from './components/PalStore';
import { SHIRTS, BACKGROUNDS } from './data/cosmetics';

const POINTS_PER_VITAL = 10;

const HAPPY_MESSAGES = [
  "Thanks for taking your vitals! You're taking such good care of us both!",
  "You did it! I'm so proud of you for sticking to your care plan.",
  "That really helps — I feel better when you check in. Thank you!",
  "Awesome! Every reading you take keeps us both on track.",
  "You're the best! Thanks for looking after your health today.",
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

  const showRandomMessage = useCallback(() => {
    const message = HAPPY_MESSAGES[Math.floor(Math.random() * HAPPY_MESSAGES.length)];
    setPalMessage(message);
    setTimeout(() => setPalMessage(null), 5000);
  }, []);

  const showRandomClickMessage = useCallback(() => {
    const message = CLICK_MESSAGES[Math.floor(Math.random() * CLICK_MESSAGES.length)];
    setPalMessage(message);
    setTimeout(() => setPalMessage(null), 5000);
  }, []);

  const takeVitals = useCallback(() => {
    setPoints((p) => p + POINTS_PER_VITAL);
    showRandomMessage();
  }, [showRandomMessage]);

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
            onPalClick={showRandomClickMessage}
          />
        </Paper>

        <Button variant="contained" color="primary" size="large" onClick={takeVitals}>
          Take Vitals (+{POINTS_PER_VITAL} points)
        </Button>
      </Paper>

      <PalStore
        open={storeOpen}
        onClose={() => setStoreOpen(false)}
        points={points}
        ownedShirtIds={ownedShirtIds}
        ownedBackgroundIds={ownedBackgroundIds}
        equippedShirtId={equippedShirtId}
        equippedBackgroundId={equippedBackgroundId}
        onBuyShirt={buyShirt}
        onBuyBackground={buyBackground}
        onEquipShirt={equipShirt}
        onEquipBackground={equipBackground}
      />
    </div>
  );
}

export default App;
