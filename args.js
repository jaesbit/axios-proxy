const program = require('commander')

program
  .option('--timeout <ms>', 'maximum waiting time on requests', 10000)
  .option('--interval <ms>', 'waiting time to check the pool', 50)
  .option('--threads <Number>', 'Number of parallel requests', 30)
  .option('--proxyfiles [files...]', 'files with proxy hosts')
  .option('--proxyhosts [hosts...]', 'list of proxy hostnames')
  .option('--proxyuser <user>', 'user to authenticate the proxy')
  .option('--proxypass <password>', 'password to authenticate the proxy')
  .option('--nocert', 'if set, will not check the certificate', false)
  .option('--debugproxy', 'prints verbose info', false)

program.parse(process.argv)

module.exports = program
