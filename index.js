import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from '@aws-sdk/client-apigatewaymanagementapi'
import { parse, getOperationAST, execute, subscribe, validate } from 'graphql'

export default ({
  schema,
  build_context,
  rootValue,
  aws_client_options = {},
  format_error = error => error,
}) => {
  const client = new ApiGatewayManagementApiClient(aws_client_options)

  return async (event, context) => {
    const {
      body,
      requestContext: { connectionId },
    } = event
    const { id, query, operationName, variables } = JSON.parse(body)
    const custom_headers = {}

    const format_body = ({ data, errors = [] } = {}) =>
      JSON.stringify({
        id,
        data,
        errors: errors.map(format_error),
      })

    const Result = {
      success: body => ({
        statusCode: 200,
        headers: {
          ...custom_headers,
          'Content-Type': 'application/json',
        },
        body: format_body(body),
      }),
      failure: errors => ({
        statusCode: 400,
        headers: {
          ...custom_headers,
          'Content-Type': 'application/json',
        },
        body: format_body({
          data: undefined,
          // errors might not be an array
          errors: [errors].flatMap(format_error),
        }),
      }),
    }

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
        contextValue:
          (await build_context({
            event,
            context,
            set_headers: headers => Object.assign(custom_headers, headers),
          })) ?? {},
      }

      if (operation === 'subscription') {
        for await (const result of await subscribe(options)) {
          await client.send(
            new PostToConnectionCommand({
              ConnectionId: connectionId,
              Data: format_body(result),
            })
          )
        }

        return Result.success(null)
      }

      return Result.success(await execute(options))
    } catch (error) {
      console.error(error)
      return Result.failure(error)
    }
  }
}
