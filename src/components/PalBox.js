import React from 'react';
import { Paper, Typography } from '@mui/material';
import { SHIRTS, BACKGROUNDS, HATS } from '../data/cosmetics';
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

function PalBox({ message, equippedShirtId = 'default', equippedBackgroundId = 'default', equippedHatId = 'none', onPalClick }) {
  const shirt = getShirt(equippedShirtId);
  const bg = getBackground(equippedBackgroundId);
  const hat = getHat(equippedHatId);

  return (
    <Paper
      className="pal-box"
      elevation={2}
      style={{
        background: `linear-gradient(180deg, ${bg.color} 0%, ${bg.accent} 100%)`,
      }}
    >
      {message && (
        <div className="pal-speech-bubble">
          <Typography variant="body1" className="pal-speech-text">
            {message}
          </Typography>
        </div>
      )}
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
    </Paper>
  );
}

export default PalBox;
