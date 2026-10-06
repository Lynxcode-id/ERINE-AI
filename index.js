import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const argv = yargs(hideBin(process.argv)).argv;

import cfonts from 'cfonts';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import { createRequire } from 'module';
import { createInterface } from 'readline';
import cluster from 'cluster';
import { watchFile, unwatchFile } from 'fs';

const { say } = cfonts;
const rl = createInterface(process.stdin, process.stdout);
const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(__dirname);
const { name, author } = require(join(__dirname, './package.json'));

console.clear();

say('ERINE-MD\nPROJECT', {
    font: 'block',
    align: 'center',
    gradient: ['#00FFFF', '#FF00FF'],
    transitionGradient: true
});

say(`🚀 CORE SYSTEM INITIALIZATION 🚀\nBy: @${author.name || author}`, {
    font: 'console',
    align: 'center',
    gradient: ['#00FFCC', '#b92b27']
});

console.log(chalk.cyanBright('╭───────────────────────────────────────────────────────╮'));
console.log(chalk.cyanBright('│ ') + chalk.bold.hex('#FF00FF')('⚡ BOOT SEQUENCE INITIATED...') + ' '.repeat(26) + chalk.cyanBright('│'));
console.log(chalk.cyanBright('╰───────────────────────────────────────────────────────╯\n'));

const runningWorkers = new Set();
const liveChildren = new Set();
let masterStopping = false;

async function stopAll(signal) {
  if (masterStopping) return;
  masterStopping = true;
  console.log(chalk.yellow(`\n[ ⏹ ] ${signal} diterima, menyimpan data worker...`));
  for (const c of liveChildren) { try { c.send('prepare-shutdown'); } catch {} }
  setTimeout(() => process.exit(0), 12000).unref();
  const wait = setInterval(() => { if (!liveChildren.size) { clearInterval(wait); process.exit(0); } }, 200);
}
process.on('SIGTERM', () => stopAll('SIGTERM'));
process.on('SIGINT', () => stopAll('SIGINT'));

function start(file) {
  if (runningWorkers.has(file)) return;
  runningWorkers.add(file);

  let args = [join(__dirname, file), ...process.argv.slice(2)];

  console.log(chalk.hex('#00FFCC')(`[ ⚡ ] Spawning Node Worker: `) + chalk.white(args.join(' ')));

  if (cluster.setupPrimary) {
    cluster.setupPrimary({ exec: args[0], args: args.slice(1) });
  } else {
    cluster.setupMaster({ exec: args[0], args: args.slice(1) });
  }

  let p = cluster.fork();
  liveChildren.add(p);

  p.on('message', data => {
    switch (data) {
      case 'reset':
        console.log(chalk.bgYellow.black('\n 🔄 GRACEFUL RESTART 🔄 '));
        p.send('prepare-shutdown');
        setTimeout(() => {
          if (!p.isDead()) p.process.kill('SIGTERM');
        }, 15000);
        break;
      case 'uptime':
        p.send(process.uptime());
        break;
      default:
        console.log(chalk.bgHex('#9b5cff').white.bold(' 📨 SIGNAL ') + ' ' + chalk.cyan(data));
    }
  });

  p.on('exit', (_, code, signal) => {
    liveChildren.delete(p);
    runningWorkers.delete(file);
    if (masterStopping) return;
    console.error(chalk.bgRed.white.bold(`\n ❗ WORKER ${file} DOWN (CODE: ${code} SIG: ${signal}) ❗ `));
    if (signal !== 'SIGTERM' && code !== 0) {
      console.log(chalk.yellowBright(`⚠️  Auto-Reviving ${file} in progress...`));
      return start(file);
    }
  });

  let fileWatcher = null;
  if (!fileWatcher) {
    fileWatcher = watchFile(args[0], () => {
      unwatchFile(args[0]);
      p.send('reset');
    });
  }

  let opts = yargs(process.argv.slice(2)).exitProcess(false).parse();

  if (!opts['test']) {
    if (!rl.listenerCount('line')) {
      rl.on('line', line => {
        p.emit('message', line.trim());
      });
    }
  }
}

start('main.js');
