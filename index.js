import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from '@aws-sdk/client-apigatewaymanagementapi'
import { parse, getOperationAST, execute, subscribe, validate } from 'graphql'

const safe_json_parse = json => {
  try {
    return JSON.parse(json)
  } catch {
    return {}
  }
}

export default ({
  schema,
  build_context,
  rootValue,
  aws_client_options = {},
  format_error = error => error,
  log_response = false,
}) => {
  const client = new ApiGatewayManagementApiClient(aws_client_options)

  return async (event, context) => {
    const { body, requestContext: { connectionId } = {} } = event
    const { id, query, operationName, variables = {} } = safe_json_parse(body)
    const custom_headers = {}

    const format_body = ({ data, errors = [], done = false } = {}) =>
      JSON.stringify({
        id,
        data,
        done,
        errors: [errors].flat(Infinity).map(format_error),
      })

    const post_message = message =>
      client.send(
        new PostToConnectionCommand({
          ConnectionId: connectionId,
          Data: format_body(message),
        })
      )

    const Result = {
      success: body => {
        const response = {
          statusCode: 200,
          headers: {
            ...custom_headers,
            'Content-Type': 'application/json',
          },
          body: format_body(body),
        }
        if (log_response) console.dir(response, { depth: Infinity })
        return response
      },
      failure: errors => {
        const response = {
          statusCode: 400,
          headers: {
            ...custom_headers,
            'Content-Type': 'application/json',
          },
          body: format_body({ errors }),
        }
        if (log_response) console.dir(response, { depth: Infinity })
        return response
      },
    }

    const contextValue =
      (await build_context({
        event,
        context,
        set_headers: headers => Object.assign(custom_headers, headers),
      })) ?? {}

    try {
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
        contextValue,
      }

      if (operation === 'subscription') {
        try {
          for await (const result of await subscribe(options))
            await post_message(result)
        } catch (error) {
          await post_message({ errors: error, done: true })
        }
        await post_message({ done: true })
        return Result.success()
      }

      return Result.success(await execute(options))
    } catch (error) {
      console.error(error)
      return Result.failure(error)
    }
  }
}
