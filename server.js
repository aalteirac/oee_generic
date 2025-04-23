import express from 'express';
import cors from 'cors';
import path from 'path';
import snowflake from 'snowflake-sdk';
import crypto from 'crypto';
import fs from 'fs';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import https from 'https';
import axios from 'axios';
import { createParser } from 'eventsource-parser';

import http from 'http';
import WebSocket, { WebSocketServer } from 'ws';
let clients = new Map();

dotenv.config();



const ANALYST_ENDPOINT = "/api/v2/cortex/analyst/message";
var SNOWFLAKE_ACCOUNT='snowflake',SNOWFLAKE_HOST='bla';
if(process.env.SNOWFLAKE_HOST && process.env.SNOWFLAKE_ACCOUNT){
    SNOWFLAKE_HOST = process.env.SNOWFLAKE_HOST;
    SNOWFLAKE_ACCOUNT = process.env.SNOWFLAKE_ACCOUNT;
}
// const HOST = SNOWFLAKE_HOST.replace("snowflake", SNOWFLAKE_ACCOUNT.toLowerCase().replace("_", "-"), 1);
const HOST = SNOWFLAKE_HOST;
const URL_SPCS = `https://${HOST}${ANALYST_ENDPOINT}`;
const URL_EXTERNAL = `https://${process.env.ACCOUNT}.snowflakecomputing.com${ANALYST_ENDPOINT}`;


const __dirname = path.resolve();
const app = express();
const PORT = 8080;
const connection = snowflake.createConnection(getOptions());


connection.connect((err, conn) => {
    if (err) {
        console.error('Unable to connect: ', err);
    } else {
        console.log('Connected to Snowflake successfully!');
    }
});

app.use(cors());
app.use(express.json());

function connectToSnowflake() {
    return new Promise(async (resolve, reject) => {
      var isConnectionValid=false  
      try {
        isConnectionValid = await connection.isValidAsync();
        if(isConnectionValid==true)
            resolve();
          else
            connection.connect((err, conn) => {
                if (err) {
                console.error('Connection failed, retrying...', err);
                return reject(err);
                }
                console.log('Connected to Snowflake!');
                resolve(conn);
            });
      } catch (error) {
        console.log("Invalid connection, try again",error);
        connection = snowflake.createConnection(getOptions());
        connection.connect((err, conn) => {
            if (err) {
            console.error('Connection failed, retrying...', err);
            return reject(err);
            }
            console.log('Connected to Snowflake!');
            resolve(conn);
        });
      }  
    });
}

function isSPCS(){
    return fs.existsSync("/snowflake/session/token")
}

function getSPCSJWTToken(){
    let tokenSPCS=fs.readFileSync('/snowflake/session/token', 'ascii');
    return tokenSPCS;
}

function getJWTToken(){
    var privateKeyFile = fs.readFileSync('secrets/rsa_key.p8'); 
    var qualified_username = `${process.env.ACCOUNT.toUpperCase()}.${process.env.USERNAME.toUpperCase()}`;
    var privateKeyObject = crypto.createPrivateKey({ key: privateKeyFile, format: 'pem', passphrase: 'passphrase' });
    var privateKey = privateKeyObject.export({ format: 'pem', type: 'pkcs8' });
    var publicKeyObject = crypto.createPublicKey({ key: privateKey, format: 'pem' });
    var publicKey = publicKeyObject.export({ format: 'der', type: 'spki' });
    var publicKeyFingerprint = 'SHA256:' + crypto.createHash('sha256') .update(publicKey, 'utf8') .digest('base64');
    var signOptions = {
        iss : qualified_username+ '.' + publicKeyFingerprint,
        sub: qualified_username,
        exp: Math.floor(Date.now() / 1000) + (60 * 600),
    };
    var token = jwt.sign(signOptions,  privateKey, {algorithm:'RS256'});
    return token;
}

function getPrivateKey(){
    var privateKeyFile = fs.readFileSync('secrets/rsa_key.p8');
    var privateKeyObject = crypto.createPrivateKey({
        key: privateKeyFile,
        format: 'pem',
        passphrase: 'passphrase'
    });
    
    var privateKey = privateKeyObject.export({
    format: 'pem',
    type: 'pkcs8'
    });
    return privateKey;
}

function getOptions() {
    if (isSPCS()) {
        console.log('INTERNAL CONNECTION');
        return {
            accessUrl: "https://" + process.env.SNOWFLAKE_HOST,
            account: process.env.SNOWFLAKE_ACCOUNT,
            warehouse: process.env.WAREHOUSE, 
            authenticator: 'OAUTH',
            clientSessionKeepAlive:true,
            token: fs.readFileSync('/snowflake/session/token', 'ascii'),
        }
    }
    else {
        console.log('EXTERNAL CONNECTION');
        return {
            account: process.env.ACCOUNT,
            username: process.env.USERNAME,
            authenticator:"SNOWFLAKE_JWT",
            privateKey: getPrivateKey(),
            clientSessionKeepAlive:true,
            warehouse: process.env.WAREHOUSE, 
        }
    }
}

function getSemModel(){
    let contents = fs.readFileSync('sem/oee.yaml', 'utf-8');
    const [db, sc, tb]=process.env.CORTEX_TABLE.split('.')
    contents = contents.replaceAll('#db#', db) 
                   .replaceAll('#sc#', sc)
                   .replaceAll('#tb#', tb);  

    return contents;
}

async function sendCortexRequestStream(prompt,wsid,model){
    var tkk = '', url = '',authType='OAUTH';

    // FORCE EXTERNAL CORTEX REQUEST
    if (false){
    // if (isSPCS()){
        console.log("INTERNAL OAUTH")
        tkk=getSPCSJWTToken();
        console.log(tkk)
        url=URL_SPCS;
        console.log(url)
    }
    else{
        tkk=getJWTToken();
        url=URL_EXTERNAL;
        authType='KEYPAIR_JWT'
    }
    console.log("URL",url)
    console.log("TOKEN",tkk)
    console.log("AUTH_TYPE",authType)
    const requestBody = 
        JSON.stringify({
            "messages": [
                {
                    "role": "user",
                    "content": [{ "type": "text", "text": prompt }]
                }
            ],
            "semantic_model": model,
            "stream":true
        });
    const headers = {
        // "User-Agent": "aalteirac/1.0",
        'Content-Type': 'application/json',
        // "Accept": "application/json",
        'Authorization': `Bearer ${tkk}`,
        "X-Snowflake-Authorization-Token-Type": authType
    };

    console.log("HEADERS",headers)
    const response = await axios.post(url, requestBody, {
        headers:headers,
        responseType: 'stream',
    }).catch((error)=>{
        if (error.response) {
            console.log("FIRST");
            console.log(error.response.status);
            console.log(error.response.headers);
          } else if (error.request) {
            console.log("SECOND");
            console.log(error.request);
          } else {
            console.log("LAST");
            console.log('Error', error.message);
          }
    });
    response.data.on('data', (chunk) => {
        console.log("DATA",chunk.toString())
        for (let [storedClientId,ws] of clients.entries()) {
            if (storedClientId === wsid && ws.readyState === WebSocket.OPEN) {
              ws.send(chunk.toString());
            }
          }
     });
    
    response.data.on('end', () => {
        console.log('END')
    });
    
    response.data.on('error', (e) => {
        console.log('ERROR',e)
    });
    return response;
}

async function sendCortexRequest(prompt,wsid,model) {
    //TEST
    const stream = await sendCortexRequestStream(prompt,wsid,model); 

    //TEST 
    // var tkk = '', url = '',authType='OAUTH';
    // if (isSPCS()){
    //     tkk=getSPCSJWTToken();
    //     url=URL_SPCS;
    // }
    // else{
    //     tkk=getJWTToken();
    //     url=URL_EXTERNAL;
    //     authType='KEYPAIR_JWT'
    // }
    // return new Promise((resolve, reject) => {
    //     const requestBody = JSON.stringify({
    //         "messages": [
    //             {
    //                 "role": "user",
    //                 "content": [{ "type": "text", "text": prompt }]
    //             }
    //         ],
    //         "semantic_model": getSemModel(),
    //     });

    //     const options = {
    //         method: 'POST',
    //         headers: {
    //             "User-Agent": "aalteirac/1.0",
    //             "Content-Type": "application/json",
    //             "Accept": "application/json",
    //             "Authorization": `Bearer ${tkk}`,
    //             "X-Snowflake-Authorization-Token-Type": `${authType}`
    //         }
    //     };

    //     const req = https.request(url, options, (res) => {
    //         let data = '';

    //         res.on('data', (chunk) => {
    //             data += chunk;
    //         });

    //         res.on('end', () => {
    //             try {
    //                 resolve(JSON.parse(data));
    //             } catch (error) {
    //                 console.log('error end',error)
    //                 reject(new Error("Invalid JSON response"));
    //             }
    //         });
    //     });

    //     req.on('error', (error) => {
    //         console.log('error',error)
    //         reject(error);
    //     });

    //     req.write(requestBody);
    //     req.end();
    // });
}

function setWarehouse(){
    return new Promise((resolve, reject) => {
        let q="USE WAREHOUSE "+ process.env.WAREHOUSE+";"
        connection.execute({
            sqlText: q,
            complete: (err, stmt, rows) => {
            if (err) {
                console.error('Failed to execute query:', err);
                reject()
            } else {
                resolve()
            }
            }
        });
    })
}

function execQuery(q){
    return new Promise(async (resolve, reject) => {
        await setWarehouse();
        await connectToSnowflake();
        connection.execute({
            sqlText: q,
            complete: (err, stmt, rows) => {
            if (err) {
                console.error('Failed to execute query:', err);
                reject({message:"Query execution failed",err:err})
                // res.status(500).send('Query execution failed');
            } else {
                // res.json(rows);
                resolve(rows)
            }
            }
        });
    })
}

app.post('/api/query', async (req, res) => {
    let {q} = req.body;
    try {
        let rows=await execQuery(q);
        res.json(rows);
    } catch (error) {
        res.json(error);
    }
});

app.post('/api/message', async (req, res) => {
    const b= req.body;
    let wsid=req.body.IDWS;
    let semModel=b.model;
    let q=b.messages[0].text;
    let ctx=await sendCortexRequest(q,wsid,semModel);
    res.json({"raw":'OK'}); 
});

app.post('/api/viz', async (req, res) => {
    let tp = req.body.tp
    let beg = req.body.beg
    let end = req.body.end
    let qq='';
    // Date 
    if(tp=='date'){
        qq=`
            SELECT 
                MIN(TS) AS min_ts,
                MAX(TS) AS max_ts
            FROM ${process.env.CORTEX_TABLE};
        `
    }
    // OEE
    if (tp=='oee'){
        qq=`
            SELECT 
                SUM(RUNTIME) / (SUM(RUNTIME) + 
                                SUM(CASE WHEN PLANNED_DOWNTIME THEN 1 ELSE 0 END) + 
                                SUM(CASE WHEN UNPLANNED_DOWNTIME THEN 1 ELSE 0 END)) AS AVAILABILITY,
                
                SUM(GOOD_COUNT) / SUM(TOTAL_COUNT) AS QUALITY,

                (SUM(RUNTIME) / (SUM(RUNTIME) + 
                                SUM(CASE WHEN PLANNED_DOWNTIME THEN 1 ELSE 0 END) + 
                                SUM(CASE WHEN UNPLANNED_DOWNTIME THEN 1 ELSE 0 END))) * 
                (SUM(GOOD_COUNT) / SUM(TOTAL_COUNT)) * 
                (SUM(GOOD_COUNT) / SUM(TOTAL_COUNT)) AS OEE
            FROM ${process.env.CORTEX_TABLE}
            WHERE 
                TS >= TO_TIMESTAMP_NTZ('${beg}')
                    AND 
                TS <= TO_TIMESTAMP_NTZ('${end}');
        `
    }
    // First Pass Yield
    if (tp=='fpy'){
        qq=`
            SELECT 
                SUM(GOOD_COUNT) / NULLIF(SUM(TOTAL_COUNT), 0) AS FIRST_PASS_YIELD
            FROM ${process.env.CORTEX_TABLE}
            WHERE 
                TS >= TO_TIMESTAMP_NTZ('${beg}')
                    AND 
                TS <= TO_TIMESTAMP_NTZ('${end}');
        `
    }
    // Rejection Rate
    if (tp=='rrt'){
        qq=`
        SELECT 
            SUM(REJECTED_COUNT) / NULLIF(SUM(TOTAL_COUNT), 0) AS REJECT_RATE
        FROM ${process.env.CORTEX_TABLE}
        WHERE 
                TS >= TO_TIMESTAMP_NTZ('${beg}')
                    AND 
                TS <= TO_TIMESTAMP_NTZ('${end}');
        `
    }
    // DownTime Analysis
    if (tp=='da'){
        qq=`
            SELECT 
                COUNT_IF(PLANNED_DOWNTIME) AS PLANNED_DOWNTIME_EVENTS,
                COUNT_IF(UNPLANNED_DOWNTIME) AS UNPLANNED_DOWNTIME_EVENTS
            FROM ${process.env.CORTEX_TABLE}
            WHERE 
                TS >= TO_TIMESTAMP_NTZ('${beg}')
                    AND 
                TS <= TO_TIMESTAMP_NTZ('${end}');
        `
    }
    // Production Throughput
    if (tp=='pt'){
        qq=`
            SELECT 
                SUM(TOTAL_COUNT) AS TOTAL_UNITS_PRODUCED
            FROM ${process.env.CORTEX_TABLE}
            WHERE 
                TS >= TO_TIMESTAMP_NTZ('${beg}')
                    AND 
                TS <= TO_TIMESTAMP_NTZ('${end}');
        `
    }
    if (tp=='eff'){
        qq=`
        SELECT 
            CAST(DATE_TRUNC('day', TS) AS DATE) AS day,
            ROUND(100 * SUM(GOOD_COUNT) / NULLIF(SUM(TOTAL_COUNT), 0), 2) AS efficiency
        FROM ${process.env.CORTEX_TABLE}
        WHERE 
                TS >= TO_TIMESTAMP_NTZ('${beg}')
                    AND 
                TS <= TO_TIMESTAMP_NTZ('${end}')
        GROUP BY day
        ORDER BY day;
        `
    }
    try {
        let rows=await execQuery(qq);
        res.json(rows);
    } catch (error) {
        console.log('Error for',qq,error)
        res.json(error);
    }
});

app.get('/api/model', async (req, res) => {
    res.json({"model":getSemModel()}); 
});

var options = {index: "index.html"};

app.use("/", express.static(__dirname + "/dist", options));


const server = http.createServer(app);
server.listen(PORT);
console.log(`Server running on http://localhost:${PORT}`);
const wss = new WebSocketServer({ server });
wss.on('connection', (ws) => {
    const clientId = Math.random().toString(36).substring(7);
    clients.set(clientId, ws);
    ws.send(`{"IDWS":"${clientId}"}`);
    ws.on('close', function() {
        clients.delete(clientId);
    });

    ws.on('message', function incoming(message) {
        
    });
});











  