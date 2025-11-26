// Utility function to handle API rate limits with exponential backoff
export async function retryWithBackoff(fn, maxRetries = 3) {
  // Loop through retry attempts
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      // Check if it's a rate limit error (HTTP 429) and we have retries left
      if (error.status === 429 && attempt < maxRetries) {
        // Calculate exponential backoff delay: 2^attempt seconds, max 30 seconds
        const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
        console.log(`Rate limit hit. Retrying in ${delay / 1000} seconds...`);
        // Wait for the calculated delay before retrying
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue; // Go to next iteration (retry)
      }
      throw error; // If not rate limit or out of retries, throw the error
    }
  }
  throw new Error("Max retries exceeded");
}
