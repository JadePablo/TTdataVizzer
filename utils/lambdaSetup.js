import AWS from 'aws-sdk';

AWS.config.update({ region: 'us-east-2' }); // Replace with your AWS region

const lambda = new AWS.Lambda();

export default lambda;