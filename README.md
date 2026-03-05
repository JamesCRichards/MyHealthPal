# MyHealthPal

Virtual health companion — **Health Pal** for patients.

## Features

- **Health Pal** conversational agent (opened via "Talk to Health Pal" button), powered by **real AI chat** when an API key is set (see below).
- **Medication reminders** on the home screen for an example patient (Jane Doe, 68) with diabetes, congestive heart failure, and hypertension.

## Run the app

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start the API server** (for the Health Pal chat):
   ```bash
   npm run server
   ```
   Server runs at `http://localhost:3001`.

3. **Start the React app** (in another terminal):
   ```bash
   npm start
   ```
   App runs at `http://localhost:3000`.

4. **Full AI chat** (so Pal answers any question, not just programmed replies):  
   Add one of these to `.env` and restart the server:
   - **Groq (free, no card):** Get a key at [console.groq.com](https://console.groq.com) → API Keys, then set `GROQ_API_KEY=gsk_...`
   - **OpenAI:** [platform.openai.com/api-keys](https://platform.openai.com/api-keys) → `OPENAI_API_KEY=sk-...`
   - **OpenRouter (free tier):** [openrouter.ai/keys](https://openrouter.ai/keys) → `OPENROUTER_API_KEY=...`  
   Set `REACT_APP_API_URL=http://localhost:3001` so the frontend calls the server.

## Example patient

- **Jane Doe**, 68  
- Conditions: Type 2 Diabetes, Congestive Heart Failure, Hypertension  
- Example medications: Metformin, Lisinopril, Furosemide, Carvedilol, Aspirin (see `src/data/patientProfile.js`).