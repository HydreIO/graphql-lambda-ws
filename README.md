# @hydre/graphql-lambda-ws 🌐🚀

[![NPM version](https://img.shields.io/npm/v/hydre/graphql-lambda-ws.svg?style=flat-square)](https://www.npmjs.com/package/graphql_serverless_websocket)
[![Downloads](https://img.shields.io/npm/dm/@hydre/graphql-lambda-ws.svg?style=flat-square)](https://www.npmjs.com/package/graphql_serverless_websocket)

Welcome to GraphQL Serverless WebSocket library, a simple and powerful solution for implementing GraphQL subscriptions over WebSocket on Serverless architectures. 🛰️🌟

## Features ✨

- **AWS Integration**: Built-in integration with AWS API Gateway Management API for easy deployment on AWS Lambda.
- **Flexible Error Handling**: Customize how errors are formatted and returned to the client.
- **Built-In Validation**: Automatically validates incoming GraphQL requests against your schema.
- **Cookies support**: You'll find a pre-parsed cookies object in the context function

## Installation 📦

Use the package manager [npm](https://www.npmjs.com/) to install GraphQL Serverless WebSocket Library.

```bash
npm install @hydre/graphql-lambda-ws
```

## Usage 🚀

This library exposes a single function that returns a new server instance. This function takes an options object with the following properties:

The returned server instance is a function that you can use as your AWS Lambda handler.

Here is a simple usage example:

```javascript
import serve from '@hydre/graphql-lambda-ws'
import make_schema from '@hydre/make_schema'

// this returns a function (event, context) => {}
export default serve({
  // the build schema
  schema: make_schema('type Query {}'),
  // An async function that builds the context for each request.
  build_context: async ({ event, context, cookies }) => ({}),
  // The root value for your resolvers
  root_value: {},
  // Options for the AWS API Gateway Management API client.
  aws_client_options: {},
  // A function that formats errors before they're returned to the client.
  format_error: error => error,
})
```

## Contributing 🤝

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to test your changes
