import chai, { expect } from 'chai'
import {SocksOptions, SocksProxyAgent} from '../dist/socket.js';
chai.should()

const basicOptions = {
    host: 'localhost',
    port: 3000,

}

describe('Basic initilizations for classes', () => {
  it('will share same ID between options and agent', () => {
    const options = new SocksOptions(basicOptions)
    expect(options.ID).to.be.a('string', 'Empty SocketOptions instance')
    expect(options).to.have.property('ID')
      .with.lengthOf(10)
      .with.be.a('string')

    const proxyAgent = new SocksProxyAgent(options)
    expect(proxyAgent.ID).to.be.a('string', 'Empty SocketProxyAgent')
    expect(proxyAgent).to.have.property('ID')
      .with.lengthOf(10)
      .with.be.a('string')
      .with.be.equal(options.ID)
  })

  it('sould contain random ID when aren`t on args', () => {
    const options = new SocksOptions(basicOptions)
    expect(options.ID).to.be.a('string', 'Empty SocketOptions instance')
    expect(options).to.have.property('ID')
      .with.lengthOf(10)
      .with.be.a('string')

    const proxyAgent = new SocksProxyAgent(basicOptions)
    expect(proxyAgent.ID).to.be.a('string', 'Empty SocketProxyAgent')
    expect(proxyAgent).to.have.property('ID')
      .with.lengthOf(10)
      .with.be.a('string')
  })
})
