/**
 * Example patient profile for Health Pal.
 * Used to generate personalized medication reminders and conversation context.
 */
export const PATIENT_PROFILE = {
  name: 'Jane Doe',
  age: 68,
  conditions: [
    'Type 2 Diabetes',
    'Congestive Heart Failure',
    'Hypertension',
  ],
  medications: [
    { name: 'Metformin', dose: '500 mg', frequency: 'Twice daily', when: 'With breakfast and dinner', condition: 'Type 2 Diabetes' },
    { name: 'Lisinopril', dose: '10 mg', frequency: 'Once daily', when: 'In the morning', condition: 'Hypertension' },
    { name: 'Furosemide', dose: '40 mg', frequency: 'Once daily', when: 'In the morning', condition: 'Congestive Heart Failure' },
    { name: 'Carvedilol', dose: '6.25 mg', frequency: 'Twice daily', when: 'Morning and evening', condition: 'Congestive Heart Failure' },
    { name: 'Aspirin', dose: '81 mg', frequency: 'Once daily', when: 'With breakfast', condition: 'Heart health' },
  ],
};

/**
 * Get a short summary for the AI context.
 */
export function getPatientContextSummary() {
  const { name, age, conditions, medications } = PATIENT_PROFILE;
  return `${name}, ${age} years old. Conditions: ${conditions.join(', ')}. Current medications: ${medications.map(m => `${m.name} ${m.dose} (${m.frequency}, ${m.when})`).join('; ')}.`;
}
