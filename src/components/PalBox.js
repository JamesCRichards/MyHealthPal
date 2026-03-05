import React, { useState } from 'react';
import { Paper, Typography, Button } from '@mui/material';
import { SHIRTS, BACKGROUNDS, HATS } from '../data/cosmetics';
import HealthPal from './HealthPal';
import './PalBox.css';

function getShirt(id) {
  return SHIRTS.find((s) => s.id === id) || SHIRTS[0];
}

function getBackground(id) {
  return BACKGROUNDS.find((b) => b.id === id) || BACKGROUNDS[0];
}

function getHat(id) {
  return HATS.find((h) => h.id === id) || HATS[0];
}

function formatVitalReading(type, data) {
  if (!data) return '—';
  switch (type) {
    case 'bloodPressure':
      return `${data.systolic}/${data.diastolic} mmHg`;
    case 'bloodOxygen':
      return `${data.spo2}%`;
    case 'weight':
      return `${data.value} ${data.unit}`;
    case 'heartRate':
      return `${data.bpm} bpm`;
    default:
      return '—';
  }
}

function PalBox({
  message,
  equippedShirtId = 'default',
  equippedBackgroundId = 'default',
  equippedHatId = 'none',
  vitalReadings = {},
  onPalClick,
  carePoints = 0,
  onCarePointsChange,
  onPalMessage,
  onOpenStore,
}) {
  const [healthPalOpen, setHealthPalOpen] = useState(false);
  const shirt = getShirt(equippedShirtId);
  const bg = getBackground(equippedBackgroundId);
  const hat = getHat(equippedHatId);

  const vitals = [
    { label: 'Blood pressure', key: 'bloodPressure' },
    { label: 'Blood oxygen', key: 'bloodOxygen' },
    { label: 'Weight', key: 'weight' },
    { label: 'Heart rate', key: 'heartRate' },
  ];

  return (
    <Paper
      className="pal-box"
      elevation={2}
      style={{
        background: `linear-gradient(180deg, ${bg.color} 0%, ${bg.accent} 100%)`,
      }}
    >
      <div className="pal-box-top-right">
        {onOpenStore && (
          <Button
            className="pal-box-store-btn"
            variant="outlined"
            size="small"
            onClick={onOpenStore}
            aria-label="Open Pal Store"
          >
            Pal Store
          </Button>
        )}
        <div className="pal-box-points" aria-live="polite">
          <span className="pal-box-points-value">{carePoints}</span>
          <span className="pal-box-points-label">points</span>
        </div>
      </div>

      {message && (
        <div className="pal-speech-bubble">
          <Typography variant="body1" className="pal-speech-text">
            {message}
          </Typography>
        </div>
      )}
      <div className="pal-vitals-record">
        <Typography variant="subtitle2" className="pal-vitals-title">Your vitals</Typography>
        <ul className="pal-vitals-list">
          {vitals.map(({ label, key }) => (
            <li key={key}>
              <span className="pal-vitals-label">{label}:</span>{' '}
              <span className="pal-vitals-value">{formatVitalReading(key, vitalReadings[key])}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="pal-box-content">
      <div
        className="pal-character"
        role="button"
        tabIndex={0}
        onClick={onPalClick}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onPalClick(); }}
        aria-label="Click to hear your pal say something"
      >
        {hat.color && (
          <div
            className={`pal-hat pal-hat--${equippedHatId}`}
            style={{ backgroundColor: hat.color }}
          />
        )}
        <div className="pal-head">
          <div className="pal-face">
            <div className="pal-eyes">
              <span className="pal-eye" />
              <span className="pal-eye" />
            </div>
            <div className="pal-smile" />
          </div>
        </div>
        <div
          className={`pal-body pal-shirt pal-shirt--${shirt.pattern || 'solid'}`}
          style={{ backgroundColor: shirt.color }}
        >
          {shirt.pattern === 'stripes' && (
            <div className="pal-shirt-stripes">
              {[1, 2, 3, 4].map((i) => (
                <span key={i} className="pal-stripe" />
              ))}
            </div>
          )}
          {shirt.pattern === 'polka' && (
            <div className="pal-shirt-polka">
              {[1, 2, 3, 4, 5].map((i) => (
                <span key={i} className="pal-dot" />
              ))}
            </div>
          )}
        </div>
      </div>
      </div>

      <div className="pal-box-talk-btn-wrap">
        <Button
          className="pal-box-talk-btn"
          variant="contained"
          color="primary"
          size="small"
onClick={() => setHealthPalOpen((prev) => !prev)}
        aria-label={healthPalOpen ? 'Close Health Pal' : 'Talk to Health Pal'}
      >
        {healthPalOpen ? 'Close Health Pal' : 'Talk to Health Pal'}
        </Button>
      </div>

      <HealthPal
        carePoints={carePoints}
        onCarePointsChange={onCarePointsChange}
        onPalMessage={onPalMessage}
        open={healthPalOpen}
        onOpenChange={setHealthPalOpen}
        hidePoints
        hideToggleButton
      />
    </Paper>
  );
}

export default PalBox;
