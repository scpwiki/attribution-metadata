/*
 * handlers.rs
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

use super::password::{check_password, ChangePasswordInput, CheckPasswordInput};
use super::result::ServiceResult;
use super::utils::*;
use lambda_http::{Body, Error, Request, RequestExt, Response};

/*
* XXX

   // Extract some useful information from the request
   let who = event
       .query_string_parameters_ref()
       .and_then(|params| params.first("name"))
       .unwrap_or("world");
   let message = format!("Hello {who}, this is an AWS Lambda HTTP request");
*/

pub async fn handle_get_page_attribution(req: Request) -> Result<(u16, String), Error> {
    info!("Received page attribution request");
    todo!()
}

pub async fn handle_set_page_attribution(req: Request) -> Result<(u16, String), Error> {
    info!("Received page attribution update request");
    todo!()
}

pub async fn handle_get_site_attributions(req: Request) -> Result<(u16, String), Error> {
    info!("Received site attribution list request");
    todo!()
}

pub async fn handle_password_check(req: Request) -> Result<(u16, String), Error> {
    info!("Received password check request");
    let dynamo = connect_dynamo_db().await;
    let CheckPasswordInput {
        site_slug,
        password,
        password_type,
    } = parse_body!(&req);

    let (status, result) =
        match check_password(&dynamo, site_slug, &password, password_type).await {
            Ok(true) => (200, success()),
            Ok(false) => (403, invalid_password(password_type)),
            Err(error) => (500, service_error(&*error)),
        };

    let body = result?;
    Ok((status, body))
}

pub async fn handle_password_change(req: Request) -> Result<(u16, String), Error> {
    info!("Received password change request");
    let dynamo = connect_dynamo_db().await;
    let ChangePasswordInput {
        site_slug,
        password_type,
        old_password,
        new_password,
        admin_password,
    } = parse_body!(&req);

    todo!()
}

pub fn handle_ping() -> Result<(u16, String), Error> {
    info!("Received ping request");
    let body = ServiceResult::success("pong").to_json()?;
    Ok((200, body))
}

pub fn handle_missing_route(path: &str) -> Result<(u16, String), Error> {
    error!("Received invalid request (no such route)");
    let body = ServiceResult::error(
        "invalid-route",
        format!("No handler exists for path {path:?}"),
    )
    .to_json()?;

    Ok((400, body))
}
