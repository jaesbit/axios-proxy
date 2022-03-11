import * as program from 'commander'
import { IOptions } from "./interfaces.js"

class Cli extends program.Command implements IOptions {
    public timeout: number = 10000
    public interval: number = 50
    public threads: number = 30
    public proxyfiles: string[] = []
    public proxyhosts: string[] = []
    public proxyuser?: string
    public proxypass?: string
    public nocert: boolean = false
    public debugproxy: boolean = false

}

const cli = new Cli()
cli.option('--timeout <ms>', 'maximum waiting time on requests', "10000")
    .option('--interval <ms>', 'waiting time to check the pool', "50")
    .option('--threads <Number>', 'Number of parallel requests', "30")
    .option('--proxyfiles [files...]', 'files with proxy hosts')
    .option('--proxyhosts [hosts...]', 'list of proxy hostnames')
    .option('--proxyuser <user>', 'user to authenticate the proxy')
    .option('--proxypass <password>', 'password to authenticate the proxy')
    .option('--nocert', 'if set, will not check the certificate', false)
    .option('--debugproxy', 'prints verbose info', false)

export const options: IOptions = cli.parse(process.argv) as any as IOptions

