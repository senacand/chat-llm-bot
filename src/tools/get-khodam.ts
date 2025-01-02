import { ToolFunction } from '../types';

export const getKhodam: ToolFunction = {
  name: 'getKhodam',
  description: `
Get the name of the khodam the specified user. Khodam in Indonesian beliefs is helper spirit and each person has one.
This function will tell the user's khodam name.
This is a "just for fun" function and serve purely as a joke.
You need to provide the userId (NOT DISPLAY NAME OR GLOBAL NAME) of the requested user. Note that userId contains number only.
A user's khodam changes every Monday 00:00 WIB (GMT+7).
  `,
  parameters: {
    type: 'object',
    properties: {
      userId: { type: 'string' },
    },
    required: ['userId'],
  },
  function: async ({ userId }) => {
    const a = ["Kucing", "Tikus", "Kadal", "Kuda Nil", "Bunglon", "Siput", "Koala", "Kodok", "Monyet", "Anjing", "Harimau", "Kuda", "Komodo", "Gajah", "Cicak", "Ular", "Kura-kura", "Lele", "Laba-laba", "Singa", "Zebra", "Bebek", "Ayam", "Buaya", "Gorila", "Naga", "Naga", "Ikan", "Ubu-ubur", "Cacing", "Semut", "Udang", "Musang", "Kecoak", "Kupu-kupu", "Laba-laba"];
    const b = ["Jawa", "Depresi", "Mekanik", "Metal", "Insom", "Skizo", "Klepto", "Bunting", "Birahi", "Sigma", "Raksasa", "Berkaki Seribu", "Skizo", "Sad boy", "Mewing", "Gyatt", "Yapper", "Yapper", "Skizo", "Ambis", "Sigma", "Dribble", "Dribble", "Jawa", "Sigma", "Ngesot", "Sunda", "Kalimantan", "Kutub", "Sumatera", "Sunda", "Sumatera", "Sunda", "Yapper", "Ngesot", "Ambis"];
    
    const now = new Date();
    const gmt7Offset = 7 * 60;
    const gmt7Time = new Date(now.getTime() + (gmt7Offset - now.getTimezoneOffset()) * 60 * 1000);

    // Get the Monday of the current week (GMT+7)
    const monday = new Date(gmt7Time);
    monday.setDate(monday.getDate() - monday.getDay() + 1); // 1 = Monday
    monday.setHours(0, 0, 0, 0);
    const dateString = monday.toISOString().split('T')[0];

    function hashString(str: string): number {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = Math.imul(31, hash) + str.charCodeAt(i);
      }
      return hash;
    }

    const seed1 = hashString(userId + dateString);
    const seed2 = hashString(userId + dateString + "salt");
    const indexA = Math.abs(seed1) % a.length;
    const indexB = Math.abs(seed2) % b.length;

    return {
      userId,
      khodamWeek: dateString,
      khodam: `${a[indexA]} ${b[indexB]}`,
    }
    return `${userId}'s Khodam is ${a[indexA]} ${b[indexB]}`;
  },
  functionInfo: ({ userId }) => `Membaca khodam <@${userId}>`,
};
