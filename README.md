# @hydre/graphql-lambda-ws 🌐🚀

[![NPM version](https://img.shields.io/npm/v/@hydre/graphql-lambda-ws.svg?style=flat-square)](https://www.npmjs.com/package/@hydre/graphql-lambda-ws)
[![Downloads](https://img.shields.io/npm/dm/@hydre/graphql-lambda-ws.svg?style=flat-square)](https://www.npmjs.com/package/@hydre/graphql-lambda-ws)

Welcome to GraphQL Serverless WebSocket library, a simple and powerful solution for implementing GraphQL subscriptions over WebSocket on Serverless architectures. 🛰️🌟

## Features ✨

- **AWS Integration**: Built-in integration with AWS API Gateway Management API for easy deployment on AWS Lambda.
- **Flexible Error Handling**: Customize how errors are formatted and returned to the client.
- **Built-In Validation**: Automatically validates incoming GraphQL requests against your schema.

## Installation 📦

Use the package manager [npm](https://www.npmjs.com/) to install GraphQL Serverless WebSocket Library.

```bash
npm install @hydre/graphql-lambda-ws
```

## Server Usage 🚀

This library exposes a single function that returns a new server instance. This function takes an options object with the following properties:

The returned server instance is a function that you can use as your AWS Lambda handler.

Here is a simple usage example:

```javascript
import serve from '@hydre/graphql-lambda-ws'
import make_schema from '@hydre/make_schema'

export const connect = (_, __, cb) => cb(null, { statusCode: 200, body: '🇺🇦' })

// this returns a function (event, context) => {}
export default serve({
  // the build schema
  schema: make_schema({ ... }),
  // An async function that builds the context for each request.
  // `set_headers` can be called to assign headers to the response
  build_context: async ({ event, context, set_headers }) => ({}),
  // The root value for your resolvers
  root_value: {},
  // Options for the AWS API Gateway Management API client. @see https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-apigatewaymanagementapi/
  aws_client_options: { endpoint: 'http://localhost:3001' },
  // A function that formats errors before they're returned to the client.
  format_error: error => error,
  // log every lambda responses
  log_response: false
})
```

You may use it along Serverless like this

```yml
service: my-service
frameworkVersion: '3'
useDotenv: true

provider:
  name: aws
  runtime: nodejs18.x

functions:
  connect:
    handler: src/index.connect
    events:
      - websocket:
          route: $connect
  default:
    handler: src/index.default
    events:
      - websocket:
          route: $default

plugins:
  - serverless-dotenv-plugin
  - serverless-offline
```

Now run

```sh
sls offline
```

## Client usage 🍎

Try it in your terminal with [wscat](https://github.com/websockets/wscat)

```sh
wscat -c ws://localhost:3001
> {"query":"subscription { test }"}
```

Find a vuejs example under [/example/index.js](/example/index.js)

## Contributing 🤝

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to test your changes
