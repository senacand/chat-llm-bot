import { addMemory } from './add-memory';
import { getBeatSaverMaps } from './get-beat-saver-maps';
import { getKhodam } from './get-khodam';
import { getWeatherForecast } from './get-weather-forecast';
import { openWebPage } from './open-web-page';
import { searchWeb } from './search-web';
import { cekResi } from './cek-resi';

export const tools = [
  getBeatSaverMaps,
  getKhodam,
  getWeatherForecast,
  searchWeb,
  openWebPage,
  addMemory,
  cekResi,
];
