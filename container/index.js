import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import fs from "node:fs/promises";
import path from "node:path";
import ffmpeg from "fluent-ffmpeg";
import fsold from 'fs'
import dotenv from 'dotenv'

dotenv.config();

const s3Client = new S3Client({
  region: process.env.REGION || "",
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID || "",
    secretAccessKey: process.env.SECRET_ACCESS_KEY || "",
  },
});

const RESOLUTIONS = [
  { name: "4k", width: 3840, height: 2160 },
  { name: "2k", width: 2560, height: 1440 },
  { name: "1080p", width: 1920, height: 1080 },
  { name: "720p", width: 1280, height: 720 },
  { name: "480p", width: 858, height: 480 }
];

const BUCKET_NAME = process.env.BUCKET_NAME;
const KEY = process.env.KEY;

async function init() {

  //download the video locally
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: KEY,
  });

  const res = await s3Client.send(command);
  const originalPathFile = `original-video.mp4`;

  //@ts-ignore
  await fs.writeFile(originalPathFile, res.Body);
  const originalVideoPath = path.resolve(originalPathFile);

  //transcode the video
  const promises = RESOLUTIONS.map((resolution) => {
    const output = `${KEY}-${resolution.name}.mp4`;

    return new Promise((resolve) => {
      ffmpeg(originalVideoPath)
        .output(output)
        .withAudioCodec("aac")
        .withVideoCodec("libx264")
        .withSize(`${resolution.width}x${resolution.height}`)
        .on("end", async () => {
            const putCommand = new PutObjectCommand({
                Bucket: "production-videos.sspnow.xyz",
                Key: output,
                Body: fsold.createReadStream(path.resolve(output))
            })
            await s3Client.send(putCommand);
            console.log(`uploaded ${output}`);
            resolve(null);
        })
        .format("mp4")
        .run();
    });
  });

  await Promise.all(promises);
}

init().finally(() => process.exit(0));
