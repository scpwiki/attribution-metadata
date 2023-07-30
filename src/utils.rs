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

use crate::password::PasswordType;
use crate::result::ServiceResult;
use aws_sdk_dynamodb::Client as DynamoClient;
use lambda_http::Error;
use std::error::Error as StdError;
use std::fmt::Display;

// Setup

pub async fn connect_dynamo_db() -> DynamoClient {
    let config = aws_config::load_from_env().await;
    DynamoClient::new(&config)
}

// ServiceResult output helpers

pub fn success() -> Result<String, Error> {
    debug!("Returning generic success response");
    let body = ServiceResult::success("success").to_json()?;
    Ok(body)
}

pub fn invalid_password(password_type: PasswordType) -> Result<String, Error> {
    error!(
        "Error, invalid password was used for {}",
        password_type.field_name(),
    );

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

pub fn input_error(error: &dyn Display) -> Result<String, Error> {
    error!("Error processing input: {error}");
    let body = ServiceResult::error("input-invalid", str!(error)).to_json()?;
    Ok(body)
}

pub fn service_error(error: &dyn StdError) -> Result<String, Error> {
    error!("General backend error caught: {error}");
    let body = ServiceResult::error("backend", str!(error)).to_json()?;
    Ok(body)
}
