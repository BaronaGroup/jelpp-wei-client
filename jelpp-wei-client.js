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
    requestLogin,
    getLoginDetails,
    listUsers,
    inviteUser,
    callAppPlugin,
    addRole,
    addRoles,
    removeRole,
    removeRoles,
    ping
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
    if (!payload.requiredRoles) {
      payload.requiredRoles = options.defaultRequiredRoles
    }
    return await makeRequest('POST', 'request-login', payload)
  }


  async function getLoginDetails(token, requestOptions) {
    return await makeRequest('GET', 'login-details/' + encodeURIComponent(token) + '?' + toQueryParameters(requestOptions))
  }

  async function listUsers(requestOptions) {
    return await makeRequest('POST', 'list-users', requestOptions)
  }

  async function addRole(userId, role, requestOptions) {
    return addRoles(userId, [role], requestOptions)
  }
  async function addRoles(userId, roles, requestOptions) {
    return await makeRequest('POST', 'add-roles', Object.assign({}, requestOptions, {userId, roles}))
  }

  async function removeRole(userId, role, requestOptions) {
    return removeRoles(userId, [role], requestOptions)
  }

  async function removeRoles(userId, roles, requestOptions) {
    return await makeRequest('POST', 'remove-roles', Object.assign({}, requestOptions, {userId, roles}))
  }

  async function ping() {
    return await makeRequest('POST', 'ping')
  }

  async function callAppPlugin(plugin, operation, requestOptions) {
    return await makeRequest('POST', 'plugins/' + encodeURIComponent(plugin) + '/' + operation, requestOptions)
  }

  async function inviteUser(userDetails, invitationDetails) {
    const finalInvitationDetails = Object.assign({}, options.invitation, invitationDetails)
    return await makeRequest('POST', 'create-user/' + encodeURIComponent(userDetails.email), {
      user: userDetails,
      invitation: finalInvitationDetails
    })
  }

  async function refreshRegistration() {
    try {
      log.notice('Refreshing app registration')
      await makeRequest('POST', 'update-service-details', {
        postLoginURL: options.postLoginURL,
        language: options.language,
        instance: options.instance
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
          'x-jelpp-wei-api-key': options.instanceKey
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
      json: payload || true,
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
    info: (...args) => console.log('Wei:', ...args.map(mapper)), // eslint-disable-line no-console
    warn: (...args) => console.warn('Wei:', ...args.map(mapper)), // eslint-disable-line no-console
    error: (...args) => console.error('Wei:', ...args.map(mapper)) // eslint-disable-line no-console
  }

  function mapper(e) {
    return _.get(e, 'message') || e
  }
}

function toQueryParameters(opts) {
  return _.toPairs(opts).map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&')
}