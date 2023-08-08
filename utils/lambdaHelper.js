import lambda from './lambdaSetup.js';

async function getHashtags(urls) {
  const params = {
    FunctionName: process.env.FUNCTION_NAME,
    InvocationType: process.env.INVOCATION_TYPE,
    Payload: JSON.stringify(urls),
  };

  return new Promise((resolve, reject) => {
    lambda.invoke(params, (err, data) => {
      if (err) {
        reject(err); // Reject the promise with the error
      } else {
        const result = JSON.parse(data.Payload);
        resolve(result); // Resolve the promise with the result
      }
    });
  });
}

export default getHashtags;
