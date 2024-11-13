import { ToolFunction } from '../types';
import axios from 'axios';

export const openWebPage: ToolFunction = {
  name: 'openWebPage',
  description: `
Opens a web page (URL) and capture the content of the page (the page response). 
Use this if you need to get the content of a URL.
  `,
  parameters: {
    type: 'object',
    properties: {
      url: { type: 'string' },
    },
    required: ['url'],
  },
  function: async ({ url }) => {
    // Replace Twitter URLs to fxtwitter
    url = url.replace(/^(https?:\/\/)?(www\.)?(twitter|x)\.com/, 'https://fxtwitter.com');
    
    try {
      const response = await axios.get(url, { 
        responseType: "document",
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 11.6; rv:92.0) Gecko/20100101 Firefox/92.0"
        }
      });
      return response.data.substring(0, 100000);
    } catch (error) {
      console.error(error);
      return {
        error: "Unable to open web page"
      };
    }
  },
  functionInfo: ({ url }) => `<${url}>`,
};