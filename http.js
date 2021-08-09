const axios = require('axios')
const fs = require('fs')
const SocksProxyAgent = require('socks-proxy-agent')

/**
 * Generate random number between low and high
 * @param {Number} low Low rage to generate random value
 * @param {Number} high High range to generate random value
 * @returns {Number} Random number generated
 */
function random (low, high) {
  return Math.floor(Math.random() * (high - low + 1) + low)
}

/**
 * Using proxy object will selected a random free proxy
 *
 * @returns {SocksProxyAgent} Selected and configured proxy
 */
function selectAgent () {
  if (proxy.active) {
    let agent
    if (proxy.disabled.length) {
      const disableds = proxy.disabled.filter(x => x.date - new Date() > 5 * 60 * 1000)
      if (disableds.length) {
        const idx = proxy.disabled.indexOf([disableds[0]])
        agent = proxy.disabled[idx].proxy
        proxy.disabled.splice(idx, 1)
      }
    }
    if (!agent) {
      const index = random(0, proxy.available.length - 1)
      agent = proxy.available[index]
      proxy.available.splice(index, 1)
    }
    proxy.working.push(agent)
    if (options.debugproxy && agent == undefined) {
      // I think is already fixed and will not raise this message any more
      console.error(`failed to switch proxy, availables ${proxy.available.length}, espected: ${index}, in use: ${proxy.working.length}`)
    }
    return agent
  }
}

/**
 * Enables to reuse given agent
 * @param {SocksProxyAgent} agent Speficy an agent to mark as usable again to be available on selectAgent()
 */
function unselectAgent (agent) {
  if (proxy.active) {
    const index = proxy.working.indexOf(agent)
    if (index >= 0) { proxy.working.splice(index, 1) }
    proxy.available.push(agent)
  }
}

/**
 * Disables agent usually corrupted or down
 * @param {SocksProxyAgent} agent Speficy an agent to mark as usable again to be available on selectAgent()
 */
function disableAgent (agent) {
  const index = proxy.available.indexOf(agent)
  if (index >= 0) {
    proxy.disabled.push({
      proxy: proxy.available[index],
      date: new Date()
    })
    proxy.available.splice(index, 1)
  }
  if (options.threads === proxy.available.length + proxy.active.length - 1) {
    options.threads--
  }
}

/**
 * Interceptor for axios request
 * Before execute request will active any available proxy if it`s configured
 */
function requestInterceptor (config) {
  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      if (PENDING_REQUESTS < options.threads && (!proxy.active || proxy.available.length > 0)) {
        PENDING_REQUESTS++
        const agent = selectAgent()
        if (proxy.active && !agent) {
          return
        }
        clearInterval(interval)
        if (agent) {
          if (options.debugproxy) {
            console.log(`Switched to agent ${agent.proxy.host}`)
          }
          config.httpsAgent = agent
          config.httpAgent = agent
        } else if (proxy.active) {
          console.warn('switch agent but undefinded found!')
        }
        global.executedRequests++
        resolve(config)
      }
    }, options.interval)
  })
};

/**
 * Axios Response Interceptor when it succeded
 * Will unselect proxy agent if enabled
 */
function responseSuccessInterceptor (response) {
  PENDING_REQUESTS = Math.max(0, PENDING_REQUESTS - 1)
  unselectAgent(response.config.httpsAgent)
  return Promise.resolve(response)
}

/**
 * Response error interceptor for axios
 *  If timeout, will try again with timeout * 2
 *  If reponse available will return response as usual reponse
 *  Other cases will raise exception
 */
function responseErrorInterceptor (error) {
  PENDING_REQUESTS = Math.max(0, PENDING_REQUESTS - 1)
  unselectAgent(error.config.httpsAgent)
  return new Promise((resolve, reject) => {
    if (!error.response) {
      if (error.message.includes('ECONNREFUSED')) {
        console.warn(`Proxy not working ${error.config.httpsAgent.proxy.host}`)
        disableAgent(error.config.httpsAgent)
        if (proxy.available.length) {
          console.warn('Trying to select new proxy')
          axios(error.config).then(x => resolve(x))
        } else {
          reject(error)
        }
      } else {
        reject(error)
      }
    } else {
      resolve(error.response)
    }
  })
}

/**
 * This override Axios.create() by include interceptors defined above
 *
 * @param {*} options Options like axios.create(options)
 *
 */
function create (options) {
  const newClient = this.instance(options)
  newClient.interceptors.request.use(requestInterceptor)
  newClient.interceptors.response.use(responseSuccessInterceptor, responseErrorInterceptor)
  newClient.download = download
  newClient.settings = options
  return newClient
}

/**
 * Defines or reconfigure proxy configuration
 *
 * @param {Object} config
 * @param {Number} config.timeout Max timeout in ms to wait for response
 * @param {Number} config.interval Time where re-run tasks in ms
 * @param {Number} config.threads Amount of concurrent request
 * @param {Array} config.proxyfiles String[] with paths where read line by line socks hostnames
 * @param {Array} config.proxyhosts String[] with proxy hostnames
 * @param {String} config.proxyuser User to autenticate proxy
 * @param {String} config.proxypass Password to autenticate proxy
 * @param {Boolean} config.nocert Default false, if true will ignore bad certs
 * @param {Boolean} config.debugproxy Enables verbose mode for proxy messages
 */
function setup ({
  timeout,
  interval,
  threads,
  proxyfiles,
  proxyuser,
  proxypass,
  nocert,
  debugproxy,
  proxyhosts
}) {
  options = {
    timeout: timeout || 10000,
    interval: interval || 50,
    threads: threads || 1,
    proxyfiles: proxyfiles || [],
    proxyhosts: proxyhosts || [],
    proxyuser: proxyuser || '',
    proxypass: proxypass || '',
    nocert: nocert || false,
    debugproxy: debugproxy || false,
    proxyArgs: {}
  }
  initializeWithArgs()
}

/**
 * Initialize proxy configuration or not, based on self.options,
 */
function initializeWithArgs () {
  /**
     * When proxyfiles args is given will update proxy object to configure as socks5 proxies
     */
  options.proxyfiles.forEach(proxyFile => {
    if (fs.existsSync(proxyFile)) {
      String(fs.readFileSync(proxyFile)).split('\n').forEach(x => {
        if (x) {
          pushProxy(x)
        }
      })
    }
  })

  options.proxyhosts.forEach(x => {
    pushProxy(x)
  })

  if (options.threads === 1 && proxy.available.length) {
    options.threads = proxy.available.length - 1
    proxy.active = true
  }

  function pushProxy (x) {
    proxy.available.push(new SocksProxyAgent({
      protocol: 'socks5:',
      host: x,
      port: 1080,
      auth: `${options.proxyuser}:${options.proxypass}`,
      rejectUnauthorized: !options.nocert
    }))
  }
}

/**
 * Download given url into file path
 *
 * @param {String} url Url to download into file
 * @param {String} path Path to write Url file
 */
async function download (url, path) {
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
axios.interceptors.request.use(requestInterceptor)
axios.interceptors.response.use(responseSuccessInterceptor, responseErrorInterceptor)
axios.download = download
axios.instance = axios.create

global.executedRequests = 0

let PENDING_REQUESTS = 0
const proxy = {
  available: [],
  working: [],
  active: false,
  disabled: []
}
let options = {
  timeout: 10000,
  interval: 50,
  threads: 1,
  nocert: false,
  debugproxy: false
}

const { version } = require('./package')
/**
 * Basically the module gives all functionallity of an axios instance with interceptors
 * Or gives you way to create your custom instance by calling self.create()
 */
module.exports = axios
module.exports.create = create
// module.exports.options = options
module.exports.initSettings = options
module.exports.proxyPool = proxy
module.exports.setup = setup
module.exports.counter = () => { return global.executedRequests }
module.exports.enableCommander = () => {
  options = require('./args')
  initializeWithArgs()
}
module.exports.version = version
