/**
 * Standard vital thresholds (adult reference ranges).
 * Used to decide if a reading is in normal range for pal messages.
 */

export function isVitalInNormalRange(type, reading) {
  if (!reading) return false;

  switch (type) {
    case 'bloodPressure': {
      const { systolic, diastolic } = reading;
      // Normal: systolic 90-120, diastolic 60-80 (mmHg)
      return (
        systolic >= 90 && systolic <= 120 &&
        diastolic >= 60 && diastolic <= 80
      );
    }
    case 'bloodOxygen': {
      const spo2 = reading.spo2;
      // Normal SpO2: 95-100%
      return spo2 >= 95 && spo2 <= 100;
    }
    case 'weight': {
      const value = reading.value;
      const unit = reading.unit || 'kg';
      // Rough "reasonable" range: 30-200 kg, or 66-440 lbs
      if (unit === 'lbs') {
        return value >= 66 && value <= 440;
      }
      return value >= 30 && value <= 200;
    }
    case 'heartRate': {
      const bpm = reading.bpm;
      // Normal resting heart rate: 60-100 bpm
      return bpm >= 60 && bpm <= 100;
    }
    default:
      return false;
  }
}
