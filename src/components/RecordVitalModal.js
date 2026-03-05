import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';

const VITAL_TYPES = {
  bloodPressure: { label: 'Blood Pressure', unit: 'mmHg' },
  bloodOxygen: { label: 'Blood Oxygen', unit: '%' },
  weight: { label: 'Weight', unit: null },
  heartRate: { label: 'Heart Rate', unit: 'bpm' },
};

function RecordVitalModal({ open, onClose, vitalType, onSubmit }) {
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [spo2, setSpo2] = useState('');
  const [weightValue, setWeightValue] = useState('');
  const [weightUnit, setWeightUnit] = useState('kg');
  const [bpm, setBpm] = useState('');

  useEffect(() => {
    if (!open) return;
    setSystolic('');
    setDiastolic('');
    setSpo2('');
    setWeightValue('');
    setWeightUnit('kg');
    setBpm('');
  }, [open, vitalType]);

  const handleSubmit = () => {
    if (vitalType === 'bloodPressure') {
      const s = parseInt(systolic, 10);
      const d = parseInt(diastolic, 10);
      if (isNaN(s) || isNaN(d) || s < 1 || d < 1) return;
      onSubmit({ systolic: s, diastolic: d });
    } else if (vitalType === 'bloodOxygen') {
      const val = parseInt(spo2, 10);
      if (isNaN(val) || val < 0 || val > 100) return;
      onSubmit({ spo2: val });
    } else if (vitalType === 'weight') {
      const val = parseFloat(weightValue);
      if (isNaN(val) || val <= 0) return;
      onSubmit({ value: val, unit: weightUnit });
    } else if (vitalType === 'heartRate') {
      const val = parseInt(bpm, 10);
      if (isNaN(val) || val < 1) return;
      onSubmit({ bpm: val });
    }
    onClose();
  };

  const config = vitalType ? VITAL_TYPES[vitalType] : null;
  const canSubmit = () => {
    if (vitalType === 'bloodPressure') return systolic && diastolic;
    if (vitalType === 'bloodOxygen') return spo2 !== '';
    if (vitalType === 'weight') return weightValue !== '';
    if (vitalType === 'heartRate') return bpm !== '';
    return false;
  };

  if (!config) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Record {config.label}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {vitalType === 'bloodPressure' && (
            <>
              <TextField
                label="Systolic"
                type="number"
                value={systolic}
                onChange={(e) => setSystolic(e.target.value)}
                inputProps={{ min: 1, max: 300 }}
                helperText="mmHg (top number)"
                fullWidth
              />
              <TextField
                label="Diastolic"
                type="number"
                value={diastolic}
                onChange={(e) => setDiastolic(e.target.value)}
                inputProps={{ min: 1, max: 200 }}
                helperText="mmHg (bottom number)"
                fullWidth
              />
            </>
          )}
          {vitalType === 'bloodOxygen' && (
            <TextField
              label="SpO₂"
              type="number"
              value={spo2}
              onChange={(e) => setSpo2(e.target.value)}
              inputProps={{ min: 0, max: 100 }}
              helperText="Percentage (0–100%)"
              fullWidth
            />
          )}
          {vitalType === 'weight' && (
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              <TextField
                label="Weight"
                type="number"
                value={weightValue}
                onChange={(e) => setWeightValue(e.target.value)}
                inputProps={{ min: 0.1, step: 0.1 }}
                fullWidth
              />
              <FormControl sx={{ minWidth: 80 }}>
                <InputLabel>Unit</InputLabel>
                <Select
                  value={weightUnit}
                  label="Unit"
                  onChange={(e) => setWeightUnit(e.target.value)}
                >
                  <MenuItem value="kg">kg</MenuItem>
                  <MenuItem value="lbs">lbs</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}
          {vitalType === 'heartRate' && (
            <TextField
              label="Heart rate"
              type="number"
              value={bpm}
              onChange={(e) => setBpm(e.target.value)}
              inputProps={{ min: 1, max: 300 }}
              helperText="Beats per minute"
              fullWidth
            />
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={!canSubmit()}>
          Save reading
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default RecordVitalModal;
export { VITAL_TYPES };
