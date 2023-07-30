/*
 * password.rs
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

use aws_sdk_dynamodb::{types::AttributeValue, Client as DynamoClient};
use lambda_http::Error;

const TABLE: &str = "attribution_metadata_password";

#[derive(Serialize, Deserialize, Debug, Copy, Clone, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum PasswordType {
    Regular,
    Admin,
}

impl PasswordType {
    #[inline]
    pub fn field_name(self) -> &'static str {
        match self {
            PasswordType::Regular => "regular",
            PasswordType::Admin => "admin",
        }
    }
}

#[derive(Deserialize, Debug)]
pub struct CheckPasswordInput {
    #[serde(rename = "site")]
    pub site_slug: String,

    #[serde(rename = "type")]
    pub password_type: PasswordType,
    pub password: String,
}

#[derive(Deserialize, Debug)]
pub struct ChangePasswordInput {
    #[serde(rename = "site")]
    pub site_slug: String,

    #[serde(rename = "type")]
    pub password_type: PasswordType,
    pub old_password: String,
    pub new_password: String,
    pub admin_password: String,
}

pub async fn check_password(
    dynamo: &DynamoClient,
    site_slug: String,
    password: &str,
    password_type: PasswordType,
) -> Result<bool, Error> {
    let field = password_type.field_name();
    info!("Checking {field} password for site {site_slug}");

    let result = dynamo
        .get_item()
        .table_name(TABLE)
        .key("site_slug", AttributeValue::S(site_slug))
        .projection_expression(field)
        .send()
        .await?;

    match result.item() {
        None => Ok(false),
        Some(items) => {
            // Yes, a fixed-time equality setup is not used here. It's not even hashed.
            // This is a basic check to prevent the relatively infrequent incidence of
            // attribution-metadata update requests from being spoofed.

            let actual = items[field]
                .as_s()
                .expect("Password field in database not string");

            Ok(password == actual)
        }
    }
}

pub async fn change_password(
    dynamo: &DynamoClient,
    site_slug: String,
    password: String,
    password_type: PasswordType,
) -> Result<(), Error> {
    let field = password_type.field_name();
    info!("Changing {field} password for site {site_slug}");

    dynamo
        .update_item()
        .table_name(TABLE)
        .key("site_slug", AttributeValue::S(site_slug))
        .update_expression(format!("SET {field} = :password"))
        .expression_attribute_values("password", AttributeValue::S(password))
        .send()
        .await?;

    Ok(())
}
