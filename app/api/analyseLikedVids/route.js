/**
 * Summary. This script retrieves hashtags from TikTok posts and compiles their occurrences.
 *
 * Description. This script takes a request containing a list of TikTok share-post URLs,
 * validates the request format, ensures the URLs have valid TikTok prefixes, and then processes
 * the URLs in batches to retrieve hashtags using an external utility function. The script then
 * compiles and returns a response containing the occurrences of hashtags.
 *
*/

import getHashtags from '../../../utils/lambdaHelper.js';
import checkKey from '@/utils/apiAuth.js';

const incorrectFormattingMessage = "Incorrect formatting of request: Request Body must have exactly one key 'urls' that maps to an array of strings";
const faultyContentMessage = "Urls aren't properly formatted: One or more urls in the request aren't a valid tiktok share-post link"
const unauthorizedAccessMessage = "You aren't allowed to use this :("

/**
 * Gets Hashtags from TikTok posts.
 *
 * @param {Request} request - The request body.
 * @returns {Response} A response indicating the outcome of the operation.
 */

export const PUT = async (request) => {
  try {
      const uuJson = await request.json();
      
      if(!checkKey(uuJson)) {
        return new Response(unauthorizedAccessMessage,{status:400})
      }

      //check that uuJson (user-uploaded json) is of correct format
      if (!validateFormatting(uuJson)) {
        return new Response(incorrectFormattingMessage,{status:400});
      }

      //check that each url prefix is a TIKTOK link
      if (!validateContent(uuJson)) {
        return new Response(faultyContentMessage,{status:400})
      }

      //equally divide request payload into 10 batches
      const batches = processBatch(uuJson);

      // Process batches concurrently and pool the results
      const results = await Promise.all(batches.map(batch => compileHashtags(batch)));

      const compiledResults = mapOccurences(results);

      return new Response(JSON.stringify(compiledResults),{status:200});
  } catch (error) {
      return new Response("Failed to get hashtags", { status: 500 });
  }
};

/**
 * Validates the formatting of the request.
 *
 * @param {Object} request - The request object.
 * @returns {boolean} Whether the formatting is valid or not.
 */
function validateFormatting(request) {
  const keys = Object.keys(request);
  if (keys.length !== 2 || keys[1] !== 'urls') {
    return false;
  }

  const urlsValue = request['urls'];
  if (!Array.isArray(urlsValue) || !urlsValue.every((url) => typeof url === 'string')) {
    return false;
  }

  return true;
}

/**
 * Validates that each URL has a valid TikTok prefix.
 *
 * @param {Object} request - The request object.
 * @returns {boolean} Whether all URLs have valid TikTok prefixes.
 */
function validateContent(request) {
  const tiktokPrefix = 'https://www.tiktokv.com/share/video/';
  return request['urls'].every((str) => str.startsWith(tiktokPrefix));

}

/**
 * Compiles hashtags from TikTok posts.
 *
 * @param {Object} request - The request object containing URLs.
 * @returns {Object} An object containing compiled hashtags data.
 * @throws {Error} If an error occurs during compilation.
 */
async function compileHashtags(request) {
  try {
    const result = await getHashtags(request);
    return result; // Return the result directly
  } catch (err) {
    console.error('Error in compileHashtags:', err);
    throw err; // Rethrow the error to be caught by the caller
  }
}

/**
 * Divides an array of URLs into batches of roughly equal size.
 *
 * @param {Object} request - The request object containing URLs.
 * @returns {Array} An array of objects, each containing a batch of URLs.
 */
function processBatch(request) {
  const { urls } = request; // Destructure the 'urls' array from the request object
  const batchSize = Math.ceil(urls.length / 10); // Calculate the size of each sub-array

  const subArrays = [];

  for (let i = 0; i < urls.length; i += batchSize) {
    const subArray = urls.slice(i, i + batchSize);
    subArrays.push({ urls: subArray });
  }

  return subArrays;
}

function mapOccurences(data) {
  const hashtagCounts = new Map();
  const creatorCounts = new Map();

  // Loop through each object in the data array
  for (const entry of data) {
    // Count hashtags
    for (const hashtag of entry.hashtags) {
      if (hashtagCounts.has(hashtag)) {
        hashtagCounts.set(hashtag, hashtagCounts.get(hashtag) + 1);
      } else {
        hashtagCounts.set(hashtag, 1);
      }
    }

    // Count creators
    for (const creator of entry.creators) {
      if (creatorCounts.has(creator)) {
        creatorCounts.set(creator, creatorCounts.get(creator) + 1);
      } else {
        creatorCounts.set(creator, 1);
      }
    }
  }

  // Convert maps to arrays of objects for sorting
  const sortedHashtags = Array.from(hashtagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) => ({ tag, count }));

  const sortedCreators = Array.from(creatorCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([creator, count]) => ({ creator, count }));

  // Return the top 5 hashtags and creators
  const top5Hashtags = sortedHashtags.slice(0, 5);
  const top5Creators = sortedCreators.slice(0, 5);

  return [top5Hashtags, top5Creators];
}