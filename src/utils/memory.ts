import fs from 'fs/promises';
import path from 'path';

export async function saveMemory(channelId: string, content: string) {
  const memoriesDir = path.join(__dirname, '../output/memories');
  const filePath = path.join(memoriesDir, `${channelId}.txt`);
  
  try {
    // Create directories if they don't exist
    await fs.mkdir(memoriesDir, { recursive: true });
    
    // Read existing content
    let existingContent = '';
    try {
      existingContent = await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      // File doesn't exist yet, ignore error
    }
    
    // Split into lines and keep only last 29 lines if needed
    let lines = existingContent.split('\n').filter(line => line.trim());
    if (lines.length >= 30) {
      lines = lines.slice(-29);
    }
    
    // Add new memory with timestamp
    const time = new Date().toLocaleString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Bangkok',
    });
    const memoryLine = `[${time}] ${content}`;
    lines.push(memoryLine);
    
    // Write back to file
    await fs.writeFile(filePath, lines.join('\n') + '\n', 'utf-8');
    
    return {
      success: true,
      message: 'Memory saved successfully',
    };
  } catch (error) {
    console.error('Error saving memory:', error);
    return {
      success: false,
      error: 'Failed to save memory',
    };
  }
}

export async function getMemory(channelId: string): Promise<string> {
  const memoriesDir = path.join(__dirname, '../output/memories');
  const filePath = path.join(memoriesDir, `${channelId}.txt`);
  
  try {
    const exists = await fs.access(filePath)
    .then(() => true)
    .catch(() => false);
    
    if (!exists) {
      return '';
    }
    
    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  } catch (error) {
    console.error('Error reading memory:', error);
    return '';
  }
}