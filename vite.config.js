import { defineConfig } from 'vite';

export default defineConfig({
  // Il sito su GitHub Pages non sta alla radice del dominio ma dentro una
  // sottocartella con il nome del progetto. Senza questa riga, una volta
  // pubblicato cercherebbe i file nel posto sbagliato e resterebbe bianco.
  base: '/dog-gaze/',
});
