const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const catchAsync = require("./catchAsync");

const crypto = require("crypto");

const dotenv = require("dotenv");
dotenv.config();

const s3 = new S3Client({
  region: process.env.AWS_BUCKET_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

exports.putObject = async () => {
  const generateFileName = (bytes = 32) =>
    crypto.randomBytes(bytes).toString("hex");

  const filename = generateFileName();
  const putObjectComand = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: filename,
  });

  const signedURL = await getSignedUrl(s3, putObjectComand, {
    expiresIn: 60,
  });

  return { filename: filename, url: signedURL };
};

exports.printFunction = async () => "Hello";
