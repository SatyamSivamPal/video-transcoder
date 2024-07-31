import { ReceiveMessageCommand, SQSClient, DeleteMessageCommand } from "@aws-sdk/client-sqs";
import { S3Event } from "aws-lambda";
import {ECSClient, RunTaskCommand} from '@aws-sdk/client-ecs'
import express from "express";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import path from 'path'
import multer from 'multer'
import multerS3 from 'multer-s3'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config();

const sqsClient = new SQSClient({
  region: process.env.REGION || "",
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID || "",
    secretAccessKey: process.env.SECRET_ACCESS_KEY || "",
  },
});

const ecsClient = new ECSClient({
  region: process.env.REGION || "",
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID || "",
    secretAccessKey: process.env.ACCESS_KEY_ID || "",
  },
})

const s3Client = new S3Client({
  region: process.env.REGION || "",
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID || "",
    secretAccessKey: process.env.ACCESS_KEY_ID || "",
  },
});

async function init() {
  const command = new ReceiveMessageCommand({
    QueueUrl: "https://sqs.us-east-1.amazonaws.com/471112769320/tempS3queue",
    MaxNumberOfMessages: 1,
    WaitTimeSeconds: 20,
  });

  while (true) {
    const { Messages } = await sqsClient.send(command);

    if (!Messages) {
      console.log("No message received");
      continue;
    }

    try {
      for (const msg of Messages) {
        const { Body, MessageId } = msg;
        console.log(`Message Recieved`, { MessageId, Body });

        //validate and parsee the event
        if (!Body) continue;
        const event = JSON.parse(Body) as S3Event;

        if("Service" in event && "Event" in event) {
            if(event.Event === 's3.TestEvent') {
              await sqsClient.send(
                new DeleteMessageCommand({
                  QueueUrl: "https://sqs.us-east-1.amazonaws.com/471112769320/tempS3queue",
                  ReceiptHandle: msg.ReceiptHandle
                })
              )
              continue;
            }
        }

        for(const record of event.Records) {
            const {s3} = record;
            const {bucket, object: {key}} = s3;

            //spin the docker conatinser
            const runTaskCommand = new RunTaskCommand({
              taskDefinition: "arn:aws:ecs:us-east-1:471112769320:task-definition/video-transcoder",
              cluster: "arn:aws:ecs:us-east-1:471112769320:cluster/dev-cluster",
              launchType: "FARGATE",
              networkConfiguration: {
                awsvpcConfiguration: {
                  subnets: ["subnet-077c7f0d42c6cce9a", "subnet-05c01acd14a29ff98", "subnet-03d7359b2025682a7"],
                  securityGroups: ["sg-06a436ec37d0d12e5"],
                  assignPublicIp: "ENABLED"
                }
              },
              overrides: {
                containerOverrides: [
                  {
                    name: "video-transcoder",
                    environment: [{name: "BUCKET_NAME", value: bucket.name}, {name: "KEY", value: key}]
                  }
                ]
              }
            })

            await ecsClient.send(runTaskCommand)

            //delete the message from queue
            await sqsClient.send(
              new DeleteMessageCommand({
                QueueUrl: "https://sqs.us-east-1.amazonaws.com/471112769320/tempS3queue",
                ReceiptHandle: msg.ReceiptHandle
              })
            )
        }

      }
    } catch (error) {
        console.log(error);
    }
  }
}

init();

const app = express();
const port = 8000;

app.use(cors());
app.use(express.json());

const upload = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: "temp-videos.sspnow.xyz",
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      cb(null, `${Date.now()}${path.extname(file.originalname)}`);
    }
  })
});

app.post('/upload',upload.single('video'), async (req,res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  // File is uploaded to S3
  res.send({ message: 'Upload successful!', file: req.file });
})


app.listen(port, () => {
  console.log("serve running in the port "+port);
})
