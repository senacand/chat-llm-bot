import { ToolFunction } from '../types';
import { saveMemory } from '../utils/memory';

export const addMemory: ToolFunction = {
    name: 'addMemory',
    description: `Adds an information to your memory that may be useful to identify a user's preference, interest, location, etc.
Always use the userId to identify the user in the memory instead of their display name!
Write the userId in the <@userId> format, e.g. <@1234567890>.
Example:
- User tells you they are from Jakarta, you can store that information: "<@userId> lives in Jakarta"
- User tells you they like cats, you can store that information: "<@userId> likes cats"
- User tells you their YouTube channel, you can store that information: "<@userId> has a YouTube channel: youtube.com/yourchannel"
`,
    parameters: {
        type: 'object',
        properties: {
            channelId: { type: 'string' },
            content: { type: 'string' },
        },
        required: ['channelId', 'content'],
    },
    function: async ({ channelId, content }) => {
        return await saveMemory(channelId, content);
    },
    functionInfo: ({ channelId, content }) => `Mengingat ${content}`,
};
