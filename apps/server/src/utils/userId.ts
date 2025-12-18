export const stringToNumericUserId = (userId: string): number => {
  if (!userId || typeof userId !== "string") {
    throw new Error(`Invalid userId: ${userId}`);
  }

  const numericId = parseInt(userId, 10);
  if (!isNaN(numericId) && numericId.toString() === userId) {
    return numericId;
  }

  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }

  return Math.abs(hash) || 1;
};
