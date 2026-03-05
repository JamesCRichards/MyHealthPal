# MyHealthPal

Virtual health companion — **Health Pal** for patients.

## Features

- **Health Pal** conversational agent (opened via "Talk to Health Pal" button), powered by the Cursor API with a built-in fallback.
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
   Server runs at `http://localhost:3001`. Uses the Cursor API key from `.env` if set; otherwise uses the built-in fallback replies.

3. **Start the React app** (in another terminal):
   ```bash
   npm start
   ```
   App runs at `http://localhost:3000`.

4. Copy `.env.example` to `.env` and set `CURSOR_API_KEY` if you want to use the Cursor API. `REACT_APP_API_URL=http://localhost:3001` is set so the frontend calls the server.

## Example patient

- **Jane Doe**, 68  
- Conditions: Type 2 Diabetes, Congestive Heart Failure, Hypertension  
- Example medications: Metformin, Lisinopril, Furosemide, Carvedilol, Aspirin (see `src/data/patientProfile.js`).

PAL!