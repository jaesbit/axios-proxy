import chai, { expect } from 'chai'
import { SocksOptions, SocksProxyAgent } from '../dist/socket.js';
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

  it('sould share ID between RawSocket and ourSocket', () => {
    const options = new SocksOptions(basicOptions)
    const proxyAgent = new SocksProxyAgent(options)
    expect(proxyAgent.ID).to.be.a('string', 'Empty SocketProxyAgent')
    expect(proxyAgent).to.have.property('ID')
      .with.lengthOf(10)
      .with.be.a('string')
  })

  it('should parse host:port prior to port', ()=> {
    const params = Object.assign({}, basicOptions)
    params.host = "localhost:1300"
    let options = SocksOptions.fromString(params.host)

    expect(options, `[Used]: ${params.host}`).to.have.property('port')
      .with.be.a('number')
      .with.equal(1300)

    params.host = "localhost"
    options = new SocksOptions(params)

    expect(options, `[Used]: ${params.host}`).to.have.property('port')
      .with.be.a('number')
      .with.equal(3000)

    params.host = "foo:foo@localhost:1234"
    options = SocksOptions.fromString(params.host)
  
    expect(options, `[Used]: ${params.host}`).to.have.property('port')
    .with.be.a('number')
    .with.equal(1234)

    params.host = "foo::do@localhost:1234"
    options = SocksOptions.fromString(params.host)
  
    expect(options, `[Used]: ${params.host}`).to.have.property('port')
    .with.be.a('number')
    .with.equal(1234)

  })


  it('should parse user:password@host:port prior to user and password', ()=> {
    const params = Object.assign({}, basicOptions)
    params.host = "fuse:fpwd@localhost:1300"
    let options = SocksOptions.fromString(params.host)

    expect(options, `[Used]: ${params.host}`).to.have.property('user')
        .with.lengthOf(4)
      .with.be.a('string')
      .with.equal("fuse")

    expect(options, `[Used]: ${params.host}`).to.have.property('password')
      .with.lengthOf(4)
    .with.be.a('string')
    .with.equal("fpwd")


    params.host = "fuse:fpwd:@localhost:1234"
    options = SocksOptions.fromString(params.host)
  
    expect(options,`[Used]: ${params.host}`).to.have.property('user')
        .with.lengthOf(4)
      .with.be.a('string')
      .with.equal("fuse")

    expect(options,`[Used]: ${params.host}`).to.have.property('password')
      .with.lengthOf(4)
    .with.be.a('string')
    .with.equal("fpwd")

    params.host = "fuse:fpwd@@:@localhost:::1234"
    options = SocksOptions.fromString(params.host)
  
    expect(options,`[Used]: ${params.host}`).to.have.property('user')
        .with.lengthOf(4)
      .with.be.a('string')
      .with.equal("fuse")

    expect(options, `[Used]: ${params.host}`).to.have.property('password')
      .with.lengthOf(4)
    .with.be.a('string')
    .with.equal("fpwd")


    params.host = "fuse:::fpwd@localhost:::1234"
    options = SocksOptions.fromString(params.host)
  
    expect(options, `[Used]: ${params.host}`).to.have.property('user')
        .with.lengthOf(4)
      .with.be.a('string')
      .with.equal("fuse")

    expect(options, `[Used]: ${params.host}`).to.have.property('password')
      .with.lengthOf(4)
    .with.be.a('string')
    .with.equal("fpwd")

  })

})
