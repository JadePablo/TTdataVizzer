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

      //call lambda function(s)
      const batches = processBatch(uuJson);

      // Process batches concurrently and pool the results
      const results = await Promise.all(batches.map(batch => compileHashtags(batch)));

      const hashtagOccurences = mapOccurences(results);

      return new Response(JSON.stringify(hashtagOccurences),{status:200});
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

/**
 * Maps the occurrences of hashtags from the provided data.
 *
 * @param {Array} hashtagsData - An array of objects containing hashtags data.
 * @returns {Object} An object mapping hashtags to their occurrence counts.
 */
function mapOccurences(hashtagsData) {

  try {
    const hashtagOccurrences = {};

    hashtagsData.forEach(batch => {
      const batchHashtags = batch.hashtags;

      batchHashtags.forEach(hashtag => {
        if (hashtagOccurrences[hashtag]) {
          hashtagOccurrences[hashtag] += 1; // Increment occurrence count
        } else {
          hashtagOccurrences[hashtag] = 1; // Initialize occurrence count
        }
      });
    });

    return hashtagOccurrences;
  } catch (err) {
    console.error('Error in mapOccurences:', err);
    throw err; // Rethrow the error to be caught by the caller
  }
}