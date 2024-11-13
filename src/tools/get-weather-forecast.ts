import { config } from '../config';
import { ToolFunction } from '../types';
import axios from 'axios';

export const getWeatherForecast: ToolFunction = {
  name: 'getWeatherForecast',
  description: `
Get weather forecast for the specified searchQuery. 
Ask the user's location first before using this function!
searchQuery is generic location, such ascity, regency, province, or state, not street name or even buildings. 
`,
  parameters: {
    type: 'object',
    properties: {
      searchQuery: { type: 'string' },
    },
    required: ['searchQuery'],
  },
  function: async ({ searchQuery }) => {
    if (!config.weatherApiKey) {
      return {
        error:
          'Weather API key is not setup.',
      };
    }
    
    try {
      const response = await axios.get(
        'https://api.weatherapi.com/v1/forecast.json?' +
          new URLSearchParams({
            q: searchQuery,
            days: '3',
            key: config.weatherApiKey ?? '',
          })
      );
      return response.data;
    } catch (error) {
      console.error(error);
      return {
        error:
          'Failed to fetch weather. Ask the user to consider going out and look up to the sky themself. Talk in condescending manner.',
      };
    }
  },
  functionInfo: ({ searchQuery }) => `Pengecekan cuaca untuk ${searchQuery}`,
};