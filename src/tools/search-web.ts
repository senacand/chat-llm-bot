import { ToolFunction } from '../types';
import { JSDOM } from 'jsdom';

interface NewsResult {
  date: string;
  title: string;
  snippet: string;
  url: string;
}

interface GeneralResult {
  title: string;
  url: string;
  snippet: string;
}

interface SearchWebResult {
  newsResult: NewsResult[];
  generalResult: GeneralResult[];
  error?: string;
}

const extractActualUrl = (redirectUrl: string): string => {
  try {
    if (redirectUrl.startsWith('//')) {
      redirectUrl = 'https:' + redirectUrl;
    }
    const urlObj = new URL(redirectUrl);
    const uddg = urlObj.searchParams.get('uddg');
    return uddg ? decodeURIComponent(uddg) : redirectUrl;
  } catch (error) {
    console.error('Error extracting actual URL:', error);
    return redirectUrl;
  }
};

export const searchWeb: ToolFunction = {
  name: 'searchWeb',
  description: `Perform search of the web.
Use this function when user asks for any information.
  
searchQuery instruction: 
searchQuery language should be relevant to the information that is being searched on and should ignore the user's language.
Example: 
- If user asks information about Japanese news, use Japanese language in the searchQuery.
    e.g. User asks "Anime Blue Archive kapan tayang?", search "ブルーアーカイブアニメ公開日"
- If user asks information relating to Indonesia, use Indonesian language in the searchQuery.
- Otherwise, search in English.
  
Make sure to respond still in the language that the user is speaking in!
  
After getting the results, you MUST use openWebPage on 2 urls, and conclude the information from those urls! However, do not use openWebPage on PDF links.`,
  parameters: {
    type: 'object',
    properties: {
      searchQuery: { type: 'string' },
    },
    required: ['searchQuery'],
  },
  function: async ({ searchQuery }) => {
    try {
      const encodedQuery = encodeURIComponent(searchQuery);
      const url = `https://html.duckduckgo.com/html/?q=${encodedQuery}`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.statusText}`);
      }
      
      const html = await response.text();
      const dom = new JSDOM(html);
      const document = dom.window.document;
      
      const generalResult: GeneralResult[] = [];
      const results = document.querySelectorAll('.result');
      
      interface ResultElement extends Element {
        querySelector(selector: string): Element | null;
      }
      
      interface TitleElement extends Element {
        textContent: string | null;
        getAttribute(name: string): string | null;
      }
      
      interface SnippetElement extends Element {
        textContent: string | null;
      }
      
      results.forEach((result: ResultElement) => {
        const titleElement: TitleElement | null = result.querySelector('.result__title a') as TitleElement | null;
        const snippetElement: SnippetElement | null = result.querySelector('.result__snippet') as SnippetElement | null;
        
        if (titleElement && snippetElement) {
          const title: string = titleElement.textContent?.trim() || 'No Title';
          const redirectUrl: string = titleElement.getAttribute('href') || '';
          const snippet: string = snippetElement.textContent?.trim() || 'No Snippet';
          const actualUrl: string = extractActualUrl(redirectUrl);
          
          if (actualUrl) {
            generalResult.push({ title, url: actualUrl, snippet });
          }
        }
      });
      
      return {
        newsResult: [],
        generalResult,
      } as SearchWebResult;
    } catch (error) {
      console.error('Error fetching DuckDuckGo search results:', error);
      return {
        newsResult: [],
        generalResult: [],
        error: 'Failed to perform search',
      };
    }
  },
  functionInfo: ({ searchQuery }) => `Web search untuk \`${searchQuery}\``,
};
