/* global describe, it */
const expect = require('chai').expect
const request = require('supertest')
const uWS = require('uWebSockets.js')

describe('0http Web Framework - Smoke', () => {
  const baseUrl = 'http://localhost:' + process.env.PORT

  let socket
  const { router, server } = require('./index')({
    server: require('./lib/server/low')(),
    router: require('./lib/router/sequential')()
  })

  it('should successfully register service routes', (done) => {
    router.get('/pets/:id', function (req, res) {
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify({
        name: 'Happy Cat'
      }))
    })

    router.get('/middlewares/:name', (req, res, next) => {
      req.params.name = req.params.name.toUpperCase()
      next()
    }, (req, res, next) => {
      res.end(req.params.name)
      next()
    })

    router.post('/echo', (req, res) => {
      res.end(req.body)
    })

    router.get('/headers', (req, res) => {
      res.setHeader('x-header', '1')
      res.end(JSON.stringify(res.getHeaders()))
    })

    router.all('/sheet.css', (req, res) => res.end())

    server.listen(~~process.env.PORT, serverSocket => {
      if (serverSocket) {
        socket = serverSocket
        done()
      }
    })
  })

  it('should 404 if route handler does not exist', async () => {
    await request(baseUrl)
      .get('/404')
      .expect(404)
  })

  it('should GET JSON response /pets/:id', async () => {
    await request(baseUrl)
      .get('/pets/0')
      .expect(200)
      .then((response) => {
        expect(response.body.name).to.equal('Happy Cat')
      })
  })

  it('should GET plain/text response /middlewares/:name - (route middlewares)', async () => {
    await request(baseUrl)
      .get('/middlewares/rolando')
      .expect(200)
      .then((response) => {
        expect(response.text).to.equal('ROLANDO')
      })
  })

  it('should parse request data on POST /echo', async () => {
    await request(baseUrl)
      .post('/echo')
      .send({ name: 'john' })
      .expect(200)
      .then((response) => {
        expect(response.text).to.equal(JSON.stringify({ name: 'john' }))
      })
  })

  it('should retrieve headers', async () => {
    await request(baseUrl)
      .get('/headers')
      .expect(200)
      .then((response) => {
        expect(response.text).to.equal(JSON.stringify({ 'x-header': '1' }))
      })
  })

  it('should receive 200 on /sheet.css using .all registration', async () => {
    await request(baseUrl)
      .get('/sheet.css')
      .expect(200)
    await request(baseUrl)
      .post('/sheet.css')
      .expect(200)
    await request(baseUrl)
      .put('/sheet.css')
      .expect(200)
  })

  it('should successfully terminate the service', async () => {
    uWS.us_listen_socket_close(socket)
  })
})
