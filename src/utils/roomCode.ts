/**
 * Generates a unique room code following the pattern: ST-XXXX-YYYY
 * Example: ST-HNS-7K42P
 */
export function generateRoomCode(prefix = 'ST'): string {
  const adjectives = [
    'HNS', 'LRN', 'EDU', 'CLS', 'TCR', 'STD', 'TCH', 'MNT', 'MSC', 'PHD',
    'MAG', 'SCI', 'MAT', 'ENG', 'HIS', 'GEO', 'BIO', 'CHM', 'PHY', 'CMP'
  ];

  const randomPart = () => {
    let result = '';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    for (let i = 0; i < 5; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const segmentA = randomPart();

  return `${prefix}-${adjective}-${segmentA}`;
}

/**
 * Validates a room code format
 */
export function isValidRoomCode(code: string): boolean {
  const regex = /^ST-[A-Z0-9]{3}-[A-Z0-9]{5}$/;
  return regex.test(code);
}

/**
 * Parses a room code into its components
 */
export function parseRoomCode(code: string): {
  prefix: string;
  segment: string;
  suffix: string;
} | null {
  const regex = /^ST-([A-Z0-9]{3})-([A-Z0-9]{5})$/;
  const match = regex.exec(code);
  if (!match) return null;
  return {
    prefix: 'ST',
    segment: match[1],
    suffix: match[2]
  };
}