import { ToolFunction } from '../types';
import axios from 'axios';

export const getBeatSaverMaps: ToolFunction = {
  name: 'getBeatSaverMaps',
  description: `
Get Beat Saber maps from BeatSaver.com. 
Usually the user either wants the BSR (Beat Saber Song Request) code (which is "id") or the map link (which is "https://beatsaver.com/maps/{id}"). 
They may ask for other information as well.
'sortOrder' is either "Relevance" or "Latest". Use "Relevance" unless otherwise specified. Do not leave this undefined!
  `,
  parameters: {
    type: 'object',
    properties: {
      searchQuery: { type: 'string' },
      sortOrder: { type: 'string', enum: ['Relevance', 'Latest'] },
    },
    required: ['searchQuery', 'sortOrder'],
  },
  function: async ({ searchQuery, sortOrder }) => {
    // Ensure sortOrder is valid
    sortOrder =
      sortOrder &&
      ['relevance', 'latest'].includes(sortOrder.toLowerCase())
        ? sortOrder
        : 'Relevance';

    const url = `https://api.beatsaver.com/search/text/0?q=${encodeURIComponent(
      searchQuery
    )}&sortOrder=${sortOrder}`;

    try {
      const response = await axios.get(url, {
        headers: { 'User-Agent': 'YourBotName/1.0' },
        timeout: 60000,
      });
      return response.data;
    } catch (error) {
      console.error(error);
      return {
        error:
          'Failed to fetch Beat Saver data. Please ask the user to search themselves.',
      };
    }
  },
  functionInfo: ({ searchQuery, sortOrder }) => `Pencarian ${searchQuery} di Beat Saver`,
};
