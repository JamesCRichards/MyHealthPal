import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  Typography,
  Box,
  Card,
  CardContent,
  CardActions,
  Tabs,
  Tab,
} from '@mui/material';
import { SHIRTS, BACKGROUNDS, HATS } from '../data/cosmetics';

function PalStore({
  open,
  onClose,
  points,
  ownedShirtIds,
  ownedBackgroundIds,
  ownedHatIds,
  equippedShirtId,
  equippedBackgroundId,
  equippedHatId,
  onBuyShirt,
  onBuyBackground,
  onBuyHat,
  onEquipShirt,
  onEquipBackground,
  onEquipHat,
}) {
  const [tab, setTab] = React.useState(0);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Pal Store</Typography>
          <Typography color="primary" fontWeight="bold">
            {points} care pts
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab label="Shirts" />
          <Tab label="Hats" />
          <Tab label="Backgrounds" />
        </Tabs>

        {tab === 0 && (
          <Box display="flex" flexDirection="column" gap={2}>
            {SHIRTS.map((item) => {
              const owned = item.cost === 0 || ownedShirtIds.includes(item.id);
              const equipped = equippedShirtId === item.id;
              const canBuy = !owned && points >= item.cost;

              return (
                <Card key={item.id} variant="outlined">
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 1,
                          backgroundColor: item.color,
                          border: '2px solid #ccc',
                        }}
                      />
                      <Box flex={1}>
                        <Typography fontWeight="medium">{item.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {owned ? (equipped ? 'Equipped' : 'Owned') : `${item.cost} points`}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                  <CardActions>
                    {!owned && (
                      <Button
                        size="small"
                        color="primary"
                        disabled={!canBuy}
                        onClick={() => onBuyShirt(item.id)}
                      >
                        Buy ({item.cost} pts)
                      </Button>
                    )}
                    {owned && !equipped && (
                      <Button size="small" onClick={() => onEquipShirt(item.id)}>
                        Equip
                      </Button>
                    )}
                    {equipped && (
                      <Typography variant="body2" color="primary">
                        ✓ Equipped
                      </Typography>
                    )}
                  </CardActions>
                </Card>
              );
            })}
          </Box>
        )}

        {tab === 1 && (
          <Box display="flex" flexDirection="column" gap={2}>
            {HATS.map((item) => {
              const owned = item.cost === 0 || ownedHatIds.includes(item.id);
              const equipped = equippedHatId === item.id;
              const canBuy = !owned && points >= item.cost;

              return (
                <Card key={item.id} variant="outlined">
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Box
                        sx={{
                          width: 48,
                          height: 32,
                          borderRadius: 1,
                          backgroundColor: item.color || '#e0e0e0',
                          border: '2px solid #ccc',
                        }}
                      />
                      <Box flex={1}>
                        <Typography fontWeight="medium">{item.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {owned ? (equipped ? 'Equipped' : 'Owned') : `${item.cost} points`}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                  <CardActions>
                    {!owned && (
                      <Button
                        size="small"
                        color="primary"
                        disabled={!canBuy}
                        onClick={() => onBuyHat(item.id)}
                      >
                        Buy ({item.cost} pts)
                      </Button>
                    )}
                    {owned && !equipped && (
                      <Button size="small" onClick={() => onEquipHat(item.id)}>
                        Equip
                      </Button>
                    )}
                    {equipped && (
                      <Typography variant="body2" color="primary">
                        ✓ Equipped
                      </Typography>
                    )}
                  </CardActions>
                </Card>
              );
            })}
          </Box>
        )}

        {tab === 2 && (
          <Box display="flex" flexDirection="column" gap={2}>
            {BACKGROUNDS.map((item) => {
              const owned = item.cost === 0 || ownedBackgroundIds.includes(item.id);
              const equipped = equippedBackgroundId === item.id;
              const canBuy = !owned && points >= item.cost;

              return (
                <Card key={item.id} variant="outlined">
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 1,
                          background: `linear-gradient(180deg, ${item.color} 0%, ${item.accent} 100%)`,
                          border: '2px solid #ccc',
                        }}
                      />
                      <Box flex={1}>
                        <Typography fontWeight="medium">{item.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {owned ? (equipped ? 'Equipped' : 'Owned') : `${item.cost} points`}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                  <CardActions>
                    {!owned && (
                      <Button
                        size="small"
                        color="primary"
                        disabled={!canBuy}
                        onClick={() => onBuyBackground(item.id)}
                      >
                        Buy ({item.cost} pts)
                      </Button>
                    )}
                    {owned && !equipped && (
                      <Button size="small" onClick={() => onEquipBackground(item.id)}>
                        Equip
                      </Button>
                    )}
                    {equipped && (
                      <Typography variant="body2" color="primary">
                        ✓ Equipped
                      </Typography>
                    )}
                  </CardActions>
                </Card>
              );
            })}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default PalStore;
