const program = require("commander");


program
    .option("--timeout <ms>", "wait in http request", 10000)
    .option("--interval <ms>", "time to wait http pool for nex request", 50)
    .option("--threads <Number>", "Pool size for simultaneous requests", 30)
    .option("--proxyfiles [files...]", "files wich contain proxy hosts")
    .option("--proxyuser <user>", "user to autenticate in proxy")
    .option("--proxypass <password>", "password for autenticate in proxy")
    .option("--nocert", "if set allows self certificate", false)
    .option("--debugproxy", "if set write verbose information", false)


program.parse(process.argv);

module.exports = program;
// module.exports.proxyArgs = proxyOptions;