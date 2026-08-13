const fs = require('fs');

const file = '/app/config.yaml';
let s = fs.readFileSync(file, 'utf8');

function must(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

function replaceAll(from, to) {
  s = s.split(from).join(to);
}

const kind = must('AITO_CONFIG_KIND');
const mongo = must('MONGO_URI');
const redisHost = must('REDIS_HOST');
const redisPort = process.env.REDIS_PORT || '6379';
const redisPassword = must('REDIS_PASSWORD');
const jwt = must('JWT_SECRET');
const rustAccess = must('RUSTFS_ACCESS_KEY');
const rustSecret = must('RUSTFS_SECRET_KEY');
const publicUrl = must('PUBLIC_URL').replace(/\/$/, '');

replaceAll('change-this-jwt-secret', jwt);
replaceAll('mongodb://admin:password@mongodb:27017/?authSource=admin&directConnection=true', mongo);
replaceAll('host: redis\n', `host: ${redisHost}\n`);
replaceAll('port: 6379\n', `port: ${redisPort}\n`);
replaceAll('password: password\n', `password: ${redisPassword}\n`);
replaceAll('accessKeyId: rustfsadmin', `accessKeyId: ${rustAccess}`);
replaceAll('secretAccessKey: rustfsadmin', `secretAccessKey: ${rustSecret}`);
replaceAll('endpoint: http://rustfs.local:9000', 'endpoint: http://aitoearn-rustfs.railway.internal:9000');
replaceAll('publicEndpoint: http://localhost:9000', `${publicUrl}/oss`);
replaceAll('cdnEndpoint: http://localhost:8080/oss', `${publicUrl}/oss`);

if (kind === 'ai') {
  replaceAll('baseUrl: http://aitoearn-server:3002', 'baseUrl: http://aitoearn-server.railway.internal:3002');
} else if (kind === 'server') {
  replaceAll('baseUrl: http://aitoearn-ai:3010', 'baseUrl: http://aitoearn-ai.railway.internal:3010');
  replaceAll('https://localhost', publicUrl);
  replaceAll('http://localhost:8080', publicUrl);
  replaceAll('appDomain: localhost', `appDomain: ${new URL(publicUrl).hostname}`);
} else {
  throw new Error(`Unknown AITO_CONFIG_KIND: ${kind}`);
}

fs.writeFileSync(file, s);
console.log(`Patched AiToEarn ${kind} config for Railway`);
