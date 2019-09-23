const parseArgs = require('command-line-args');

/**
 * Command-line-args makes compatible with Command-line-usage and easy to reuse it
 */
const proxyOptions = [
    {
        name: 'timeout', type: Number,
        description: "Max ms to wait in http request {underline default:10000}", defaultValue: 10000
    },
    {
        name: 'interval', type: Number, description: "MS to wait when http pool reach max {underline default:50}", defaultValue: 50
    },
    {
        name: 'threads', type: Number, description: 'Concurrent requests {underline default:30}', defaultValue: 30
    },
    {
        name: 'proxyfiles', type: String, multiple: true,
        description: 'One or more proxy host files, requires, --proxyuser and --proxypass\nupdates --threads to amount of given proxy'
    },
    {
        name: 'proxyuser', type: String, description: "Define user for proxy, requires --proxyfile and --proxypass"
    },
    {
        name: 'proxypass', type: String, description: "Define password for proxy, requires --proxyfile and --proxyuser"
    },
    {
        name: 'nocert', type: Boolean, multiple: false, description: 'Ignores cecrtification validation'
    },
    {
        name: 'debugproxy', type: Boolean, multiple: false, description: 'Show extra information from proxy'
    }
];

module.exports = parseArgs(proxyOptions, { partial: true });
module.exports.proxyArgs = proxyOptions;