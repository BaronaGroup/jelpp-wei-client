const requestPromise = require('request-promise'),
  _ = require('lodash'),
  P = require('bluebird')

module.exports = async options => {

  checkRequiredOptions([
    'jelppWeiURL',
    'instanceId',
    'appId',
    'postLoginURL',
    'appKey',
    'instanceKey',
    'registrationKey'
  ])
  /*
   Optional options:
   - language (en/fi)
   - defaultRequiredRoles
   */
  const log = options.logger || getSimpleLogger()

  await ensureRegistrationIsUpToDate()

  return {
    requestLogin
  }

  async function ensureRegistrationIsUpToDate() {
    try {
      return await refreshRegistration()
    } catch(e) {
      log.error(null, e)
      log.info('Retrying in 60 seconds')
      await P.delay(60 * 1000)
      return ensureRegistrationIsUpToDate()
    }
  }

  function checkRequiredOptions(requiredOptions) {
    for (let option of requiredOptions) {
      if (options[option] === undefined) {
        throw new Error(`Jelpp-Wei requires ${option} to be specified`)
      }
    }
  }

  async function requestLogin(requestOptions = {}) {
    const payload = _.clone(requestOptions)
    if (!payload.roles) {
      payload.roles = options.defaultRequiredRoles
    }
    await makeRequest('POST', 'request-login', payload)
  }

  async function refreshRegistration() {
    try {
      log.notice('Refreshing app registration')
      await makeRequest('POST', 'update-service-details', {
        postLoginURL: options.postLoginURL,
        language: options.language
      })
    } catch (err) {
      if (_.get(err, 'response.body.userError.errorType') === 'application-not-registered') {
        await registerApp()
        await refreshRegistration()
      } else {
        throw err
      }
    }
  }

  async function registerApp() {
    try {
      log.info('Registering application')
      return await requestPromise({
        url: `${options.jelppWeiURL}/api/instance/${options.instanceId}/register-app/` + encodeURIComponent(options.appId),
        json: {
          appKey: options.appKey
        },
        method: 'POST',
        headers: {
          'x-jelpp-wei-api-key':options.instanceKey
        }
      })
    } catch (err) {
      const errorType = _.get(err, 'response.body.userError.errorType')
      switch(errorType) {
        case 'instance-not-registered':
          return registerInstance()
        case 'non-approved-instance':
          log.error('Application registration failed because the instance has not yet been approved. Trying again soon.')
          await P.delay(1000 * 60)
          return registerApp()
        default:
          throw err
      }
    }
  }

  async function registerInstance() {
    log.info('Registering instance')
    await requestPromise({
      url: `${options.jelppWeiURL}/api/register/instance/` + encodeURIComponent(options.instanceId),
      json: {
        instanceKey: options.instanceKey
      },
      method: 'POST',
      headers: {
        'x-jelpp-wei-api-key': options.registrationKey
      }
    })
  }

  function makeRequest(method, url, payload) {
    const instanceId = encodeURIComponent(options.instanceId)
    const appId = encodeURIComponent(options.appId)

    return requestPromise({
      url: `${options.jelppWeiURL}/api/app/${instanceId}/${appId}/${url}`,
      json: payload,
      method,
      headers: {
        'x-jelpp-wei-api-key': options.appKey
      }
    })
  }
}

function getSimpleLogger() {
  return {
    notice: () => {},
    info: (...args) => console.log('Wei:', ...args.map(mapper)),
    warn: (...args) => console.warn('Wei:', ...args.map(mapper)),
    error: (...args) => console.error('Wei:', ...args.map(mapper))
  }

  function mapper(e) {
    return _.get(e, 'message') || e
  }
}