import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from '@aws-sdk/client-apigatewaymanagementapi'
import { parse, getOperationAST, execute, subscribe, validate } from 'graphql'

function parse_cookies(event) {
  const cookie_header = event?.headers?.Cookie || ''
  return cookie_header.split('; ').reduce((parsed_cookies, cookie) => {
    const [name, ...value_parts] = cookie.split('=')
    const value = value_parts.join('=')
    return { ...parsed_cookies, [name]: value }
  }, {})
}

const set_cookies = (cookies = []) => {
  return cookies.reduce((headers, { name, value, options = {} }, i) => {
    const optionsString = Object.entries(options)
      .map(([key, value]) => `${key}${value ? `=${value}` : ''}`)
      .join('; ')

    return {
      ...headers,
      [`Set-Cookie${i + 1}`]: `${name}=${value}; ${optionsString}`,
    }
  }, {})
}

export default ({
  schema,
  build_context,
  rootValue,
  aws_client_options = {},
  format_error = error => error,
}) => {
  const client = new ApiGatewayManagementApiClient(aws_client_options)

  const format_body = ({ data, errors = [] } = {}) =>
    JSON.stringify({
      data,
      errors: errors.map(format_error),
    })

  const Result = {
    success: (body, cookies) => ({
      statusCode: 200,
      headers: {
        ...set_cookies(cookies),
        'Content-Type': 'application/json',
      },
      body: format_body(body),
    }),
    failure: (errors, cookies) => ({
      statusCode: 400,
      headers: {
        ...set_cookies(cookies),
        'Content-Type': 'application/json',
      },
      body: format_body({
        data: undefined,
        // errors might not be an array
        errors: [errors].flatMap(format_error),
      }),
    }),
  }

  return async (event, context) => {
    let cookies_to_set = null

    try {
      const {
        body,
        requestContext: { connectionId },
      } = event
      const { query, operationName, variables } = JSON.parse(body)

      if (!query) return Result.failure(new Error("'query' field not provided"))

      const document = parse(query)
      const errors = validate(schema, document)

      if (errors.length) return Result.failure(errors)

      const { operation } = getOperationAST(document, operationName)
      if (!operation)
        return Result.failure(
          new Error(`Operation '${operationName}' not found`)
        )

      const options = {
        document,
        schema,
        operationName,
        rootValue,
        variableValues: variables,
        contextValue:
          (await build_context({
            event,
            context,
            cookies: parse_cookies(event),
            set_cookies: cookies => (cookies_to_set = cookies),
          })) ?? {},
      }

      if (operation === 'subscription') {
        for await (const result of subscribe(options)) {
          client.send(
            new PostToConnectionCommand({
              ConnectionId: connectionId,
              Data: format_body(result),
            })
          )
        }

        return Result.success(null, cookies_to_set)
      }

      return Result.success(await execute(options), cookies_to_set)
    } catch (error) {
      console.error(error)
      return Result.failure(error, cookies_to_set)
    }
  }
}
