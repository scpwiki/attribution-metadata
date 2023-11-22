## attribution-metadata API

This is the backend Lambda service which serves attribution-metadata requests, reading and writing the data from DynamoDB.

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
