import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from '@aws-sdk/client-apigatewaymanagementapi'
import { aiter } from 'iterator-helper'
import {
  parse,
  getOperationAST,
  execute,
  subscribe,
  validate,
  ExecutionResult,
} from 'graphql'

function parse_cookies(event) {
  const cookie_header = event?.headers?.Cookie || ''
  return cookie_header.split('; ').reduce((parsed_cookies, cookie) => {
    const [name, ...value_parts] = cookie.split('=')
    const value = value_parts.join('=')
    return { ...parsed_cookies, [name]: value }
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
    success: body => {
      return {
        type: 'application/json',
        statusCode: 200,
        body: format_body(body),
      }
    },
    failure: errors => ({
      data: undefined,
      // errors might not be an array
      errors: [errors].flatMap(format_error),
    }),
  }

  return async (event, context) => {
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
      return Result.failure(new Error(`Operation '${operationName}' not found`))

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
        })) ?? {},
    }

    if (operation === 'subscription') {
      const subscribe_result = await subscribe(options)
      if (subscribe_result instanceof ExecutionResult)
        return Result.success(subscribe_result)

      await aiter(await subscribe_result()).forEach(result =>
        client.send(
          new PostToConnectionCommand({
            ConnectionId: connectionId,
            Data: format_body(result),
          })
        )
      )
      return Result.success()
    }

    return Result.success(await execute(options))
  }
}
