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

use lambda_http::{Body, Error, Request, RequestExt, Response};
use serde::Serialize;

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case", untagged)]
pub enum ServiceResult<T> {
    Success {
        error: (),
        data: T,
    },
    Error {
        error: &'static str,
        message: String,
    },
}

impl<T> ServiceResult<T> {
    pub fn success(data: T) -> Self {
        ServiceResult::Success { data, error: () }
    }
}

impl ServiceResult<()> {
    pub fn error(error_type: &'static str, message: String) -> Self {
        ServiceResult::Error {
            error: error_type,
            message,
        }
    }
}

impl<T> ServiceResult<T>
where
    T: Serialize,
{
    pub fn to_json(&self) -> Result<String, Error> {
        let body = serde_json::to_string(self)?;
        Ok(body)
    }
}

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
