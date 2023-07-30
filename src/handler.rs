/*
 * handler.rs
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

use super::result::ServiceResult;
use lambda_http::{Body, Error, Request, RequestExt, Response};

pub async fn handle_password_check(req: Request) -> Result<(u16, String), Error> {
    todo!()
}

pub fn handle_ping() -> Result<(u16, String), Error> {
    let body = ServiceResult::success("pong").to_json()?;
    Ok((200, body))
}

pub fn handle_missing_route(path: &str) -> Result<(u16, String), Error> {
    let body = ServiceResult::error(
        "invalid-route",
        format!("No handler exists for path {path:?}"),
    )
    .to_json()?;

    Ok((400, body))
}
