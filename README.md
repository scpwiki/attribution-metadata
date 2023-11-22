## attribution-metadata

A service which stores information regarding authorship (attribution) of SCP Wiki articles.

Because Wikidot does not recognize authorship beyond page creation, this has been a longstanding issue that SCP Wiki branches and sister sites have solved through the use of [attribution-metadata](https://scpwiki.com/attribution-metadata). This was previously a page on the Wikidot site which simply had a table with all the data on it, stored in wikitext. However, this means it is also subject to Wikidot page limitations, and when we passed that limit, it was clear that spending the time on a proper, better solution was the way to go.

This is that service. It stores all the attribution data in AWS DynamoDB, and handles requests without a permanent server using AWS Lambda.

There is a corresponding web frontend, located in `web/`, which provides a convenient way of interacting with this service. However, any REST client can communicate with this service, for instance as part of automated checks or updates.

### Deployment

Locally, you can verify that your code builds in the usual way:
```
cargo check
```

The most convenient way to produce artifacts that can be deployed to Lambda is using the [AWS Lambda Rust Runtime](https://github.com/awslabs/aws-lambda-rust-runtime). Using the `cargo lambda` subcommand:
```
cargo lambda build --release --arm64 --output-format zip
```

We target the ARM architecture because we are not using anything specific to x64, and ARM is cheaper and generally more power-efficient.

The resultant ZIP file (found in `target/lambda/attribution-metadata`) can be uploaded to Lambda via the [console](https://us-east-2.console.aws.amazon.com/lambda/home?region=us-east-2#/functions/AttributionMetadataService).

### License

Available under the terms of the MIT License.
