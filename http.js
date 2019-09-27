const axios = require("axios");
const fs = require('fs');
var SocksProxyAgent = require('socks-proxy-agent');

/**
 * Generate random number between low and high
 * @param {Number} low Low rage to generate random value
 * @param {Number} high High range to generate random value
 * @returns {Number} Random number generated
 */
function random(low, high) {
    return Math.floor(Math.random() * (high - low + 1) + low)
}

/**
 * Using proxy object will selected a random free proxy
 * 
 * @returns {SocksProxyAgent} Selected and configured proxy
 */
function selectAgent() {
    if (proxy.active) {
        const index = random(0, proxy.available.length - 1);
        const agent = proxy.available[index];
        proxy.available.splice(index, 1);
        proxy.working.push(agent);
        if (options.debugproxy && agent == undefined) {
            // I think is already fixed and will not raise this message any more
            console.error(`failed to switch proxy, availables ${proxy.available.length}, espected: ${index}, in use: ${proxy.working.length}`);
        }
        return agent;
    }
}

/**
 * Enables to reuse given agent
 * @param {SocksProxyAgent} agent Speficy an agent to mark as usable again to be available on selectAgent()
 */
function unselectAgent(agent) {
    if (proxy.active) {
        const index = proxy.working.indexOf(agent);
        if (index >= 0) { proxy.working.splice(index, 1); }
        proxy.available.push(agent);
    }
}

/**
 * Interceptor for axios request
 * Before execute request will active any available proxy if it`s configured
 */
function requestInterceptor(config) {
    return new Promise((resolve, reject) => {
        let interval = setInterval(() => {
            if (PENDING_REQUESTS < options.threads && (!proxy.active || proxy.available.length > 0)) {
                PENDING_REQUESTS++
                clearInterval(interval);
                const agent = selectAgent();
                if (agent) {
                    if (options.debugproxy) {
                        console.log(`Switched to agent ${agent.proxy.host}`);
                    }
                    config.httpsAgent = agent;
                    config.httpAgent = agent;
                }
                else if (proxy.active) {
                    console.warn("switch agent but undefinded found!");
                }
                resolve(config);
            }
        }, options.interval);
    })
};

/**
 * Axios Response Interceptor when it succeded
 * Will unselect proxy agent if enabled 
 */
function responseSuccessInterceptor(response) {
    PENDING_REQUESTS = Math.max(0, PENDING_REQUESTS - 1);
    unselectAgent(response.config.httpsAgent);
    return Promise.resolve(response);
}

/**
 * Response error interceptor for axios
 *  If timeout, will try again with timeout * 2
 *  If reponse available will return response as usual reponse
 *  Other cases will raise exception
 */
function responseErrorInterceptor(error) {
    PENDING_REQUESTS = Math.max(0, PENDING_REQUESTS - 1);
    unselectAgent(error.config.httpsAgent);
    if (error.message.indexOf("timeout") >= 0) {
        error.config.timeout = error.config.timeout * 2;
        if (options.debugproxy) { console.log(`increased timeout to ${error.config.timeout}`); }
        return axios.request(error.config);
    } else {
        return new Promise((res, rej) => {
            if (!error.response) {
                rej(error);
            } else {
                res(error.response);
            }
        })
    }
}

/**
 * This override Axios.create() by include interceptors defined above
 * 
 * @param {*} options Options like axios.create(options)
 * 
 */
function create(options) {
    const newClient = this.instance(options);
    newClient.interceptors.request.use(requestInterceptor);
    newClient.interceptors.response.use(responseSuccessInterceptor, responseErrorInterceptor);
    newClient.download = download;
    return newClient;
}

/**
 * Defines or reconfigure proxy configuration
 * 
 * @param {Number} timeout Max timeout in ms to wait for response
 * @param {Number} interval Time where re-run tasks in ms
 * @param {Number} threads Amount of concurrent request 
 * @param {Array} proxyfiles String[] with paths where read line by line socks hostnames
 * @param {String} proxyuser User to autenticate proxy
 * @param {String} proxypass Password to autenticate proxy
 * @param {Boolean} nocert Default false, if true will ignore bad certs
 * @param {Boolean} debugproxy Enables verbose mode for proxy messages
 */
function setup(timeout = 10000, interval = 50, threads = 30, proxyfiles = [], proxyuser = "", proxypass = "", nocert = false, debugproxy = false) {
    options = {
        timeout: timeout,
        interval: interval,
        threads: threads,
        proxyfiles: proxyfiles,
        proxyuser: proxyuser,
        proxypass: proxypass,
        nocert: nocert,
        debugproxy: debugproxy,
        proxyArgs: {}
    }
    initializeWithArgs();
}

/**
 * Initialize proxy configuration or not, based on self.options, 
 */
function initializeWithArgs() {
    /**
     * When proxyfiles args is given will update proxy object to configure as socks5 proxies
     */
    if (options.proxyfiles) {
        options.proxyfiles.forEach(proxyFile => {
            if (fs.existsSync(proxyFile)) {
                String(fs.readFileSync(proxyFile)).split("\n").forEach(x => {
                    if (x)
                        proxy.available.push(new SocksProxyAgent({
                            protocol: "socks5:",
                            host: x,
                            port: 1080,
                            auth: `${options.proxyuser}:${options.proxypass}`,
                            rejectUnauthorized: !options.nocert
                        }));
                })
            }
        });
        options.threads = proxy.available.length - 1;
        proxy.active = true;
    }
}

/**
 * Download given url into file path
 * 
 * @param {String} url Url to download into file
 * @param {String} path Path to write Url file
 */
async function download(url, path) {
    const writer = fs.createWriteStream(path)

    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream'
    })

    response.data.pipe(writer)

    return new Promise((resolve, reject) => {
        writer.on('finish', resolve)
        writer.on('error', reject)
    })
}

// Add axios default interceptors
axios.interceptors.request.use(requestInterceptor);
axios.interceptors.response.use(responseSuccessInterceptor, responseErrorInterceptor);
axios.download = download;
axios.instance = axios.create;

let PENDING_REQUESTS = 0
let proxy = {
    available: [],
    working: [],
    active: false
}
let options = {
    timeout: 10000,
    interval: 50,
    threads: 30,
    nocert: false,
    debugproxy: false
};

try {
    // If command-line-args is available will setup proxy with args
    const _ = require.resolve("commander");
    options = require("./args");
    initializeWithArgs();

} catch (error) {
    try {
        // If command-line-args is available will setup proxy with args
        const _ = require.resolve("command-line-args");
        options = require("./old_args");
        console.warn("@command-line-args is depcreated now works with @commander")
        initializeWithArgs();
    } catch (error) {    
    }
}

const {version} = require("./package");
/**
 * Basically the module gives all functionallity of an axios instance with interceptors
 * Or gives you way to create your custom instance by calling self.create()
 */
module.exports = axios;
module.exports.create = create;
module.exports.options = options;
module.exports.setup = setup;
module.exports.disableHelp= ()=>{
    options.options = [];
}
module.exports.version = version;