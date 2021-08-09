import { IProxyPool, IAgent, RawAgent } from './interfaces.js'

export class ProxyPool implements IProxyPool {
    available: { [key: string]: IAgent } = {}
    working: { [key: string]: IAgent } = {}
    disabled: { [key: string]: IAgent } = {}
    active: boolean = false
    _total: number = 0


    get hasFree(): boolean { return Object.keys(this.available).length > 0 }
    get length(): number { return this._total }

    push(proxy: IAgent) {
        this.available[proxy.ID] = proxy
        if (!this.active)
            this.active = true
        this._total++
    }

    extends(proxys: Array<IAgent>) {
        Object.assign(this.available, ...proxys.map((x: IAgent) => {
            // x.socks.ID = x.ID
            return { [x.ID]: x }
        }))
        if (!this.active) {
            this.active = true
        }
        this._total += proxys.length
    }

    clear() {
        this.available = {};
        this.working = {};
        this.disabled = {};
        this._total = 0
    }

    /**
     * Using proxy object will selected a random free proxy
     *
     * @returns {SocksProxyAgent} Selected and configured proxy
     */
    select(): IAgent {
        if (this.active) {
            let agent
            const proxyToRecheck = Object.values(this.disabled)
                .filter(x => x && x.date.getTime() - new Date().getTime() > 5 * 60 * 1000)
                .sort((a: IAgent, b: IAgent) => a.fails - b.fails) // Ordered by errors

            if (proxyToRecheck.length) {
                // REVIEW: Disabled agent will reused each 5" to check if available again
                agent = proxyToRecheck.pop()
                if (agent) {
                    delete this.disabled[agent.ID]
                }
            }
            if (!agent) {
                const availables = Object.keys(this.available)
                const proxyKey = availables[Math.randomRange(0, availables.length - 1)]

                agent = this.available[proxyKey]
                if (agent) {
                    delete this.available[proxyKey]
                }
            }
            if (!agent) {
                const availableData = Object.keys(this.available)
                const workingData = Object.keys(this.working)
                const disabledData = Object.keys(this.disabled)
                console.warn(`failed to switch proxy: A:${availableData}, W:${workingData}, D:${disabledData}`)
            } else {
                this.working[agent.ID] = agent
            }
            return agent
        }
        return {} as IAgent
    }

    /**
     * Enables to reuse given agent
     * @param {SocksProxyAgent} agent Speficy an agent to mark as usable again to be available on selectAgent()
     */
    unselect(agent: RawAgent): void {
        if (this.active && agent.ID) {
            const moveAgent = this.working[agent.ID]
            this.available[agent.ID] = moveAgent
            delete this.working[agent.ID]
        }
    }

    /**
     * Disables agent usually corrupted or down
     * @param {SocksProxyAgent} agent Speficy an agent to mark as usable again to be available on selectAgent()
     */
    disable(agent: RawAgent): void {
        if (agent.ID) {
            const raw = this.available[agent.ID] || this.working[agent.ID]
            delete this.available[agent.ID]
            delete this.working[agent.ID]

            // Before register as new disabled update disabled data
            raw.fails++
            raw.date = new Date()
            this.disabled[agent.ID] = raw
        }
    }
}

