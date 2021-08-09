import { IAgent, ISocksOptions, RawAgent } from './interfaces'
import spa from 'socks-proxy-agent';

const sanitizer = new RegExp(/::/g)

function deconstructUrl(data: string, defaults: ISocksOptions): any {
    let user, password, host, port
    host = data
    while (sanitizer.test(data))
        data = data.replace(sanitizer, ':')

    if (data.includes(":")) {
        // HOST contains : needs to replace something
        if (data.includes("@")) {
            // Host includes user and password
            const hostSplit = data.split("@")
            let userGroup = hostSplit.shift()
            if (!userGroup) {
                throw new Error("First point is not user")
            }
            const uSplit = userGroup.split(":")
            user = uSplit.shift()
            password = uSplit.shift()
            host = hostSplit.shift()

        }

        if (host) {
            const portSplit = host.split(":")
            host = portSplit.shift()
            port = Number(portSplit.shift()) || defaults.port
        }
    }

    return {
        user,
        username: user,
        password,
        host,
        port
    }
}

export class SocksOptions implements ISocksOptions {
    ID?: string
    host?: string | null;
    port?: string | number | null;
    username?: string | null;
    date?: Date | null;
    protocol?: string = "socks5"
    auth?: string | null;
    rejectUnauthorized?: boolean = false;

    constructor(options: any) {
        Object.assign(this, options)
        if (!this.ID) {
            this.ID = String.random(10)
        }
    }

    static fromString(str: string): SocksOptions {
        const options = new SocksOptions({})
        Object.assign(options, deconstructUrl(str, options))
        return options
    }
}

export class SocksProxyAgent extends spa.SocksProxyAgent implements IAgent {
    ID: string
    date: Date
    fails: number = 0
    config: SocksOptions


    constructor(options: SocksOptions) {
        super(options)
        this.config = options
        this.ID = options.ID || String.random(10)
        this.date = options.date || new Date()
    }
}