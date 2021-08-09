import axios, { AxiosError, AxiosInstance, AxiosInterceptorManager, AxiosPromise, AxiosRequestConfig, AxiosResponse } from 'axios'
import * as fs from "fs"
// import { SocksProxyAgent as RawAgent, SocksProxyAgentOptions } from 'socks-proxy-agent'
import { IOptions, IProxyPool, IAgent } from './interfaces.js'
import { SocksProxyAgent } from './socket.js'
import { ProxyPool } from './proxy.js'


export class Options implements IOptions {
    timeout: number = 10000
    interval: number = 50
    threads: number = 5
    proxyfiles: string[] = []
    proxyhosts: string[] = []
    proxyuser?: string | undefined
    proxypass?: string | undefined
    nocert: boolean = false
    debugproxy: boolean = false
    port?: number = 1080

    constructor(options: any) {
        Object.assign(this, options)
    }
}


export class AxiosProxy {

    private session?: AxiosInstance
    public config: IOptions
    public pool: IProxyPool

    private activeThreads: number = 0
    private executedRequests: number = 0

    constructor(options: IOptions) {
        this.config = new Options(options)
        this.pool = new ProxyPool()
        this.addPool(this.config)
    }


    /**
     * Gives direct access to instance of axios with everything ready
     */
    get axios(): AxiosInstance {
        if (!this.session) {
            return this.createSession()
        }
        return this.session
    }

    /**
     * Initializes and configures axios instance
     */
    createSession(options?: AxiosRequestConfig): AxiosInstance {
        this.session = axios.create(options)
        const self = this
        function _requestHandler(config: AxiosRequestConfig): Promise<AxiosRequestConfig> {
            return self._requestHandler(config)
        }
        function _responseSuccessInterceptor(response: AxiosResponse): Promise<AxiosResponse> {
            return self._responseSuccessInterceptor(response)
        }
        function _responseErrorInterceptor(error: AxiosError): Promise<AxiosResponse | AxiosError> {
            return self._responseErrorInterceptor(error)
        }

        this.session.interceptors.request.use(_requestHandler)
        this.session.interceptors.response.use(_responseSuccessInterceptor, _responseErrorInterceptor)
        return this.session
    }

    /**
     * Based on instance options will return axios session
     */
    addPool(options: IOptions) {
        /**
         * When proxyfiles args is given will update proxy object to configure as socks5 proxies
         */
        this.pool.clear()
        this.pool.extends(
            options.proxyfiles
                .filter((path: string) => fs.existsSync(path)) // Remove all files that not exists
                .map((proxyFile: string) => // Map content files and split lines
                    String(fs.readFileSync(proxyFile)).split('\n').filter(x => x))
                .flat() // Convert as Single Array instead 2D Array
                .concat(options.proxyhosts)  // At last point adds proxyhosts to the available pool 
                .map((x: string) => new SocksProxyAgent({
                    protocol: 'socks5:',
                    host: x,
                    port: options.port,
                    auth: `${options.proxyuser}:${options.proxypass}`,
                    rejectUnauthorized: !options.nocert
                })) // Finally instance all sockets
        )

        const availableProxys = Object.keys(this.pool.available).length - 1
        if (options.threads < availableProxys) { // If are less threads than proxys hosts increased to use at least one thread per proxy
            options.threads = availableProxys
        }

        // this.pool.active = Object.keys(this.pool.available).length > 0
        Object.assign(this.config, options)

    }

    /**
    * Interceptor for axios request
    * Before execute request will active any available proxy if it`s configured
    */
    private _requestHandler(config: AxiosRequestConfig): Promise<AxiosRequestConfig> {
        return new Promise((resolve, reject) => {
            const interval = setInterval(() => {
                // const availables = Object.values(this.pool.available)
                if (this.activeThreads < this.config.threads && (!this.pool.active || this.pool.hasFree)) {
                    this.activeThreads++
                    const agent = this.pool.select()
                    if (this.pool.active && !agent) {
                        return
                    }
                    clearInterval(interval)
                    if (agent) {
                        if (this.config.debugproxy) {
                            console.debug(`Switched to agent ${agent.config.host}`)
                        }
                        config.httpsAgent = agent
                        config.httpAgent = agent
                    } else if (this.pool.active) {
                        console.warn('Request without proxy but expected with proxy')
                    }
                    this.executedRequests++
                    resolve(config)
                }
            }, this.config.interval)
        })
    }

    /**
     * Axios Response Interceptor when it succeded
     * Will unselect proxy agent if enabled
     */
    private _responseSuccessInterceptor(response: AxiosResponse): Promise<AxiosResponse> {
        this.activeThreads = Math.max(0, this.activeThreads - 1)
        this.unselectAgent(response.config.httpsAgent)
        return Promise.resolve(response)
    }

    /**
     * Response error interceptor for axios
     *  If timeout, will try again with timeout * 2
     *  If reponse available will return response as usual reponse
     *  Other cases will raise exception
     */
    private _responseErrorInterceptor(error: AxiosError): Promise<AxiosResponse | AxiosError> {
        this.activeThreads = Math.max(0, this.activeThreads - 1)
        this.unselectAgent(error.config.httpsAgent)
        return new Promise((resolve, reject) => {
            if (!error.response) {
                if (error.message.includes('ECONNREFUSED')) {
                    console.warn(`Proxy not working ${error.config.httpsAgent.proxy.host}`)
                    this.pool.disable(error.config.httpsAgent)
                    this.config.threads--
                    if (this.pool.hasFree) {
                        console.warn('Trying to select new proxy')
                        // TODO: Add better retrie control
                        this.axios(error.config).then(x => resolve(x))
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


    private unselectAgent(httpsAgent: any) {
        this.pool.unselect(httpsAgent)
    }


    /**
     * Download given url into file path
     *
     * @param {String} url Url to download into file
     * @param {String} path Path to write Url file
     */
    async download(url: string, path: string): Promise<void> {
        const writer = fs.createWriteStream(path)

        const response = await this.axios({
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

    getUri(config?: AxiosRequestConfig): string {
        return this.axios.getUri(config)
    }
    request<T = any, R = AxiosResponse<T>>(config: AxiosRequestConfig): Promise<R> {
        return this.axios.request<T, R>(config)
    }
    get<T = any, R = AxiosResponse<T>>(url: string, config?: AxiosRequestConfig): Promise<R> {
        return this.axios.get<T, R>(url, config)
    }
    delete<T = any, R = AxiosResponse<T>>(url: string, config?: AxiosRequestConfig): Promise<R> {
        return this.axios.delete<T, R>(url, config)
    }
    head<T = any, R = AxiosResponse<T>>(url: string, config?: AxiosRequestConfig): Promise<R> {
        return this.axios.head<T, R>(url, config)
    }
    options<T = any, R = AxiosResponse<T>>(url: string, config?: AxiosRequestConfig): Promise<R> {
        return this.axios.options<T, R>(url, config)
    }
    post<T = any, R = AxiosResponse<T>>(url: string, data?: any, config?: AxiosRequestConfig): Promise<R> {
        return this.axios.post<T, R>(url, data, config)
    }
    put<T = any, R = AxiosResponse<T>>(url: string, data?: any, config?: AxiosRequestConfig): Promise<R> {
        return this.axios.put<T, R>(url, data, config)
    }
    patch<T = any, R = AxiosResponse<T>>(url: string, data?: any, config?: AxiosRequestConfig): Promise<R> {
        return this.axios.patch<T, R>(url, data, config)
    }
    get defaults(): AxiosRequestConfig {
        return this.axios.defaults
    }

    get interceptors(): {
        request: AxiosInterceptorManager<AxiosRequestConfig>;
        response: AxiosInterceptorManager<AxiosResponse>;
    } {
        return this.axios.interceptors
    }
}

