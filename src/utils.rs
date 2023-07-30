/*
 * utils.rs
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

use super::password::PasswordType;
use super::result::ServiceResult;
use aws_sdk_dynamodb::Client as DynamoClient;
use lambda_http::{Body, Error, Request, RequestExt, Response};
use serde::Deserialize;
use std::error::Error as StdError;

pub async fn connect_dynamo_db() -> DynamoClient {
    let config = aws_config::load_from_env().await;
    DynamoClient::new(&config)
}

// ServiceResult output helpers

pub fn success() -> Result<String, Error> {
    let body = ServiceResult::success(()).to_json()?;
    Ok(body)
}

pub fn invalid_password(password_type: PasswordType) -> Result<String, Error> {
    let body = ServiceResult::error(
        "invalid-password",
        format!(
            "The passed {} password is invalid",
            password_type.field_name(),
        ),
    )
    .to_json()?;

    Ok(body)
}

pub fn input_error(error: &dyn StdError) -> Result<String, Error> {
    let body = ServiceResult::error("input-invalid", str!(error)).to_json()?;
    Ok(body)
}

pub fn service_error(error: &dyn StdError) -> Result<String, Error> {
    let body = ServiceResult::error("backend", str!(error)).to_json()?;
    Ok(body)
}
