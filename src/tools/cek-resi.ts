import { config } from '../config';
import { ToolFunction } from '../types';
import axios from 'axios';

const validCouriers = [
  'jne',
  'pos',
  'jnt',
  'sicepat',
  'tiki',
  'anteraja',
  'wahana',
  'ninja',
  'lion',
  'jet',
  'rex',
  'spx',
  'lex',
  'kurir_tokopedia',
];

export const cekResi: ToolFunction = {
  name: 'cekResi',
  description: `
Get delivery package tracking information.
Ask the user which courier they're using first if not specified! DO NOT MAKE ASSUMPTIONS.
Available couriers: ${validCouriers.join(', ')}
pos => Pos Indonesia, jet => Jet Express, spx => Shopee Express, lex => Lazada Express, kurir_tokopedia => Kurir Rekomendasi Tokopedia
`,
  parameters: {
    type: 'object',
    properties: {
      courier: { 
        type: 'string',
        enum: validCouriers,
      },
      awb: { type: 'string' },
    },
    required: ['courier', 'awb'],
  },
  function: async ({ courier, awb }) => {
    if (!config.binderbyteApiKey) {
      return {
        error: 'BinderByte API key is not setup.',
      };
    }

    try {
      const response = await axios.get(
        'https://api.binderbyte.com/v1/track?' +
          new URLSearchParams({
            api_key: config.binderbyteApiKey ?? '',
            courier: courier.toLowerCase(),
            awb,
          }),
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error(error);
      return {
        error: 'Failed to fetch package information. The tracking number might be invalid or the courier service is incorrect.',
      };
    }
  },
  functionInfo: ({ courier, awb }) => `Mengecek resi ${awb} untuk kurir ${courier.toUpperCase()}`,
}; 