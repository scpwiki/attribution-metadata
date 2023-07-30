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
extern crate log;

#[macro_use]
extern crate serde;

#[macro_use]
extern crate str_macro;

mod attribution;
mod handler;
mod password;
mod result;

use self::handler::*;
use http::method::Method;
use lambda_http::{run, service_fn, Body, Error, Request, RequestExt, Response};

/// Main handler for Lambda requests.
///
/// This dispatches to the appropriate handler function, then returns the response.
async fn function_handler(req: Request) -> Result<Response<Body>, Error> {
    // Perform routing based on request
    let path = req.uri().path();
    let method = req.method();

    let (status, body) = match (path, method) {
        ("/attribution/page", &Method::GET) => handle_get_page_attribution(req).await?,
        ("/attribution/page", &Method::PUT) => handle_set_page_attribution(req).await?,
        ("/attribution/site", &Method::GET) => handle_get_site_attributions(req).await?,
        ("/password/check", &Method::POST) => handle_password_check(req).await?,
        ("/password/change", &Method::PUT) => handle_password_change(req).await?,
        ("/ping", _) => handle_ping()?,
        _ => handle_missing_route(path)?,
    };

    // Package up and send JSON response
    let response = Response::builder()
        .status(status)
        .header("Content-Type", "text/json")
        .body(body.into())
        .map_err(Box::new)?;

    Ok(response)
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .with_target(false) // disable printing the name of the module in every log line
        .without_time() // disabling time, because CloudWatch adds the ingestion time
        .init();

    info!("Starting AttributionMetadataService lambda worker");
    run(service_fn(function_handler)).await
}
