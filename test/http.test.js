import chai, { expect } from 'chai'
import dns from 'dns'
import {promisify} from 'util'
import { AxiosProxy } from '../dist/index.js';

const resolveIp = promisify(dns.lookup)

chai.should()

function buildHostList(){
    const hosts = []
    for(let i =1; i <25;i++){
        let str = String(i)
        if(str.length < 2){
            str = "0" + str
        }
        hosts.push((process.env.PROXY_HOST || "").replace("XX", str))
    }
    return hosts
}

const proxySettings = {
    proxyuser: process.env.PROXY_USER,
    proxypass: process.env.PROXY_PASSWORD,
    proxyhosts: buildHostList(),
}

describe('Test connecting with socket', () => {
    it("Test connect with single Socket", async () => {
        const cfg = Object.assign({}, proxySettings)
        cfg.proxyhosts = cfg.proxyhosts.slice(0,1)
        const proxy = new AxiosProxy(cfg)

        const resp = await proxy.get("https://api64.ipify.org/?format=json")
        expect(resp).to.have.property("status")
            .with.be.equal(200)

        expect(resp.data).to.have.property("ip")
            .with.be.equal('185.147.214.20')
    })

    it("Test connect with double as threads", async () => {
        const cfg = Object.assign({}, proxySettings)
        cfg.proxyhosts = cfg.proxyhosts.slice(0,1)
        const proxy = new AxiosProxy(cfg)
        const taskPool = []

        for(let i=0; i < proxy.config.threads * 4; i++){
            taskPool.push(proxy.get("https://api64.ipify.org/?format=json"))
        }
        await Promise.all(taskPool)
        expect(true).to.be.equal(true)
    }).timeout(30000)
})