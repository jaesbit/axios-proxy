import { SocksProxyAgent, SocksProxyAgentOptions } from "socks-proxy-agent";

export interface RawAgent extends SocksProxyAgent {
    ID: string
}


export interface IOptions {
    timeout: number,
    interval: number,
    threads: number,
    proxyfiles: Array<string>,
    proxyhosts: Array<string>,
    proxyuser?: string,
    proxypass?: string,
    nocert: boolean,
    debugproxy: boolean,
    port?: number
}

export interface ISocksOptions extends SocksProxyAgentOptions {
    ID?: string
    host?: string | null;
    port?: string | number | null;
    username?: string | null;
    date?: Date | null;
    protocol?: string
    auth?: string | null;
    rejectUnauthorized?: boolean;
}

export interface IAgent {

    // socks: SocksProxyAgent;
    date: Date
    ID: string
    fails: number
    config: ISocksOptions
}

export interface IProxyPool {
    available: { [key: string]: IAgent }
    working: { [key: string]: IAgent }
    disabled: { [key: string]: IAgent }
    active: boolean

    get hasFree(): boolean

    push(agent: IAgent): void
    extends(agents: Array<IAgent>): void

    clear(): void
    select(): IAgent
    unselect(agent: SocksProxyAgent): void
    disable(agent: SocksProxyAgent): void
}