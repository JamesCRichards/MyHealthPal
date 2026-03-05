const PATIENT_PROFILE = {
  name: 'Jane Doe',
  age: 68,
  conditions: ['Type 2 Diabetes', 'Congestive Heart Failure', 'Hypertension'],
  medications: [
    { name: 'Metformin', dose: '500 mg', frequency: 'Twice daily', when: 'With breakfast and dinner', condition: 'Type 2 Diabetes' },
    { name: 'Lisinopril', dose: '10 mg', frequency: 'Once daily', when: 'In the morning', condition: 'Hypertension' },
    { name: 'Furosemide', dose: '40 mg', frequency: 'Once daily', when: 'In the morning', condition: 'Congestive Heart Failure' },
    { name: 'Carvedilol', dose: '6.25 mg', frequency: 'Twice daily', when: 'Morning and evening', condition: 'Congestive Heart Failure' },
    { name: 'Aspirin', dose: '81 mg', frequency: 'Once daily', when: 'With breakfast', condition: 'Heart health' },
  ],
  carePlans: [
    { condition: 'Type 2 Diabetes', goals: ['Keep blood sugar in target range', 'Take Metformin with meals', 'Monitor glucose as advised'], notes: 'Diet and activity make a big difference.' },
    { condition: 'Congestive Heart Failure', goals: ['Take diuretic and beta-blocker as prescribed', 'Limit fluid and salt', 'Weigh daily', 'Report weight gain or shortness of breath'], notes: 'Consistency with meds and fluid restriction is key.' },
    { condition: 'Hypertension', goals: ['Take Lisinopril daily', 'Check blood pressure at home', 'Limit sodium'], notes: 'Same-time dosing helps.' },
  ],
  recommendations: [
    'Drink water throughout the day but watch total fluid if on diuretic.',
    'Walk or move when you can—even a little helps.',
    'Raise legs a few times daily to reduce swelling.',
    'Weigh yourself at the same time each morning.',
    'Limit salt and processed foods.',
    'Take medications at the same time each day.',
    'Report new or worse swelling, shortness of breath, or dizziness to your care team.',
  ],
  schedules: [
    { id: 'med-morning', title: 'Morning medications', time: 'With breakfast', frequency: 'Daily', type: 'medication', medicationNames: ['Lisinopril', 'Furosemide', 'Aspirin'] },
    { id: 'med-evening', title: 'Evening medications', time: 'With dinner', frequency: 'Daily', type: 'medication', medicationNames: ['Metformin', 'Carvedilol'] },
    { id: 'water', title: 'Drink water', time: 'Throughout the day', frequency: 'Daily', type: 'water' },
    { id: 'walking', title: 'Walk outside', time: 'When you can', frequency: 'Daily', type: 'walking' },
    { id: 'legs', title: 'Raise your legs', time: 'A few times daily', frequency: 'Daily', type: 'legs' },
    { id: 'mood', title: 'How you feel', time: 'Anytime', frequency: 'Daily', type: 'mood' },
    { id: 'sleep', title: 'Sleep check', time: 'Morning', frequency: 'Daily', type: 'sleep' },
  ],
};

function getPatientContextSummary() {
  const { name, age, conditions, medications } = PATIENT_PROFILE;
  return `${name}, ${age} years old. Conditions: ${conditions.join(', ')}. Current medications: ${medications.map((m) => `${m.name} ${m.dose} (${m.frequency}, ${m.when})`).join('; ')}.`;
}

function getTodaysReminders() {
  const now = new Date();
  const hour = now.getHours();
  return [
    { id: 'rem-water', title: 'Drink water', time: 'Throughout the day', completed: hour >= 12 },
    { id: 'rem-walking', title: 'Walk outside', time: 'When you can', completed: hour >= 10 },
    { id: 'rem-legs', title: 'Raise your legs', time: 'A few times daily', completed: hour >= 14 },
  ];
}

module.exports = { getPatientContextSummary, getTodaysReminders, PATIENT_PROFILE };
