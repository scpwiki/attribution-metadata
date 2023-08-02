/*
 * main.rs
 *
 * attribution-metadata
 * Copyright (C) 2023-2023 SCP-EN Technical Team
 *
 * attribution-metadata is available free of charge under the terms of the MIT
 * License. You are free to redistribute and/or modify it under those
 * terms. It is distributed in the hopes that it will be useful, but
 * WITHOUT ANY WARRANTY. See the LICENSE file for more details.
 *
 */

#[macro_use]
extern crate maplit;

#[macro_use]
extern crate serde;

#[macro_use]
extern crate str_macro;

#[macro_use]
extern crate tracing;

#[macro_use]
mod macros;

mod attribution;
mod handlers;
mod object;
mod password;
mod result;
mod utils;

mod build {
    include!(concat!(env!("OUT_DIR"), "/built.rs"));
}

use self::handlers::*;
use lambda_http::{self, http::Method, service_fn, Body, Error, Request, Response};

/// Main handler for Lambda requests.
///
/// This dispatches to the appropriate handler function, then returns the response.
async fn function_handler(req: Request) -> Result<Response<Body>, Error> {
    // Perform routing based on request
    let path = req.uri().path();
    let method = req.method();
    info!(method = method.as_str(), path);

    let (status, body) = match (path, method) {
        ("/attribution/page", &Method::GET) => handle_get_page(req).await?,
        ("/attribution/page", &Method::PUT) => handle_set_page(req).await?,
        ("/attribution/site", &Method::GET) => handle_get_site(req).await?,
        ("/password/check", &Method::PUT) => handle_password_check(req).await?,
        ("/password/update", &Method::PUT) => handle_password_update(req).await?,
        ("/info", _) => handle_info()?,
        ("/ping", _) => handle_ping()?,
        _ => handle_missing_route(method.as_str(), path)?,
    };
    info!(status, body);

    let response = Response::builder()
        .status(status)
        .header("Content-Type", "text/json")
        .header(
            "X-AttributionMetadataService-Version",
            self::build::PKG_VERSION,
        )
        .body(body.into())
        .map_err(Box::new)?;

    Ok(response)
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    color_backtrace::install();

    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .with_target(false) // disable printing the name of the module in every log line
        .without_time() // disabling time, because CloudWatch adds the ingestion time
        .init();

    info!("Starting AttributionMetadataService lambda worker");
    lambda_http::run(service_fn(function_handler)).await
}
